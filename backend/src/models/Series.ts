
import mongoose, { Schema, Document } from 'mongoose';

export interface ISeries extends Document {
  name: string;
  startDate?: Date;
  endDate?: Date;
  description?: string;
}

const SeriesSchema = new Schema<ISeries>(
  {
    name: { type: String, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String }
  },
  { timestamps: true }
);

export const Series = mongoose.model<ISeries>('Series', SeriesSchema);
