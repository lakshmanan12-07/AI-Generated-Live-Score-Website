
import { Request, Response } from 'express';
import { Player } from '../models/Player';
import { Ball } from '../models/Ball';
import { Match } from '../models/Match';
import { calcAverage, calcEconomy, calcStrikeRate } from '../utils/stats';

export async function createPlayer(req: Request, res: Response) {
  const { name, team, role, battingStyle, bowlingStyle } = req.body;
  const player = await Player.create({ name, team, role, battingStyle, bowlingStyle });
  res.status(201).json(player);
}

export async function getPlayers(_req: Request, res: Response) {
  const players = await Player.find().populate('team');
  res.json(players);
}

export async function updatePlayer(req: Request, res: Response) {
  const { id } = req.params;
  const { name, team, role, battingStyle, bowlingStyle } = req.body;

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (team !== undefined) updates.team = team;
  if (role !== undefined) updates.role = role;
  if (battingStyle !== undefined) updates.battingStyle = battingStyle;
  if (bowlingStyle !== undefined) updates.bowlingStyle = bowlingStyle;

  const player = await Player.findById(id);
  if (!player) {
    return res.status(404).json({ message: 'Player not found' });
  }

  Object.assign(player, updates);
  await player.save();

  const populated = await Player.findById(player._id).populate('team');
  res.json(populated);
}

export async function deletePlayer(req: Request, res: Response) {
  const { id } = req.params;
  const player = await Player.findById(id);
  if (!player) {
    return res.status(404).json({ message: 'Player not found' });
  }

  await player.deleteOne();
  res.json({ success: true });
}

export async function getPlayerWithStats(req: Request, res: Response) {
  const { id } = req.params;
  const player = await Player.findById(id).populate('team');
  if (!player) return res.status(404).json({ message: 'Player not found' });

  const battingBalls = await Ball.find({ batsman: id });
  const bowlingBalls = await Ball.find({ bowler: id });

  const matchesPlayedIds = new Set<string>();
  battingBalls.forEach((b) => matchesPlayedIds.add(b.match.toString()));
  bowlingBalls.forEach((b) => matchesPlayedIds.add(b.match.toString()));

  const matchesPlayed = matchesPlayedIds.size;

  let totalRuns = 0;
  let ballsFaced = 0;
  let dismissals = 0;
  let fifties = 0;
  let hundreds = 0;
  let ducks = 0;

  battingBalls.forEach((b) => {
    totalRuns += b.runs;
    ballsFaced += 1;
    if (b.isWicket && b.dismissedBatsman?.toString() === id) {
      dismissals += 1;
      if (b.runs === 0) ducks += 1;
    }
  });

  // Per-innings tally for 50/100
  const inningsScores: Record<string, number> = {};
  battingBalls.forEach((b) => {
    const key = b.innings.toString();
    inningsScores[key] = (inningsScores[key] || 0) + b.runs;
  });
  Object.values(inningsScores).forEach((score) => {
    if (score >= 100) hundreds += 1;
    else if (score >= 50) fifties += 1;
  });

  const battingAverage = calcAverage(totalRuns, dismissals);
  const strikeRate = calcStrikeRate(totalRuns, ballsFaced);

  // Bowling stats
  let wickets = 0;
  let runsConceded = 0;
  let ballsBowled = 0;
  let bestWickets = 0;
  let bestRuns = 0;

  const inningsBowling: Record<string, { runs: number; wickets: number }> = {};

  bowlingBalls.forEach((b) => {
    runsConceded += b.runs;
    ballsBowled += 1;
    if (b.isWicket) {
      wickets += 1;
    }
    const key = b.innings.toString();
    if (!inningsBowling[key]) inningsBowling[key] = { runs: 0, wickets: 0 };
    inningsBowling[key].runs += b.runs;
    if (b.isWicket) inningsBowling[key].wickets += 1;
  });

  Object.values(inningsBowling).forEach((v) => {
    if (v.wickets > bestWickets || (v.wickets === bestWickets && v.runs < bestRuns)) {
      bestWickets = v.wickets;
      bestRuns = v.runs;
    }
  });

  const economyRate = calcEconomy(runsConceded, ballsBowled);

  // Over-wise batting performance (runs per over)
  const overWiseBatting: Record<string, { overNumber: number; runs: number; boundaries: number }> = {};
  battingBalls.forEach((b) => {
    const key = `${b.innings}-${b.overNumber}`;
    if (!overWiseBatting[key]) overWiseBatting[key] = { overNumber: b.overNumber, runs: 0, boundaries: 0 };
    overWiseBatting[key].runs += b.runs;
    if (b.runs === 4 || b.runs === 6) overWiseBatting[key].boundaries += 1;
  });

  res.json({
    player,
    stats: {
      matchesPlayed,
      totalRuns,
      ballsFaced,
      battingAverage,
      strikeRate,
      fifties,
      hundreds,
      ducks,
      totalWickets: wickets,
      bestBowling: `${bestWickets}/${bestRuns}`,
      economyRate,
      bowlingBalls,
      runsConceded,
      overWiseBatting: Object.values(overWiseBatting)
    }
  });
}
