
import { Request, Response } from 'express';
import { Series } from '../models/Series';

export async function createSeries(req: Request, res: Response) {
  const { name, startDate, endDate, description } = req.body;
  const series = await Series.create({ name, startDate, endDate, description });
  res.status(201).json(series);
}

export async function getSeries(_req: Request, res: Response) {
  const list = await Series.find().sort({ startDate: -1 });
  res.json(list);
}
