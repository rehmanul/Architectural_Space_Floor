
import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { collaborationService } from './services/collaboration';
import url from 'url';

export function setupWebSocketServer(server: any) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws',
    verifyClient: (info) => {
      // Basic verification - in production, add authentication
      return true;
    }
  });

  wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
    const pathname = url.parse(request.url || '').pathname;
    
    if (!pathname?.startsWith('/ws/collaboration/')) {
      ws.close(4000, 'Invalid WebSocket path');
      return;
    }

    const sessionId = pathname.split('/')[3];
    if (!sessionId) {
      ws.close(4001, 'Session ID required');
      return;
    }

    // Wait for initial authentication message
    const authTimeout = setTimeout(() => {
      ws.close(4002, 'Authentication timeout');
    }, 10000);

    ws.on('message', async (data: string) => {
      try {
        const message = JSON.parse(data);
        
        if (message.type === 'auth') {
          clearTimeout(authTimeout);
          
          const { userId, userName, role } = message.data;
          
          const success = await collaborationService.joinSession(
            sessionId,
            userId,
            userName,
            ws,
            role || 'viewer'
          );

          if (!success) {
            ws.close(4003, 'Failed to join session');
            return;
          }

          // Send acknowledgment
          ws.send(JSON.stringify({
            type: 'auth_success',
            sessionId,
            userId,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.close(4004, 'Message parsing error');
      }
    });

    ws.on('close', () => {
      clearTimeout(authTimeout);
      // Cleanup handled by collaboration service
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clearTimeout(authTimeout);
    });
  });

  return wss;
}
