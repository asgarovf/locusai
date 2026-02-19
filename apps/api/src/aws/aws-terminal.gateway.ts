import * as fs from "node:fs";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from "@nestjs/websockets";
import type { Socket } from "socket.io";
import { Client, type ClientChannel } from "ssh2";
import { TypedConfigService } from "@/config/config.service";
import { OrganizationsService } from "@/organizations/organizations.service";
import { UsersService } from "@/users/users.service";
import { WorkspacesService } from "@/workspaces/workspaces.service";
import { AwsInstancesService } from "./aws-instances.service";

interface TerminalSession {
  sshClient: Client;
  stream: ClientChannel | null;
}

@WebSocketGateway({ namespace: "/aws-terminal", cors: true })
export class AwsTerminalGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AwsTerminalGateway.name);
  private readonly sessions = new Map<string, TerminalSession>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly awsInstancesService: AwsInstancesService,
    private readonly configService: TypedConfigService,
    private readonly workspacesService: WorkspacesService,
    private readonly organizationsService: OrganizationsService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(
          `Connection rejected: no token provided (${client.id})`
        );
        client.emit("error", { message: "Authentication required" });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        this.logger.warn(`Connection rejected: invalid user (${client.id})`);
        client.emit("error", { message: "Invalid user" });
        client.disconnect();
        return;
      }

      const workspaceId = client.handshake.query.workspaceId as string;
      const instanceId = client.handshake.query.instanceId as string;

      if (!workspaceId || !instanceId) {
        this.logger.warn(
          `Connection rejected: missing workspaceId or instanceId (${client.id})`
        );
        client.emit("error", {
          message: "workspaceId and instanceId are required",
        });
        client.disconnect();
        return;
      }

      // Verify workspace membership before granting SSH access
      const workspace = await this.workspacesService.findById(workspaceId);
      if (!workspace) {
        this.logger.warn(
          `Connection rejected: workspace not found (${client.id})`
        );
        client.emit("error", { message: "Workspace not found" });
        client.disconnect();
        return;
      }

      const members = await this.organizationsService.getMembers(
        workspace.orgId
      );
      const isMember = members.some((m) => m.userId === user.id);
      if (!isMember) {
        this.logger.warn(
          `Connection rejected: user ${user.id} is not a member of workspace ${workspaceId} (${client.id})`
        );
        client.emit("error", { message: "Access denied" });
        client.disconnect();
        return;
      }

      this.logger.log(
        `Client connected: ${client.id} (user: ${user.id}, instance: ${instanceId})`
      );

      await this.establishSshConnection(client, workspaceId, instanceId);
    } catch (error) {
      this.logger.warn(
        `Connection rejected: ${error instanceof Error ? error.message : "Unknown error"} (${client.id})`
      );
      client.emit("error", { message: "Authentication failed" });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.cleanupSession(client.id);
  }

  @SubscribeMessage("input")
  handleInput(@ConnectedSocket() client: Socket, @MessageBody() data: string) {
    const session = this.sessions.get(client.id);
    if (session?.stream) {
      session.stream.write(data);
    }
  }

  @SubscribeMessage("resize")
  handleResize(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { cols: number; rows: number }
  ) {
    const session = this.sessions.get(client.id);
    if (session?.stream) {
      session.stream.setWindow(data.rows, data.cols, 0, 0);
    }
  }

  private async establishSshConnection(
    client: Socket,
    workspaceId: string,
    instanceId: string
  ) {
    try {
      const instance = await this.awsInstancesService.getInstance(
        workspaceId,
        instanceId
      );

      if (!instance.publicIp) {
        client.emit("error", {
          message: "Instance does not have a public IP address",
        });
        client.disconnect();
        return;
      }

      const privateKeyPath = this.configService.get(
        "LOCUS_SSH_PRIVATE_KEY_PATH"
      );
      if (!privateKeyPath) {
        client.emit("error", {
          message: "SSH private key not configured on the server",
        });
        client.disconnect();
        return;
      }

      let privateKey: Buffer;
      try {
        privateKey = fs.readFileSync(privateKeyPath);
      } catch {
        this.logger.error(
          `Failed to read SSH private key from: ${privateKeyPath}`
        );
        client.emit("error", {
          message: "SSH private key not found on the server",
        });
        client.disconnect();
        return;
      }

      const sshClient = new Client();
      this.sessions.set(client.id, { sshClient, stream: null });

      sshClient.on("ready", () => {
        this.logger.log(
          `SSH connection established for client ${client.id} to ${instance.publicIp}`
        );
        client.emit("connected");

        sshClient.shell(
          { term: "xterm-256color", cols: 80, rows: 24 },
          (err, stream) => {
            if (err) {
              this.logger.error(`Failed to open SSH shell: ${err.message}`);
              client.emit("error", { message: "Failed to open shell" });
              this.cleanupSession(client.id);
              client.disconnect();
              return;
            }

            const session = this.sessions.get(client.id);
            if (session) {
              session.stream = stream;
            }

            stream.on("data", (data: Buffer) => {
              client.emit("output", data.toString("utf-8"));
            });

            stream.on("close", () => {
              this.logger.log(`SSH stream closed for client ${client.id}`);
              client.emit("disconnected");
              this.cleanupSession(client.id);
              client.disconnect();
            });

            stream.stderr.on("data", (data: Buffer) => {
              client.emit("output", data.toString("utf-8"));
            });
          }
        );
      });

      sshClient.on("error", (err) => {
        this.logger.error(`SSH error for client ${client.id}: ${err.message}`);
        client.emit("error", {
          message: `SSH connection error: ${err.message}`,
        });
        this.cleanupSession(client.id);
        client.disconnect();
      });

      sshClient.on("close", () => {
        this.logger.log(`SSH connection closed for client ${client.id}`);
        this.cleanupSession(client.id);
      });

      sshClient.connect({
        host: instance.publicIp,
        port: 22,
        username: "ubuntu",
        privateKey,
      });
    } catch (error) {
      this.logger.error(
        `Failed to establish SSH connection for client ${client.id}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      client.emit("error", {
        message: "Failed to connect to instance",
      });
      client.disconnect();
    }
  }

  private extractToken(client: Socket): string | null {
    // Try Authorization header from handshake
    const authHeader =
      client.handshake.auth?.token || client.handshake.headers?.authorization;

    if (typeof authHeader === "string") {
      if (authHeader.startsWith("Bearer ")) {
        return authHeader.slice(7);
      }
      return authHeader;
    }

    return null;
  }

  private cleanupSession(clientId: string) {
    const session = this.sessions.get(clientId);
    if (session) {
      if (session.stream) {
        session.stream.close();
      }
      session.sshClient.end();
      this.sessions.delete(clientId);
      this.logger.log(`Cleaned up session for client ${clientId}`);
    }
  }
}
