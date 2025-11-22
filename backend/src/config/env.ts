
import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 4000;
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cric_live';
export const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
