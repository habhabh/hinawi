export type Role = "super_admin" | "admin" | "editor";
export type Permission =
  | "content:read"
  | "content:write"
  | "media:write"
  | "qr:manage"
  | "analytics:read"
  | "settings:write"
  | "users:manage";

const grants: Record<Role, readonly Permission[]> = {
  super_admin: ["content:read", "content:write", "media:write", "qr:manage", "analytics:read", "settings:write", "users:manage"],
  admin: ["content:read", "content:write", "media:write", "qr:manage", "analytics:read", "settings:write"],
  editor: ["content:read", "content:write", "media:write"],
};

export function can(role: Role, permission: Permission): boolean {
  return grants[role].includes(permission);
}

export function assertPermission(role: Role, permission: Permission): void {
  if (!can(role, permission)) throw new Error("ليس لديك صلاحية لتنفيذ هذا الإجراء");
}
