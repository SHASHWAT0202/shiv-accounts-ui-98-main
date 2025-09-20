import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Building2, Menu, User, LogOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';
import { NetworkStatusBadge, PWAInstallButton, PWAStatus } from '@/components/ui/pwa-status';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Adjust sidebar state based on screen size
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="h-14 md:h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between h-full px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile Menu Button */}
            {isMobile ? (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 bg-background">
                  <div className="p-4 h-full overflow-y-auto">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h1 className="text-lg font-semibold text-foreground">Shiv Accounts</h1>
                        <p className="text-xs text-muted-foreground">{user?.companyName || 'Loading...'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {user ? (
                        <Sidebar 
                          isOpen={true} 
                          isMobile={true}
                          onNavigate={() => setMobileMenuOpen(false)} 
                          currentPath={location.pathname}
                        />
                      ) : (
                        <div className="text-muted-foreground text-sm">Loading menu...</div>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:flex"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-lg bg-primary text-primary-foreground">
                <Building2 className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm md:text-lg font-semibold text-foreground">Shiv Accounts Cloud</h1>
                <p className="text-xs text-muted-foreground hidden md:block">{user?.companyName ?? '—'}</p>
              </div>
            </div>
            
            {/* Network Status Badge */}
            <NetworkStatusBadge />
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* PWA Install Button */}
            <PWAInstallButton variant="outline" size="sm" />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 md:h-10 md:w-10 rounded-full">
                  <Avatar className="h-8 w-8 md:h-10 md:w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs md:text-sm">
                      {(user?.name ?? 'U N').split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name ?? 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Role: {user?.role}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <Sidebar 
            isOpen={sidebarOpen} 
            isMobile={false}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            currentPath={location.pathname}
          />
        )}

        {/* Main Content */}
        <main className={cn(
          "flex-1 transition-all duration-300 min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)]",
          !isMobile && sidebarOpen ? "lg:ml-64" : "lg:ml-16",
          isMobile && "ml-0"
        )}>
          <div className="p-3 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* PWA Status and Update Notifications */}
      <PWAStatus />
    </div>
  );
}