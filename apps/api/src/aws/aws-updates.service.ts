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

    const currentVersion = await this.getInstalledVersion(instance);

    return {
      currentVersion,
      latestVersion,
      updateAvailable: currentVersion !== latestVersion,
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
        "sudo locus upgrade"
      );

      this.logger.log(
        `Update applied on instance ${instanceId}: ${output.substring(0, 200)}`
      );

      const newVersion = await this.getInstalledVersion(instance);

      return {
        success: true,
        newVersion,
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

  /**
   * Get the installed @locusai/cli version from the instance.
   * Uses `npm list -g --json` which returns structured JSON, avoiding
   * the formatted/colorized output of `locus version`.
   */
  private async getInstalledVersion(instance: AwsInstance): Promise<string> {
    const output = await this.executeCommand(
      instance,
      "npm list -g @locusai/cli --depth=0 --json"
    );

    try {
      const parsed = JSON.parse(output);
      const version = parsed.dependencies?.["@locusai/cli"]?.version;
      if (typeof version === "string" && version.length > 0) {
        return version;
      }
    } catch {
      this.logger.warn(
        `Failed to parse npm list output for instance ${instance.id}: ${output.substring(0, 200)}`
      );
    }

    return "unknown";
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
