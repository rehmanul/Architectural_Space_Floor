import { createContext, useContext, useEffect, useState, useRef } from 'react';

interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
}

interface CollaborationContextType {
  sessionId: string | null;
  users: CollaborationUser[];
  isConnected: boolean;
  joinSession: (sessionId: string, userName: string) => void;
  leaveSession: () => void;
  updateCursor: (x: number, y: number) => void;
}

const CollaborationContext = createContext<CollaborationContextType>({
  sessionId: null,
  users: [],
  isConnected: false,
  joinSession: () => {},
  leaveSession: () => {},
  updateCursor: () => {},
});

export function CollaborationProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [users, setUsers] = useState<CollaborationUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const joinSession = (newSessionId: string, userName: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({
        type: 'join',
        sessionId: newSessionId,
        userName,
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'users':
          setUsers(data.users);
          break;
        case 'cursor':
          setUsers(prev => prev.map(user => 
            user.id === data.userId 
              ? { ...user, cursor: data.cursor }
              : user
          ));
          break;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    wsRef.current = ws;
    setSessionId(newSessionId);
  };

  const leaveSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setSessionId(null);
    setUsers([]);
    setIsConnected(false);
  };

  const updateCursor = (x: number, y: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor',
        cursor: { x, y },
      }));
    }
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <CollaborationContext.Provider value={{
      sessionId,
      users,
      isConnected,
      joinSession,
      leaveSession,
      updateCursor,
    }}>
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