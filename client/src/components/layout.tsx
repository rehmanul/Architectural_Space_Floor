import { Link, useLocation } from 'wouter';
import { Home, Building2, Settings, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Projects', href: '/projects', icon: Building2 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <Link href="/">
              <a className="mr-6 flex items-center space-x-2">
                <Building2 className="h-6 w-6" />
                <span className="hidden font-bold sm:inline-block">
                  Space Analyzer
                </span>
              </a>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <a
                      className={cn(
                        'flex items-center space-x-2 transition-colors hover:text-foreground/80',
                        location === item.href ? 'text-foreground' : 'text-foreground/60'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </a>
                  </Link>
                );
              })}
            </nav>
          </div>
          
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            className="md:hidden"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
          
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              {/* Add search or other header items here */}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <nav className="fixed left-0 top-14 bottom-0 w-64 bg-background p-6 shadow-lg">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <a
                    className={cn(
                      'flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
                      location === item.href ? 'bg-accent' : ''
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </a>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}