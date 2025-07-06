import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';

export interface CollaborationMessage {
  type: string;
  sessionId: string;
  userId: string;
  userName?: string;
  data?: any;
  timestamp: number;
}

export interface ActiveSession {
  sessionId: string;
  projectId: number;
  hostUserId: string;
  participants: Map<string, ParticipantInfo>;
  lastActivity: Date;
}

export interface ParticipantInfo {
  userId: string;
  userName: string;
  role: 'host' | 'editor' | 'viewer';
  ws: WebSocket;
  cursor?: { x: number; y: number };
  selection?: any;
  isActive: boolean;
}

export class CollaborationService {
  private sessions = new Map<string, ActiveSession>();
  private userToSession = new Map<string, string>();
  
  constructor() {
    // Clean up inactive sessions every 5 minutes
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Create a new collaboration session
   */
  async createSession(projectId: number, hostUserId: string, hostUserName: string): Promise<string> {
    const sessionId = uuidv4();
    
    // Create session in database
    await storage.createCollaborationSession({
      projectId,
      sessionId,
      hostUserId,
      settings: {
        maxParticipants: 10,
        allowEditing: true,
        requireApproval: false
      }
    });

    // Create active session
    const session: ActiveSession = {
      sessionId,
      projectId,
      hostUserId,
      participants: new Map(),
      lastActivity: new Date()
    };

    this.sessions.set(sessionId, session);
    
    return sessionId;
  }

  /**
   * Join an existing collaboration session
   */
  async joinSession(
    sessionId: string,
    userId: string,
    userName: string,
    ws: WebSocket,
    role: 'host' | 'editor' | 'viewer' = 'viewer'
  ): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      // Try to load from database
      const dbSession = await storage.getCollaborationSession(sessionId);
      if (!dbSession || !dbSession.isActive) {
        return false;
      }
      
      // Recreate session
      const newSession: ActiveSession = {
        sessionId: dbSession.sessionId,
        projectId: dbSession.projectId,
        hostUserId: dbSession.hostUserId,
        participants: new Map(),
        lastActivity: new Date()
      };
      this.sessions.set(sessionId, newSession);
    }

    const activeSession = this.sessions.get(sessionId)!;
    
    // Remove user from any existing session
    await this.leaveSession(userId);

    // Add participant to session
    const participant: ParticipantInfo = {
      userId,
      userName,
      role: userId === activeSession.hostUserId ? 'host' : role,
      ws,
      isActive: true
    };

    activeSession.participants.set(userId, participant);
    this.userToSession.set(userId, sessionId);

    // Add to database
    await storage.addCollaborationParticipant({
      sessionId,
      userId,
      userName,
      role: participant.role
    });

    // Update session participant count
    await storage.updateCollaborationSession(sessionId, {
      participantCount: activeSession.participants.size
    });

    // Setup WebSocket handlers
    this.setupWebSocketHandlers(ws, sessionId, userId);

    // Broadcast user joined
    this.broadcastToSession(sessionId, {
      type: 'user_joined',
      sessionId,
      userId,
      userName,
      data: { 
        role: participant.role,
        participantCount: activeSession.participants.size
      },
      timestamp: Date.now()
    }, userId);

    // Send current participants to new user
    const participants = Array.from(activeSession.participants.values()).map(p => ({
      userId: p.userId,
      userName: p.userName,
      role: p.role,
      isActive: p.isActive,
      cursor: p.cursor,
      selection: p.selection
    }));

    this.sendToUser(userId, {
      type: 'session_state',
      sessionId,
      userId,
      data: { participants },
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Leave a collaboration session
   */
  async leaveSession(userId: string): Promise<void> {
    const sessionId = this.userToSession.get(userId);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.get(userId);
    if (!participant) return;

    // Remove from active session
    session.participants.delete(userId);
    this.userToSession.delete(userId);

    // Remove from database
    await storage.removeCollaborationParticipant(sessionId, userId);

    // Update session participant count
    await storage.updateCollaborationSession(sessionId, {
      participantCount: session.participants.size
    });

    // Close WebSocket if still open
    if (participant.ws.readyState === WebSocket.OPEN) {
      participant.ws.close();
    }

    // Broadcast user left
    this.broadcastToSession(sessionId, {
      type: 'user_left',
      sessionId,
      userId,
      data: { 
        participantCount: session.participants.size
      },
      timestamp: Date.now()
    });

    // If session is empty or host left, mark as inactive
    if (session.participants.size === 0 || userId === session.hostUserId) {
      await storage.updateCollaborationSession(sessionId, {
        isActive: false
      });
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Setup WebSocket message handlers
   */
  private setupWebSocketHandlers(ws: WebSocket, sessionId: string, userId: string): void {
    ws.on('message', async (data: string) => {
      try {
        const message: CollaborationMessage = JSON.parse(data);
        await this.handleMessage(sessionId, userId, message);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    ws.on('close', async () => {
      await this.leaveSession(userId);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  /**
   * Handle incoming collaboration messages
   */
  private async handleMessage(sessionId: string, userId: string, message: CollaborationMessage): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.get(userId);
    if (!participant) return;

    // Update last activity
    session.lastActivity = new Date();

    switch (message.type) {
      case 'cursor_move':
        participant.cursor = message.data;
        this.broadcastToSession(sessionId, {
          ...message,
          userId,
          userName: participant.userName
        }, userId);
        break;

      case 'selection_change':
        participant.selection = message.data;
        this.broadcastToSession(sessionId, {
          ...message,
          userId,
          userName: participant.userName
        }, userId);
        break;

      case 'layout_update':
        if (participant.role === 'host' || participant.role === 'editor') {
          this.broadcastToSession(sessionId, {
            ...message,
            userId,
            userName: participant.userName
          });
        }
        break;

      case 'zone_update':
        if (participant.role === 'host' || participant.role === 'editor') {
          this.broadcastToSession(sessionId, {
            ...message,
            userId,
            userName: participant.userName
          });
        }
        break;

      case 'configuration_update':
        if (participant.role === 'host' || participant.role === 'editor') {
          this.broadcastToSession(sessionId, {
            ...message,
            userId,
            userName: participant.userName
          });
        }
        break;

      case 'comment_add':
        this.broadcastToSession(sessionId, {
          ...message,
          userId,
          userName: participant.userName
        });
        break;

      case 'ping':
        // Update last seen
        await storage.updateCollaborationParticipant(
          Array.from(session.participants.values()).find(p => p.userId === userId)?.userId || 0,
          { lastSeen: new Date() }
        );
        break;

      case 'request_permissions':
        if (message.data?.targetUserId && participant.role === 'host') {
          const targetParticipant = session.participants.get(message.data.targetUserId);
          if (targetParticipant) {
            targetParticipant.role = message.data.newRole;
            this.broadcastToSession(sessionId, {
              type: 'permissions_updated',
              sessionId,
              userId: message.data.targetUserId,
              data: { newRole: message.data.newRole },
              timestamp: Date.now()
            });
          }
        }
        break;
    }
  }

  /**
   * Broadcast message to all participants in a session
   */
  private broadcastToSession(sessionId: string, message: CollaborationMessage, excludeUserId?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const messageString = JSON.stringify(message);

    for (const [userId, participant] of session.participants) {
      if (excludeUserId && userId === excludeUserId) continue;
      
      if (participant.ws.readyState === WebSocket.OPEN) {
        participant.ws.send(messageString);
      }
    }
  }

  /**
   * Send message to specific user
   */
  private sendToUser(userId: string, message: CollaborationMessage): void {
    const sessionId = this.userToSession.get(userId);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.get(userId);
    if (!participant || participant.ws.readyState !== WebSocket.OPEN) return;

    participant.ws.send(JSON.stringify(message));
  }

  /**
   * Get session information
   */
  getSessionInfo(sessionId: string): ActiveSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): ActiveSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clean up inactive sessions
   */
  private async cleanupInactiveSessions(): void {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of this.sessions) {
      const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
      
      if (timeSinceLastActivity > inactiveThreshold) {
        // Mark session as inactive in database
        await storage.updateCollaborationSession(sessionId, {
          isActive: false
        });

        // Close all WebSocket connections
        for (const participant of session.participants.values()) {
          if (participant.ws.readyState === WebSocket.OPEN) {
            participant.ws.close();
          }
        }

        // Remove from active sessions
        this.sessions.delete(sessionId);

        // Remove user mappings
        for (const userId of session.participants.keys()) {
          this.userToSession.delete(userId);
        }
      }
    }
  }

  /**
   * Force end a session (admin function)
   */
  async endSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Broadcast session ended
    this.broadcastToSession(sessionId, {
      type: 'session_ended',
      sessionId,
      userId: 'system',
      data: { reason: 'Session ended by host' },
      timestamp: Date.now()
    });

    // Close all connections
    for (const participant of session.participants.values()) {
      if (participant.ws.readyState === WebSocket.OPEN) {
        participant.ws.close();
      }
    }

    // Mark as inactive in database
    await storage.updateCollaborationSession(sessionId, {
      isActive: false
    });

    // Clean up
    this.sessions.delete(sessionId);
    for (const userId of session.participants.keys()) {
      this.userToSession.delete(userId);
    }

    return true;
  }

  /**
   * Update participant role
   */
  async updateParticipantRole(sessionId: string, userId: string, newRole: 'editor' | 'viewer'): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const participant = session.participants.get(userId);
    if (!participant || participant.role === 'host') return false;

    participant.role = newRole;

    // Update in database
    const dbParticipants = await storage.getCollaborationParticipants(sessionId);
    const dbParticipant = dbParticipants.find(p => p.userId === userId);
    if (dbParticipant) {
      await storage.updateCollaborationParticipant(dbParticipant.id, { role: newRole });
    }

    // Broadcast role update
    this.broadcastToSession(sessionId, {
      type: 'role_updated',
      sessionId,
      userId,
      data: { newRole },
      timestamp: Date.now()
    });

    return true;
  }
}

export const collaborationService = new CollaborationService();