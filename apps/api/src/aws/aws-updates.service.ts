import * as fs from "node:fs";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Client } from "ssh2";
import { Repository } from "typeorm";
import { TypedConfigService } from "@/config/config.service";
import { AwsInstance } from "@/entities/aws-instance.entity";

interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}

interface UpdateApplyResult {
  success: boolean;
  newVersion: string;
  error?: string;
}

@Injectable()
export class AwsUpdatesService {
  private readonly logger = new Logger(AwsUpdatesService.name);

  constructor(
    @InjectRepository(AwsInstance)
    private readonly instanceRepository: Repository<AwsInstance>,
    private readonly configService: TypedConfigService
  ) {}

  async checkForUpdates(
    workspaceId: string,
    instanceId: string
  ): Promise<UpdateCheckResult> {
    const instance = await this.findRunningInstance(workspaceId, instanceId);
    const latestVersion = this.configService.get("LOCUS_AGENT_LATEST_VERSION");

    const currentVersion = await this.executeCommand(
      instance,
      "locus-agent --version"
    );

    const trimmedVersion = currentVersion.trim();

    return {
      currentVersion: trimmedVersion,
      latestVersion,
      updateAvailable: trimmedVersion !== latestVersion,
    };
  }

  async applyUpdate(
    workspaceId: string,
    instanceId: string
  ): Promise<UpdateApplyResult> {
    const instance = await this.findRunningInstance(workspaceId, instanceId);

    try {
      const output = await this.executeCommand(
        instance,
        "curl -fsSL https://locus.dev/install.sh | bash"
      );

      this.logger.log(
        `Update applied on instance ${instanceId}: ${output.substring(0, 200)}`
      );

      const newVersion = await this.executeCommand(
        instance,
        "locus-agent --version"
      );

      return {
        success: true,
        newVersion: newVersion.trim(),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown update error";
      this.logger.error(`Update failed on instance ${instanceId}: ${message}`);

      return {
        success: false,
        newVersion: "",
        error: message,
      };
    }
  }

  private async findRunningInstance(
    workspaceId: string,
    instanceId: string
  ): Promise<AwsInstance> {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId, workspaceId },
    });

    if (!instance) {
      throw new NotFoundException("Instance not found");
    }

    if (!instance.publicIp) {
      throw new BadRequestException(
        "Instance does not have a public IP address"
      );
    }

    return instance;
  }

  private async executeCommand(
    instance: AwsInstance,
    command: string
  ): Promise<string> {
    const privateKeyPath = this.configService.get("LOCUS_SSH_PRIVATE_KEY_PATH");
    if (!privateKeyPath) {
      throw new BadRequestException(
        "SSH private key not configured on the server"
      );
    }

    let privateKey: Buffer;
    try {
      privateKey = fs.readFileSync(privateKeyPath);
    } catch {
      throw new BadRequestException("SSH private key not found on the server");
    }

    return new Promise<string>((resolve, reject) => {
      const sshClient = new Client();
      let output = "";
      let errorOutput = "";

      const timeout = setTimeout(() => {
        sshClient.end();
        reject(new Error("SSH command timed out after 120 seconds"));
      }, 120_000);

      sshClient.on("ready", () => {
        sshClient.exec(command, (err, stream) => {
          if (err) {
            clearTimeout(timeout);
            sshClient.end();
            reject(err);
            return;
          }

          stream.on("data", (data: Buffer) => {
            output += data.toString("utf-8");
          });

          stream.stderr.on("data", (data: Buffer) => {
            errorOutput += data.toString("utf-8");
          });

          stream.on("close", (code: number) => {
            clearTimeout(timeout);
            sshClient.end();

            if (code !== 0) {
              reject(
                new Error(
                  `Command exited with code ${code}: ${errorOutput || output}`
                )
              );
            } else {
              resolve(output);
            }
          });
        });
      });

      sshClient.on("error", (err) => {
        clearTimeout(timeout);
        reject(new Error(`SSH connection error: ${err.message}`));
      });

      sshClient.connect({
        host: instance.publicIp as string,
        port: 22,
        username: "ubuntu",
        privateKey,
      });
    });
  }
}
