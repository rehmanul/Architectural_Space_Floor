
import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { CollaborationProvider } from '@/components/collaboration-provider';
import { FloorPlan3DViewer } from '@/components/floor-plan-3d-viewer';
import { LayoutGeneratorPage } from './layout-generator';
import { Users, Crown, Edit, Eye, UserMinus, Settings, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Participant {
  userId: string;
  userName: string;
  role: 'host' | 'editor' | 'viewer';
  isActive: boolean;
  cursor?: { x: number; y: number };
  selection?: any;
}

interface SessionInfo {
  sessionId: string;
  projectId: number;
  hostUserId: string;
  participants: Participant[];
  lastActivity: string;
}

export function CollaborationSessionPage() {
  const { sessionId } = useParams();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [currentUserId] = useState(() => `user_${Math.random().toString(36).substr(2, 9)}`);
  const [currentUserName] = useState(() => `User ${Math.floor(Math.random() * 1000)}`);
  const [isConnected, setIsConnected] = useState(false);

  const { data: sessionInfo, isLoading, error } = useQuery<SessionInfo>({
    queryKey: [`/api/collaboration/sessions/${sessionId}`],
    enabled: !!sessionId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const copySessionLink = () => {
    const url = `${window.location.origin}/collaboration/session/${sessionId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link Copied',
      description: 'Collaboration session link copied to clipboard',
    });
  };

  const leaveSession = async () => {
    try {
      await apiRequest(`/api/collaboration/sessions/${sessionId}/leave`, 'POST', {
        userId: currentUserId
      });
      navigate('/projects');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to leave session',
        variant: 'destructive',
      });
    }
  };

  const updateParticipantRole = async (participantUserId: string, newRole: 'editor' | 'viewer') => {
    try {
      await apiRequest(`/api/collaboration/sessions/${sessionId}/participants/${participantUserId}`, 'PATCH', {
        newRole,
        requesterId: currentUserId
      });
      toast({
        title: 'Role Updated',
        description: `Participant role changed to ${newRole}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update participant role',
        variant: 'destructive',
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'host': return <Crown className="w-4 h-4 text-amber-500" />;
      case 'editor': return <Edit className="w-4 h-4 text-blue-500" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'host': return 'default';
      case 'editor': return 'secondary';
      case 'viewer': return 'outline';
      default: return 'outline';
    }
  };

  const isHost = sessionInfo?.hostUserId === currentUserId;
  const currentParticipant = sessionInfo?.participants.find(p => p.userId === currentUserId);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !sessionInfo) {
    return (
      <div className="container mx-auto p-6 text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Session Not Found</CardTitle>
            <CardDescription>
              The collaboration session you're looking for doesn't exist or has ended.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/projects')}>
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <CollaborationProvider
      sessionId={sessionId!}
      userId={currentUserId}
      userName={currentUserName}
      onConnectionChange={setIsConnected}
    >
      <div className="container mx-auto p-6">
        {/* Session Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Live Collaboration Session</h1>
            <p className="text-muted-foreground">
              Session ID: {sessionId} • {isConnected ? 'Connected' : 'Connecting...'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={copySessionLink}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            <Button variant="outline" onClick={leaveSession}>
              <UserMinus className="w-4 h-4 mr-2" />
              Leave Session
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {sessionInfo.projectId && (
              <Card>
                <CardHeader>
                  <CardTitle>Project Workspace</CardTitle>
                  <CardDescription>
                    Collaborative floor plan editing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* This would integrate with the layout generator */}
                  <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="font-semibold mb-2">Floor Plan Editor</h3>
                      <p className="text-muted-foreground mb-4">
                        Collaborative workspace for floor plan optimization
                      </p>
                      <Button onClick={() => navigate(`/floor-plans/${sessionInfo.projectId}/generator`)}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in Generator
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Participants Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Participants ({sessionInfo.participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sessionInfo.participants.map((participant) => (
                  <div
                    key={participant.userId}
                    className={`p-3 border rounded-lg ${
                      participant.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          participant.isActive ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <span className="font-medium text-sm">
                          {participant.userName}
                          {participant.userId === currentUserId && ' (You)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(participant.role)}
                        <Badge variant={getRoleBadgeVariant(participant.role)} className="text-xs">
                          {participant.role}
                        </Badge>
                      </div>
                    </div>

                    {/* Role Management for Host */}
                    {isHost && participant.userId !== currentUserId && participant.role !== 'host' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-6"
                          onClick={() => updateParticipantRole(participant.userId, 'editor')}
                          disabled={participant.role === 'editor'}
                        >
                          Make Editor
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-6"
                          onClick={() => updateParticipantRole(participant.userId, 'viewer')}
                          disabled={participant.role === 'viewer'}
                        >
                          Make Viewer
                        </Button>
                      </div>
                    )}

                    {/* Cursor Position */}
                    {participant.cursor && participant.isActive && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Cursor: ({participant.cursor.x.toFixed(0)}, {participant.cursor.y.toFixed(0)})
                      </div>
                    )}
                  </div>
                ))}

                {sessionInfo.participants.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">No active participants</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connection Status */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Connection Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {currentParticipant && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Role: {currentParticipant.role}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CollaborationProvider>
  );
}
