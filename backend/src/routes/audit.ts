import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

// Receives telemetry from a .cvault file right before it self-corrupts
router.post('/kill-event', async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventType, payload } = req.body;
    
    // Minimal validation to prevent spam, in a real app this would require
    // some form of client attestation or a one-time token embedded in the .cvault
    if (!eventType || !payload) {
      res.status(400).json({ error: 'eventType and payload are required' });
      return;
    }

    await prisma.auditLog.create({
      data: {
        eventType,
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload)
      }
    });

    res.status(201).json({ message: 'Audit event logged successfully' });
  } catch (error) {
    console.error('Audit Log Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// A protected route to view audit logs (for administrators or the owner)
// In a full implementation, this should check for admin roles or owner matching
router.get('/logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    res.status(200).json({ logs });
  } catch (error) {
    console.error('Fetch Logs Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
