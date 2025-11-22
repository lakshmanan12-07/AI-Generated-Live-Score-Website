
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AdminUser } from '../models/AdminUser';
import { JWT_SECRET } from '../config/env';

export async function seedAdmin(_req: Request, res: Response) {
  const existing = await AdminUser.findOne({ email: 'admin@criclive.local' });
  if (existing) {
    return res.json({ message: 'Admin already exists', email: existing.email });
  }
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await AdminUser.create({ email: 'admin@criclive.local', passwordHash });
  return res.json({ message: 'Admin created', email: admin.email, password: 'admin123' });
}

export async function loginAdmin(req: Request, res: Response) {
  const { email, password } = req.body;
  const admin = await AdminUser.findOne({ email });
  if (!admin) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: admin._id, email: admin.email }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
}
