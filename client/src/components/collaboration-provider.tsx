import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';

interface Participant {
  id: string;
  name: string;
  role: 'host' | 'editor' | 'viewer';
  isActive: boolean;
  joinedAt: Date;
}

interface CursorPosition {
  x: number;
  y: number;
  user: string;
  userId: string;
  timestamp: number;
}

interface CollaborationState {
  isConnected: boolean;
  sessionId: string | null;
  participants: Participant[];
  cursors: Map<string, CursorPosition>;
  currentUser: Participant | null;
  notifications: string[];
}

interface CollaborationContextType extends CollaborationState {
  joinSession: (sessionId: string, userName: string, role?: string) => void;
  leaveSession: () => void;
  updateCursor: (x: number, y: number) => void;
  sendLayoutUpdate: (layoutData: any) => void;
  sendMessage: (message: string) => void;
  clearNotifications: () => void;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

export function CollaborationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CollaborationState>({
    isConnected: false,
    sessionId: null,
    participants: [],
    cursors: new Map(),
    currentUser: null,
    notifications: [],
  });

  const { sendMessage, lastMessage, connectionStatus } = useWebSocket(
    `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
  );

  useEffect(() => {
    if (connectionStatus === 'connected') {
      setState(prevState => ({ ...prevState, isConnected: true }));
    } else {
      setState(prevState => ({ ...prevState, isConnected: false }));
    }
  }, [connectionStatus]);

  useEffect(() => {
    if (lastMessage) {
      const messageData = JSON.parse(lastMessage.data);
      switch (messageData.type) {
        case 'sessionJoined':
          setState(prevState => ({
            ...prevState,
            sessionId: messageData.sessionId,
            participants: messageData.participants,
            currentUser: messageData.currentUser,
          }));
          break;
        case 'participantsUpdated':
          setState(prevState => ({
            ...prevState,
            participants: messageData.participants,
          }));
          break;
        case 'cursorUpdated':
          const { userId, x, y, timestamp } = messageData;
          setState(prevState => {
            const newCursors = new Map(prevState.cursors);
            const user = prevState.participants.find(p => p.id === userId);

            if (user) {
              newCursors.set(userId, { x, y, user: user.name, userId, timestamp });
            }
            return { ...prevState, cursors: newCursors };
          });
          break;
        case 'layoutUpdated':
          // Handle layout update logic here
          break;
        case 'notification':
          setState(prevState => ({
            ...prevState,
            notifications: [...prevState.notifications, messageData.message],
          }));
          break;
        default:
          console.log('Unhandled message type:', messageData.type);
      }
    }
  }, [lastMessage]);

  const joinSession = useCallback(
    (sessionId: string, userName: string, role: string = 'viewer') => {
      sendMessage(JSON.stringify({
        type: 'joinSession',
        sessionId: sessionId,
        userName: userName,
        role: role,
      }));
    },
    [sendMessage]
  );

  const leaveSession = useCallback(() => {
    sendMessage(JSON.stringify({ type: 'leaveSession' }));
    setState(prevState => ({
      ...prevState,
      sessionId: null,
      participants: [],
      cursors: new Map(),
      currentUser: null,
    }));
  }, [sendMessage]);

  const updateCursor = useCallback((x: number, y: number) => {
    sendMessage(JSON.stringify({ type: 'updateCursor', x, y }));
  }, [sendMessage]);

  const sendLayoutUpdate = useCallback((layoutData: any) => {
    sendMessage(JSON.stringify({ type: 'updateLayout', layoutData }));
  }, [sendMessage]);

  const sendMessageToSession = useCallback((message: string) => {
    sendMessage(JSON.stringify({ type: 'sendMessage', message }));
  }, [sendMessage]);

  const clearNotifications = useCallback(() => {
    setState(prevState => ({ ...prevState, notifications: [] }));
  }, []);

  const contextValue: CollaborationContextType = {
    ...state,
    joinSession,
    leaveSession,
    updateCursor,
    sendLayoutUpdate,
    sendMessage: sendMessageToSession,
    clearNotifications,
  };

  return (
    <CollaborationContext.Provider value={contextValue}>
      {children}
    </CollaborationContext.Provider>
  );
}

export const useCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};