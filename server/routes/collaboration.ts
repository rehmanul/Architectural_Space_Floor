
import express from 'express';
import WebSocket from 'ws';
import { collaborationService } from '../services/collaboration';
import { storage } from '../storage';

const router = express.Router();

// Create collaboration session
router.post('/api/collaboration/sessions', async (req, res) => {
  try {
    const { projectId, hostUserId, hostUserName } = req.body;

    const sessionId = await collaborationService.createSession(
      projectId,
      hostUserId,
      hostUserName
    );

    res.json({ sessionId });
  } catch (error) {
    console.error('Create collaboration session error:', error);
    res.status(500).json({ error: 'Failed to create collaboration session' });
  }
});

// Get session info
router.get('/api/collaboration/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = collaborationService.getSessionInfo(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const participants = Array.from(session.participants.values()).map(p => ({
      userId: p.userId,
      userName: p.userName,
      role: p.role,
      isActive: p.isActive,
      cursor: p.cursor,
      selection: p.selection
    }));

    res.json({
      sessionId: session.sessionId,
      projectId: session.projectId,
      hostUserId: session.hostUserId,
      participants,
      lastActivity: session.lastActivity
    });
  } catch (error) {
    console.error('Get session info error:', error);
    res.status(500).json({ error: 'Failed to get session info' });
  }
});

// Join session (WebSocket endpoint will be handled separately)
router.post('/api/collaboration/sessions/:sessionId/join', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId, userName, role } = req.body;

    // This endpoint just validates the session exists
    const session = collaborationService.getSessionInfo(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ 
      success: true,
      message: 'Session found. Connect via WebSocket to join.',
      wsUrl: `/ws/collaboration/${sessionId}`
    });
  } catch (error) {
    console.error('Join session validation error:', error);
    res.status(500).json({ error: 'Failed to validate session' });
  }
});

// Leave session
router.post('/api/collaboration/sessions/:sessionId/leave', async (req, res) => {
  try {
    const { userId } = req.body;
    await collaborationService.leaveSession(userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Leave session error:', error);
    res.status(500).json({ error: 'Failed to leave session' });
  }
});

// End session (host only)
router.delete('/api/collaboration/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { hostUserId } = req.body;

    const session = collaborationService.getSessionInfo(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.hostUserId !== hostUserId) {
      return res.status(403).json({ error: 'Only host can end session' });
    }

    const success = await collaborationService.endSession(sessionId);
    res.json({ success });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Update participant role
router.patch('/api/collaboration/sessions/:sessionId/participants/:userId', async (req, res) => {
  try {
    const { sessionId, userId } = req.params;
    const { newRole, requesterId } = req.body;

    const session = collaborationService.getSessionInfo(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.hostUserId !== requesterId) {
      return res.status(403).json({ error: 'Only host can change participant roles' });
    }

    const success = await collaborationService.updateParticipantRole(
      sessionId,
      userId,
      newRole
    );

    res.json({ success });
  } catch (error) {
    console.error('Update participant role error:', error);
    res.status(500).json({ error: 'Failed to update participant role' });
  }
});

// Get active sessions
router.get('/api/collaboration/sessions', async (req, res) => {
  try {
    const sessions = collaborationService.getActiveSessions();
    
    const sessionData = sessions.map(session => ({
      sessionId: session.sessionId,
      projectId: session.projectId,
      hostUserId: session.hostUserId,
      participantCount: session.participants.size,
      lastActivity: session.lastActivity
    }));

    res.json(sessionData);
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({ error: 'Failed to get active sessions' });
  }
});

export default router;
