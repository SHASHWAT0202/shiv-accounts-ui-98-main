import type { User } from '@/types';

export type Permission =
  | 'masters:view'
  | 'transactions:view'
  | 'masters:contacts:edit'
  | 'masters:products:edit'
  | 'masters:tax:edit'
  | 'masters:accounts:edit'
  | 'transactions:edit'
  | 'payments:make'
  | 'reports:view'
  | 'ledger:view';

export function hasPermission(user: User | null | undefined, perm: Permission): boolean {
  if (!user) return false;
  switch (user.role) {
    case 'SuperUser':
      return true; // full access including management
    case 'Admin':
      return (
        perm === 'masters:view' ||
        perm === 'transactions:view' ||
        perm === 'masters:contacts:edit' ||
        perm === 'masters:products:edit' ||
        perm === 'masters:tax:edit' ||
        perm === 'masters:accounts:edit' ||
        perm === 'transactions:edit' ||
        perm === 'payments:make' ||
        perm === 'reports:view' ||
        perm === 'ledger:view'
      );
    case 'InvoicingUser':
      return (
        perm === 'masters:view' ||
        perm === 'transactions:view' ||
        perm === 'masters:contacts:edit' ||
        perm === 'masters:products:edit' ||
        perm === 'masters:tax:edit' ||
        perm === 'masters:accounts:edit' ||
        perm === 'transactions:edit' ||
        perm === 'payments:make' ||
        perm === 'reports:view' ||
        perm === 'ledger:view'
      );
    case 'ContactMaster':
      return (
        perm === 'transactions:view' ||
        perm === 'payments:make'
      );
    default:
      return false;
  }
}
