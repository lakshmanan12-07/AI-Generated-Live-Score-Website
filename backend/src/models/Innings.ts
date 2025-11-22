import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFallOfWicket {
  wicketNumber: number;
  dismissedBatsman: Types.ObjectId;
  scoreAtDismissal: number;
  over: number;
}

export interface IInnings extends Document {
  match: Types.ObjectId;
  battingTeam: Types.ObjectId;
  bowlingTeam: Types.ObjectId;

  runs: number;
  wickets: number;
  overs: number;
  runRate: number;

  fallOfWickets: IFallOfWicket[];

  // NEW FIELDS ↓↓↓
  currentStriker?: Types.ObjectId;
  currentNonStriker?: Types.ObjectId;
  currentBowler?: Types.ObjectId;

  isCompleted: boolean;
  isSuperOver: boolean;
}

const FallOfWicketSchema = new Schema<IFallOfWicket>(
  {
    wicketNumber: { type: Number, required: true },
    dismissedBatsman: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    scoreAtDismissal: { type: Number, required: true },
    over: { type: Number, required: true }
  },
  { _id: false }
);

const InningsSchema = new Schema<IInnings>(
  {
    match: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    battingTeam: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    bowlingTeam: { type: Schema.Types.ObjectId, ref: 'Team', required: true },

    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    runRate: { type: Number, default: 0 },

    fallOfWickets: { type: [FallOfWicketSchema], default: [] },

    // NEW FIELDS ↓↓↓
    currentStriker: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    currentNonStriker: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    currentBowler: { type: Schema.Types.ObjectId, ref: 'Player', default: null },

    isCompleted: { type: Boolean, default: false },
    isSuperOver: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Innings = mongoose.model<IInnings>('Innings', InningsSchema);
