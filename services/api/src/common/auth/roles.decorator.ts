import { SetMetadata } from '@nestjs/common';

export enum AdminRole {
  GLOBAL_SUPER_ADMIN = 'GLOBAL_SUPER_ADMIN',
  TOWN_SUPER_ADMIN = 'TOWN_SUPER_ADMIN',
  WAREHOUSE_ADMIN = 'WAREHOUSE_ADMIN',
}

export const ROLES_KEY = 'roles';

export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);