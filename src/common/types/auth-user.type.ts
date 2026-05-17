import { RoleName } from '../enums';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: RoleName;
  permissions: string[];
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: RoleName;
  permissions: string[];
}

export interface RefreshPayload {
  sub: string;
  tokenId: string;
}
