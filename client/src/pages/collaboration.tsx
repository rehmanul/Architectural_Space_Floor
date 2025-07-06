import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Users, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCollaboration } from '@/components/collaboration-provider';

export function CollaborationPage() {
  const { sessionId } = useParams();
  const { toast } = useToast();
  const { users, isConnected, joinSession } = useCollaboration();
  const [userName, setUserName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleJoinSession = () => {
    if (!userName.trim()) {
      toast({
        title: 'Enter your name',
        description: 'Please enter your name to join the collaboration session',
        variant: 'destructive',
      });
      return;
    }

    if (sessionId) {
      joinSession(sessionId, userName);
      setHasJoined(true);
    }
  };

  const copySessionLink = () => {
    const link = `${window.location.origin}/collaboration/${sessionId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Link copied',
      description: 'Share this link with your team members',
    });
  };

  if (!hasJoined) {
    return (
      <div className="container mx-auto p-6 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Join Collaboration Session</CardTitle>
            <CardDescription>Enter your name to start collaborating</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                placeholder="Your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinSession()}
              />
              <Button className="w-full" onClick={handleJoinSession}>
                <Users className="w-4 h-4 mr-2" />
                Join Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Collaboration Session</h1>
        <p className="text-muted-foreground">
          Work together on floor plans in real-time
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Card className="h-[600px]">
            <CardContent className="p-6 h-full flex items-center justify-center">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Collaboration Canvas</h3>
                <p className="text-muted-foreground">
                  Shared floor plan editing will appear here
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Session ID:</span>
                  <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                    {sessionId}
                  </code>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`ml-2 font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={copySessionLink}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Invite Link
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Users ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No other users in this session
                  </p>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: user.color }}
                      />
                      <span className="text-sm">{user.name}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Collaboration Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Real-time collaboration features including live cursors,
                synchronized editing, and instant updates
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}