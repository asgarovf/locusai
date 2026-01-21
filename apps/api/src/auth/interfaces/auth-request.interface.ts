import { User } from "@locusai/shared";
import { Request } from "express";

export interface AuthRequest extends Request {
  user: User;
}

export interface JwtPayload {
  email: string;
  sub: string;
  name: string;
  role: string;
}
