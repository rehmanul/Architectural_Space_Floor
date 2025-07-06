import React, { createContext, useContext, useState, useCallback } from 'react';
import { useWebSocket, WebSocketMessage } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';

interface Participant {
  userId: string;
  userName: string;
  role: 'host' | 'editor' | 'viewer';
  cursor?: { x: number; y: number };
  selection?: any;
  isActive: boolean;
}

interface CollaborationState {
  isConnected: boolean;
  sessionId: string | null;
  participants: Participant[];
  currentUserId: string;
  currentUserName: string;
  joinSession: (sessionId: string, userName: string, role?: string) => void;
  leaveSession: () => void;
  sendCursorUpdate: (position: { x: number; y: number }) => void;
  sendSelectionUpdate: (selection: any) => void;
  sendLayoutUpdate: (layoutData: any) => void;
}

const CollaborationContext = createContext<CollaborationState | null>(null);

export function CollaborationProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUserId] = useState(() => `user_${Math.random().toString(36).substr(2, 9)}`);
  const [currentUserName, setCurrentUserName] = useState('Anonymous');
  const { toast } = useToast();

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'user_joined':
        if (message.userId && message.userName) {
          setParticipants(prev => [
            ...prev.filter(p => p.userId !== message.userId),
            {
              userId: message.userId,
              userName: message.userName,
              role: message.data?.role || 'viewer',
              isActive: true
            }
          ]);
          
          if (message.userId !== currentUserId) {
            toast({
              title: 'User joined',
              description: `${message.userName} joined the session`,
              variant: 'default'
            });
          }
        }
        break;

      case 'user_left':
        if (message.userId) {
          setParticipants(prev => prev.filter(p => p.userId !== message.userId));
          
          if (message.userId !== currentUserId) {
            toast({
              title: 'User left',
              description: 'A user left the session',
              variant: 'default'
            });
          }
        }
        break;

      case 'cursor_move':
        if (message.userId && message.userId !== currentUserId) {
          setParticipants(prev => prev.map(p => 
            p.userId === message.userId 
              ? { ...p, cursor: message.data }
              : p
          ));
        }
        break;

      case 'selection_change':
        if (message.userId && message.userId !== currentUserId) {
          setParticipants(prev => prev.map(p => 
            p.userId === message.userId 
              ? { ...p, selection: message.data }
              : p
          ));
        }
        break;

      case 'layout_update':
        // Handle layout updates from other users
        // This would trigger updates in the layout editor
        break;

      case 'session_state':
        if (message.data?.participants) {
          setParticipants(message.data.participants);
        }
        break;

      case 'session_ended':
        setSessionId(null);
        setParticipants([]);
        toast({
          title: 'Session ended',
          description: 'The collaboration session has ended',
          variant: 'warning'
        });
        break;

      case 'error':
        toast({
          title: 'Collaboration error',
          description: message.data?.message || 'An error occurred',
          variant: 'destructive'
        });
        break;
    }
  }, [currentUserId, toast]);

  const { isConnected, sendMessage } = useWebSocket('/ws', {
    onMessage: handleMessage,
    onConnect: () => {
      // Connection established
    },
    onDisconnect: () => {
      setParticipants([]);
    }
  });

  const joinSession = useCallback((newSessionId: string, userName: string, role: string = 'viewer') => {
    setSessionId(newSessionId);
    setCurrentUserName(userName);
    
    sendMessage({
      type: 'join_collaboration',
      data: {
        sessionId: newSessionId,
        userId: currentUserId,
        userName,
        role
      }
    });
  }, [sendMessage, currentUserId]);

  const leaveSession = useCallback(() => {
    if (sessionId) {
      sendMessage({
        type: 'leave_collaboration',
        sessionId,
        userId: currentUserId
      });
    }
    
    setSessionId(null);
    setParticipants([]);
  }, [sendMessage, sessionId, currentUserId]);

  const sendCursorUpdate = useCallback((position: { x: number; y: number }) => {
    if (sessionId) {
      sendMessage({
        type: 'cursor_move',
        sessionId,
        userId: currentUserId,
        data: position,
        timestamp: Date.now()
      });
    }
  }, [sendMessage, sessionId, currentUserId]);

  const sendSelectionUpdate = useCallback((selection: any) => {
    if (sessionId) {
      sendMessage({
        type: 'selection_change',
        sessionId,
        userId: currentUserId,
        data: selection,
        timestamp: Date.now()
      });
    }
  }, [sendMessage, sessionId, currentUserId]);

  const sendLayoutUpdate = useCallback((layoutData: any) => {
    if (sessionId) {
      sendMessage({
        type: 'layout_update',
        sessionId,
        userId: currentUserId,
        data: layoutData,
        timestamp: Date.now()
      });
    }
  }, [sendMessage, sessionId, currentUserId]);

  const value: CollaborationState = {
    isConnected,
    sessionId,
    participants,
    currentUserId,
    currentUserName,
    joinSession,
    leaveSession,
    sendCursorUpdate,
    sendSelectionUpdate,
    sendLayoutUpdate
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
}