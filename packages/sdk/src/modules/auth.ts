import {
  CompleteRegistration,
  LoginResponse,
  User,
  VerifyOtp,
} from "@locusai/shared";
import { BaseModule } from "./base";

export class AuthModule extends BaseModule {
  async getMe(): Promise<User> {
    const { data } = await this.api.get<User>("/auth/me");
    return data;
  }

  async requestRegisterOtp(email: string): Promise<{ success: boolean }> {
    const { data } = await this.api.post<{ success: boolean }>(
      "/auth/register-otp",
      { email }
    );
    return data;
  }

  async requestLoginOtp(email: string): Promise<{ success: boolean }> {
    const { data } = await this.api.post<{ success: boolean }>(
      "/auth/login-otp",
      { email }
    );
    return data;
  }

  async verifyLogin(body: VerifyOtp): Promise<LoginResponse> {
    const { data } = await this.api.post<LoginResponse>(
      "/auth/verify-login",
      body
    );
    return data;
  }

  async completeRegistration(
    body: CompleteRegistration
  ): Promise<LoginResponse> {
    const { data } = await this.api.post<LoginResponse>(
      "/auth/complete-registration",
      body
    );
    return data;
  }
}
