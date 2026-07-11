import { Role } from '../enums';

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  permissions: Record<string, boolean>;
  branchId: string | null;
}

export interface JwtPayload {
  sub: string;
  role: Role;
}
