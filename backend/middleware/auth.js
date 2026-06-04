import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { db } from '../db.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_cute_and_secure_jwt_secret_key_12345';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user exists in database
    const user = await db.users.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found or token invalid.' });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
};
