import type { Permission, Role } from "@mise/types";
const grants: Record<Role, Permission[]> = {
  owner: ["business:read", "business:write", "location:read", "location:write", "team:invite", "audit:read"],
  manager: ["business:read", "location:read", "location:write", "team:invite"],
  shift_lead: ["location:read"], staff: ["location:read"], platform_admin: ["audit:read"]
};
export const can = (role: Role, permission: Permission) => grants[role].includes(permission);
