import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Register a new hardware-bound public key for the current user
router.post('/register-device', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { deviceName, publicKey, hardwareSignature } = req.body;
    
    if (!deviceName || !publicKey) {
      res.status(400).json({ error: 'deviceName and publicKey are required' });
      return;
    }

    const userId = req.user!.userId;

    const deviceKey = await prisma.deviceKey.create({
      data: {
        userId,
        deviceName,
        publicKey,
        hardwareSignature: hardwareSignature || null,
      }
    });

    res.status(201).json({ message: 'Device key registered', deviceId: deviceKey.id });
  } catch (error) {
    console.error('Device Registration Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch active public keys for a given recipient (by email)
router.get('/keys/:email', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const targetEmail = req.params.email as string;

    const targetUser = await prisma.user.findUnique({
      where: { email: targetEmail }
    });

    if (!targetUser) {
      res.status(404).json({ error: 'Recipient not found' });
      return;
    }

    const deviceKeys = await prisma.deviceKey.findMany({
      where: { userId: targetUser.id, isActive: true },
      select: { id: true, deviceName: true, publicKey: true, createdAt: true }
    });

    if (deviceKeys.length === 0) {
      res.status(404).json({ error: 'Recipient has no active devices registered' });
      return;
    }

    res.status(200).json({ keys: deviceKeys });
  } catch (error) {
    console.error('Fetch Keys Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
