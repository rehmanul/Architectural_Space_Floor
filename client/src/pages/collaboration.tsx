import { useParams, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCollaboration } from '@/components/collaboration-provider';
import { useState } from 'react';
import { Users, Copy, Crown, Edit, Eye, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function CollaborationPage() {
  const { sessionId } = useParams();
  const [userName, setUserName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const { 
    isConnected, 
    participants, 
    currentUserId, 
    joinSession, 
    leaveSession 
  } = useCollaboration();
  const { toast } = useToast();

  const handleJoinSession = () => {
    if (!userName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter your name to join the session.',
        variant: 'destructive',
      });
      return;
    }

    joinSession(sessionId || '', userName.trim());
    setHasJoined(true);
    toast({
      title: 'Joined session',
      description: 'You have successfully joined the collaboration session.',
      variant: 'success',
    });
  };

  const handleLeaveSession = () => {
    leaveSession();
    setHasJoined(false);
    toast({
      title: 'Left session',
      description: 'You have left the collaboration session.',
      variant: 'default',
    });
  };

  const copySessionLink = () => {
    const link = `${window.location.origin}/collaboration/${sessionId}`;
    navigator.clipboard.writeText(link).then(() => {
      toast({
        title: 'Link copied',
        description: 'Session link has been copied to clipboard.',
        variant: 'success',
      });
    }).catch(() => {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy session link.',
        variant: 'destructive',
      });
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'host': return <Crown className="h-4 w-4" />;
      case 'editor': return <Edit className="h-4 w-4" />;
      case 'viewer': return <Eye className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'host': return 'text-yellow-600';
      case 'editor': return 'text-blue-600';
      case 'viewer': return 'text-gray-600';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collaboration Session</h1>
          <p className="text-muted-foreground">Work together on architectural layouts in real-time</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {!hasJoined ? (
            <Card>
              <CardHeader>
                <CardTitle>Join Collaboration Session</CardTitle>
                <CardDescription>
                  Enter your name to join this real-time collaboration session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinSession()}
                />
                <Button onClick={handleJoinSession} className="w-full">
                  Join Session
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Session Active</span>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-muted-foreground">
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </CardTitle>
                <CardDescription>
                  You are now connected to the collaboration session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={copySessionLink} className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copy Session Link
                  </Button>
                  <Button variant="destructive" onClick={handleLeaveSession}>
                    Leave Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Session Features */}
          <Card>
            <CardHeader>
              <CardTitle>Collaboration Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Real-time Updates</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Live cursor tracking</li>
                    <li>• Synchronized view changes</li>
                    <li>• Instant layout updates</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Team Coordination</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Role-based permissions</li>
                    <li>• Selection awareness</li>
                    <li>• Comment system</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Session Info */}
          <Card>
            <CardHeader>
              <CardTitle>Session Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Session ID:</span>
                <div className="font-mono text-xs break-all">{sessionId}</div>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span className={`ml-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? 'Active' : 'Inactive'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Participants ({participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.userId}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: `hsl(${Math.abs(participant.userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 360}, 70%, 50%)`
                        }}
                      />
                      <span className="text-sm font-medium">
                        {participant.userName}
                        {participant.userId === currentUserId && ' (You)'}
                      </span>
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${getRoleColor(participant.role)}`}>
                      {getRoleIcon(participant.role)}
                      <span className="capitalize">{participant.role}</span>
                    </div>
                  </div>
                ))}
                
                {participants.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No participants yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <Copy className="h-4 w-4" />
                Copy Session Link
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <Users className="h-4 w-4" />
                Invite Team Members
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}