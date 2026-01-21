import {
  AcceptInvitation,
  AcceptInvitationResponse,
  CreateInvitation,
  Invitation,
  InvitationResponse,
  InvitationsResponse,
} from "@locusai/shared";
import { BaseModule } from "./base";

export class InvitationsModule extends BaseModule {
  async create(orgId: string, body: CreateInvitation): Promise<Invitation> {
    const { data } = await this.api.post<InvitationResponse>(
      `/org/${orgId}/invitations`,
      body
    );
    return data.invitation;
  }

  async list(orgId: string): Promise<Invitation[]> {
    const { data } = await this.api.get<InvitationsResponse>(
      `/org/${orgId}/invitations`
    );
    return data.invitations;
  }

  async verify(token: string): Promise<Invitation> {
    const { data } = await this.api.get<InvitationResponse>(
      `/invitations/verify/${token}`
    );
    return data.invitation;
  }

  async accept(body: AcceptInvitation): Promise<AcceptInvitationResponse> {
    const { data } = await this.api.post<AcceptInvitationResponse>(
      "/invitations/accept",
      body
    );
    return data;
  }

  async revoke(orgId: string, id: string): Promise<void> {
    await this.api.delete(`/org/${orgId}/invitations/${id}`);
  }
}
