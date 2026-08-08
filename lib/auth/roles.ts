export type Role = "cliente" | "agencia" | "admin";

export function hasRole(userRole: Role, allowed: Role[]): boolean {
  return allowed.includes(userRole);
}

export function isAdmin(userRole: Role): boolean {
  return userRole === "admin";
}

export function canManageClient(userRole: Role): boolean {
  return userRole === "agencia" || userRole === "admin";
}
