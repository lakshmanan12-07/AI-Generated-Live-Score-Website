
import { Request, Response } from 'express';
import { Ball } from '../models/Ball';
import { Player } from '../models/Player';
import { Team } from '../models/Team';
import { Match } from '../models/Match';
import { calcAverage, calcEconomy, calcStrikeRate } from '../utils/stats';

export async function getBattingStats(_req: Request, res: Response) {
  const agg = await Ball.aggregate([
    {
      $group: {
        _id: '$batsman',
        runs: { $sum: '$runs' },
        balls: { $sum: 1 },
        dismissals: {
          $sum: {
            $cond: ['$isWicket', 1, 0]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'players',
        localField: '_id',
        foreignField: '_id',
        as: 'player'
      }
    },
    { $unwind: '$player' }
  ]);

  const stats = agg.map((b) => {
    const strikeRate = calcStrikeRate(b.runs, b.balls);
    const average = calcAverage(b.runs, b.dismissals);
    return {
      playerId: b.player._id,
      playerName: b.player.name,
      team: b.player.team,
      runs: b.runs,
      balls: b.balls,
      strikeRate,
      average
    };
  });

  stats.sort((a, b) => b.runs - a.runs);

  res.json(stats);
}

export async function getBowlingStats(_req: Request, res: Response) {
  const agg = await Ball.aggregate([
    {
      $group: {
        _id: '$bowler',
        runsConceded: { $sum: '$runs' },
        balls: { $sum: 1 },
        wickets: {
          $sum: {
            $cond: ['$isWicket', 1, 0]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'players',
        localField: '_id',
        foreignField: '_id',
        as: 'player'
      }
    },
    { $unwind: '$player' }
  ]);

  const stats = agg.map((b) => {
    const economy = calcEconomy(b.runsConceded, b.balls);
    return {
      playerId: b.player._id,
      playerName: b.player.name,
      team: b.player.team,
      runsConceded: b.runsConceded,
      balls: b.balls,
      wickets: b.wickets,
      economy
    };
  });

  stats.sort((a, b) => b.wickets - a.wickets);

  res.json(stats);
}

export async function getTeamStandings(_req: Request, res: Response) {
  const teams = await Team.find();
  const matches = await Match.find({ status: 'COMPLETED' });

  const standings: any[] = teams.map((t) => {
    const playedMatches = matches.filter((m) => m.teamA.equals(t._id) || m.teamB.equals(t._id));
    const total = playedMatches.length;
    const wins = playedMatches.filter((m) => m.resultSummary && m.resultSummary.includes(t.shortCode)).length;
    const losses = playedMatches.filter(
      (m) => m.resultSummary && !m.resultSummary.includes(t.shortCode)
    ).length;
    const winPct = total ? parseFloat(((wins / total) * 100).toFixed(2)) : 0;
    const points = wins * 2;

    return {
      teamId: t._id,
      name: t.name,
      shortCode: t.shortCode,
      totalMatches: total,
      wins,
      losses,
      winPct,
      points
    };
  });

  standings.sort((a, b) => b.points - a.points || b.winPct - a.winPct);

  res.json(standings);
}
