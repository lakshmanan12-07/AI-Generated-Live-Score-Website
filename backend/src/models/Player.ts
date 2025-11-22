
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPlayer extends Document {
  name: string;
  team: Types.ObjectId;
  role: string;
  battingStyle?: string;
  bowlingStyle?: string;
}

const PlayerSchema = new Schema<IPlayer>(
  {
    name: { type: String, required: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    role: { type: String, required: true },
    battingStyle: { type: String },
    bowlingStyle: { type: String }
  },
  { timestamps: true }
);

export const Player = mongoose.model<IPlayer>('Player', PlayerSchema);
