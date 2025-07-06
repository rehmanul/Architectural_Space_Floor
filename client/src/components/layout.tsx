import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { useCollaboration } from '@/components/collaboration-provider';
import { 
  Home, 
  FolderOpen, 
  Settings, 
  Moon, 
  Sun, 
  Users,
  Building2,
  LayoutGrid
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const { isConnected, sessionId, participants } = useCollaboration();

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Projects', href: '/projects', icon: FolderOpen },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return location === '/';
    }
    return location.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center space-x-4">
            <Building2 className="h-6 w-6" />
            <h1 className="text-lg font-semibold">Architectural Space Analyzer</h1>
          </div>
          
          <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href}>
                  <a
                    className={cn(
                      'flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary',
                      isActive(item.href)
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </a>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center space-x-4">
            {/* Collaboration Status */}
            {sessionId && (
              <div className="flex items-center space-x-2 text-sm">
                <Users className="h-4 w-4" />
                <span className="text-muted-foreground">
                  {participants.length} participant{participants.length !== 1 ? 's' : ''}
                </span>
                <div className={cn(
                  'h-2 w-2 rounded-full',
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                )} />
              </div>
            )}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Collaboration Cursors */}
      {sessionId && participants.map((participant) => (
        participant.cursor && participant.userId !== useCollaboration().currentUserId && (
          <div
            key={participant.userId}
            className="collaboration-cursor"
            style={{
              left: participant.cursor.x,
              top: participant.cursor.y,
              color: `hsl(${Math.abs(participant.userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 360}, 70%, 50%)`
            }}
          >
            <div className="collaboration-user-label">
              {participant.userName}
            </div>
          </div>
        )
      ))}
    </div>
  );
}