import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import pkiRoutes from './routes/pki';
import auditRoutes from './routes/audit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'CipherVault Backend Enclave' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pki', pkiRoutes);
app.use('/api/audit', auditRoutes);

app.listen(PORT, () => {
  console.log(`CipherVault Backend Engine active on port ${PORT}`);
  console.log(`Master Enclave endpoints initialized.`);
});
