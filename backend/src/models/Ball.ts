
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBall extends Document {
  match: Types.ObjectId;
  innings: Types.ObjectId;
  overNumber: number;
  ballInOver: number;
  batsman: Types.ObjectId;
  bowler: Types.ObjectId;
  runs: number;
  isWide: boolean;
  isNoBall: boolean;
  isWicket: boolean;
  dismissalType?: string;
  dismissedBatsman?: Types.ObjectId;
  timestamp: Date;
}

const BallSchema = new Schema<IBall>(
  {
    match: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    innings: { type: Schema.Types.ObjectId, ref: 'Innings', required: true },
    overNumber: { type: Number, required: true },
    ballInOver: { type: Number, required: true },
    batsman: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    bowler: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    runs: { type: Number, default: 0 },
    isWide: { type: Boolean, default: false },
    isNoBall: { type: Boolean, default: false },
    isWicket: { type: Boolean, default: false },
    dismissalType: { type: String },
    dismissedBatsman: { type: Schema.Types.ObjectId, ref: 'Player' },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const Ball = mongoose.model<IBall>('Ball', BallSchema);
