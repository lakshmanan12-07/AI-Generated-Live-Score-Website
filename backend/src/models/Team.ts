
import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  shortCode: string;
  logoUrl?: string;
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true },
    shortCode: { type: String, required: true, unique: true },
    logoUrl: { type: String }
  },
  { timestamps: true }
);

export const Team = mongoose.model<ITeam>('Team', TeamSchema);
