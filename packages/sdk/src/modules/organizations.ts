import {
  AddMember,
  MembershipResponse,
  MembershipWithUser,
  MembersResponse,
  Organization,
  OrganizationResponse,
  OrganizationsResponse,
} from "@locusai/shared";
import { BaseModule } from "./base";

export class OrganizationsModule extends BaseModule {
  async list(): Promise<Organization[]> {
    const { data } =
      await this.api.get<OrganizationsResponse>("/organizations");
    return data.organizations;
  }

  async getById(id: string): Promise<Organization> {
    const { data } = await this.api.get<OrganizationResponse>(
      `/organizations/${id}`
    );
    return data.organization;
  }

  async listMembers(id: string): Promise<MembershipWithUser[]> {
    const { data } = await this.api.get<MembersResponse>(
      `/organizations/${id}/members`
    );
    return data.members;
  }

  async addMember(id: string, body: AddMember): Promise<MembershipWithUser> {
    const { data } = await this.api.post<MembershipResponse>(
      `/organizations/${id}/members`,
      body
    );
    return data.membership;
  }

  async removeMember(orgId: string, userId: string): Promise<void> {
    await this.api.delete(`/organizations/${orgId}/members/${userId}`);
  }

  async delete(orgId: string): Promise<void> {
    await this.api.delete(`/organizations/${orgId}`);
  }
}
