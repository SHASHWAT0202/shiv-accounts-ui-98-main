import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Receipt,
  FileText,
  ShoppingCart,
  CreditCard,
  BarChart3,
  ChevronDown,
  Building2,
  Calculator,
  Target,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/rbac';

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
  currentPath?: string;
  isMobile?: boolean; // Add this to detect mobile usage
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<Record<string, unknown>>;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Masters',
    href: '/masters',
    icon: Building2,
    children: [
      {
        title: 'Contacts',
        href: '/masters/contacts',
        icon: Users,
      },
      {
        title: 'Products',
        href: '/masters/products',
        icon: Package,
      },
      {
        title: 'Tax Master',
        href: '/masters/tax',
        icon: Calculator,
      },
      {
        title: 'Chart of Accounts',
        href: '/masters/accounts',
        icon: Target,
      },
    ],
  },
  {
    title: 'Transactions',
    href: '/transactions',
    icon: FileText,
    children: [
      {
        title: 'Purchase Orders',
        href: '/transactions/purchase-orders',
        icon: ShoppingCart,
      },
      {
        title: 'Vendor Bills',
        href: '/transactions/vendor-bills',
        icon: Receipt,
      },
      {
        title: 'Sales Orders',
        href: '/transactions/sales-orders',
        icon: FileText,
      },
      {
        title: 'Invoices',
        href: '/transactions/invoices',
        icon: FileText,
      },
      {
        title: 'Payments',
        href: '/transactions/payments',
        icon: CreditCard,
      },
    ],
  },
  {
    title: 'Payment Gateway',
    href: '/payment-gateway',
    icon: CreditCard,
  },
  {
    title: 'Test Payment',
    href: '/test-payment',
    icon: CreditCard,
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
  },
  {
    title: 'Ledger',
    href: '/ledger',
    icon: BookOpen,
  },
];

export function Sidebar({ isOpen = true, currentPath, onNavigate, isMobile = false }: SidebarProps) {
  const [openSections, setOpenSections] = useState<string[]>(['Masters', 'Transactions']);
  const { user } = useAuth();

  const visibleNav = useMemo(() => {
    if (!user) return navigation; // Show all navigation if no user (fallback)
    
    const isContactMaster = user?.role === 'ContactMaster';
    return navigation.filter(item => {
      if (item.href === '/reports') return hasPermission(user, 'reports:view');
      if (item.href === '/ledger') return hasPermission(user, 'ledger:view');
      if (item.href === '/payment-gateway') return hasPermission(user, 'payments:make');
      if (item.title === 'Masters') return hasPermission(user, 'masters:view');
      if (item.title === 'Transactions') return hasPermission(user, 'transactions:view');
      return true;
    }).map(item => ({
      ...item,
      children: item.children?.filter(child => {
        if (child.href.includes('/masters/contacts')) return hasPermission(user, 'masters:contacts:edit');
        if (child.href.includes('/masters/products')) return hasPermission(user, 'masters:products:edit');
        if (child.href.includes('/masters/tax')) return hasPermission(user, 'masters:tax:edit');
        if (child.href.includes('/masters/accounts')) return hasPermission(user, 'masters:accounts:edit');
        if (child.href.startsWith('/transactions/')) {
          if (!hasPermission(user, 'transactions:view')) return false;
          if (isContactMaster) {
            // Show only Invoices, Vendor Bills, Payments
            return (
              child.href.includes('/transactions/invoices') ||
              child.href.includes('/transactions/vendor-bills') ||
              child.href.includes('/transactions/payments')
            );
          }
          return true;
        }
        return true;
      })
    }));
  }, [user]);

  const toggleSection = (title: string) => {
    setOpenSections(prev =>
      prev.includes(title)
        ? prev.filter(section => section !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return currentPath === '/' || currentPath === '/dashboard';
    return currentPath.startsWith(href);
  };

  const isParentActive = (item: NavItem) => {
    if (item.children) {
      return item.children.some(child => isActive(child.href));
    }
    return isActive(item.href);
  };

  return (
    <aside className={cn(
      isMobile 
        ? "w-full bg-transparent" // Mobile: no fixed positioning, full width
        : "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] bg-sidebar-background border-r border-sidebar-border transition-all duration-300",
      !isMobile && (isOpen ? "w-64" : "w-16")
    )}>
      <div className={cn("flex flex-col", isMobile ? "h-auto" : "h-full")}>
        <nav className={cn("p-4 space-y-2", isMobile ? "flex-1" : "flex-1")}>
          {visibleNav.map((item) => {
            if (item.children) {
              const sectionIsOpen = openSections.includes(item.title);
              const parentActive = isParentActive(item);

              return (
                <Collapsible
                  key={item.title}
                  open={sectionIsOpen}
                  onOpenChange={() => toggleSection(item.title)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        parentActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                        !isOpen && "px-2 justify-center"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5", isOpen && "mr-3")} />
                      {isOpen && (
                        <>
                          <span className="flex-1 text-left">{item.title}</span>
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            sectionIsOpen && "transform rotate-180"
                          )} />
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  {isOpen && (
                    <CollapsibleContent className="pl-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.href}
                          to={child.href}
                          onClick={onNavigate}
                          className={({ isActive: navActive }) => cn(
                            "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            (navActive || isActive(child.href)) && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          )}
                        >
                          <child.icon className="h-4 w-4 mr-3" />
                          {child.title}
                        </NavLink>
                      ))}
                    </CollapsibleContent>
                  )}
                </Collapsible>
              );
            }

            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className={({ isActive: navActive }) => cn(
                  "flex items-center px-3 py-2 rounded-md text-sidebar-foreground transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  (navActive || isActive(item.href)) && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                  !isOpen && "justify-center"
                )}
              >
                <item.icon className={cn("h-5 w-5", isOpen && "mr-3")} />
                {isOpen && <span>{item.title}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}