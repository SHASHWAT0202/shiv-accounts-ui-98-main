// Role-based access control constants and utilities

export const ROLES = {
  SYSTEM_PERSON: 'SuperUser',
  ADMIN: 'Admin', 
  INVOICING_USER: 'InvoicingUser',
  CONTACT_MASTER: 'ContactMaster'
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

// Role hierarchy (higher number = more permissions)
export const ROLE_HIERARCHY = {
  [ROLES.SYSTEM_PERSON]: 4,
  [ROLES.ADMIN]: 3,
  [ROLES.INVOICING_USER]: 2,
  [ROLES.CONTACT_MASTER]: 1
} as const;

// Dashboard routes for each role
export const ROLE_DASHBOARDS = {
  [ROLES.SYSTEM_PERSON]: '/dashboard/system',
  [ROLES.ADMIN]: '/dashboard/admin', 
  [ROLES.INVOICING_USER]: '/dashboard/invoicer',
  [ROLES.CONTACT_MASTER]: '/dashboard/contact'
} as const;

// Default role for signup (InvoicingUser as per requirements)
export const DEFAULT_SIGNUP_ROLE = ROLES.INVOICING_USER;

// Roles that can be selected during signup
export const SIGNUP_AVAILABLE_ROLES = [
  ROLES.INVOICING_USER,
  ROLES.CONTACT_MASTER
] as const;

// Check if a role has higher or equal permissions than another
export function hasRolePermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Get dashboard route for a role
export function getDashboardRoute(role: UserRole): string {
  return ROLE_DASHBOARDS[role] || '/dashboard';
}
