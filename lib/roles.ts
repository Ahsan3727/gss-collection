export const ALLOWED_ADMIN_ROLES = ['admin', 'superadmin'] as const;

export function isAdminRole(role: unknown): role is (typeof ALLOWED_ADMIN_ROLES)[number] {
  return typeof role === 'string' && (ALLOWED_ADMIN_ROLES as readonly string[]).includes(role);
}
