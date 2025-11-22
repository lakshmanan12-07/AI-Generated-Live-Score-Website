
import mongoose, { Schema, Document, Types } from 'mongoose';

export type MatchStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED';

export interface IMatch extends Document {
  series?: Types.ObjectId;
  teamA: Types.ObjectId;
  teamB: Types.ObjectId;
  matchType: string;
  venue: string;
  startDateTime: Date;
  status: MatchStatus;
  tossWinner?: Types.ObjectId;
  tossDecision?: 'BAT' | 'BOWL';
  currentInnings?: Types.ObjectId;
  resultSummary?: string;
  winner?: Types.ObjectId;
  maxOvers?: number;
  targetInningsCount: number;
}

const MatchSchema = new Schema<IMatch>(
  {
    series: { type: Schema.Types.ObjectId, ref: 'Series' },
    teamA: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    teamB: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    matchType: { type: String, required: true },
    venue: { type: String, required: true },
    startDateTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['UPCOMING', 'LIVE', 'COMPLETED', 'ABANDONED'],
      default: 'UPCOMING'
    },
    tossWinner: { type: Schema.Types.ObjectId, ref: 'Team' },
    tossDecision: { type: String, enum: ['BAT', 'BOWL'] },
    currentInnings: { type: Schema.Types.ObjectId, ref: 'Innings' },
    resultSummary: { type: String },
    winner: { type: Schema.Types.ObjectId, ref: 'Team' },
    maxOvers: { type: Number },
    targetInningsCount: { type: Number, default: 2 },
  },
  { timestamps: true }
);

export const Match = mongoose.model<IMatch>('Match', MatchSchema);
