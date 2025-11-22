
import { Request, Response } from 'express';
import { Team } from '../models/Team';
import { Match } from '../models/Match';
import { Innings } from '../models/Innings';
import { Player } from '../models/Player';
import { Ball } from '../models/Ball';
import { calcAverage, calcStrikeRate } from '../utils/stats';

export async function createTeam(req: Request, res: Response) {
  const { name, shortCode, logoUrl } = req.body;
  const team = await Team.create({ name, shortCode, logoUrl });
  res.status(201).json(team);
}

export async function getTeams(_req: Request, res: Response) {
  const teams = await Team.find().sort({ name: 1 });
  res.json(teams);
}

export async function getTeamWithStats(req: Request, res: Response) {
  const { id } = req.params;
  const team = await Team.findById(id);
  if (!team) return res.status(404).json({ message: 'Team not found' });

  const matches = await Match.find({
    $or: [{ teamA: id }, { teamB: id }]
  });

  const matchIds = matches.map((m) => m._id);

  const innings = await Innings.find({ match: { $in: matchIds }, battingTeam: id });

  const totalMatches = matches.length;
  const wins = matches.filter((m) => m.resultSummary && m.resultSummary.includes(team.shortCode)).length;
  const losses = matches.filter(
    (m) => m.resultSummary && !m.resultSummary.includes(team.shortCode) && m.status === 'COMPLETED'
  ).length;

  let totalRuns = 0;
  let highestTotal = 0;

  innings.forEach((inn) => {
    totalRuns += inn.runs;
    if (inn.runs > highestTotal) highestTotal = inn.runs;
  });

  const avgScore = innings.length ? parseFloat((totalRuns / innings.length).toFixed(2)) : 0;
  const winPct = totalMatches ? parseFloat(((wins / totalMatches) * 100).toFixed(2)) : 0;

  const players = await Player.find({ team: id });

  // Batting stats aggregation
  const playerIds = players.map((p) => p._id);
  const battingAgg = await Ball.aggregate([
    { $match: { batsman: { $in: playerIds } } },
    {
      $group: {
        _id: '$batsman',
        runs: { $sum: '$runs' },
        balls: { $sum: 1 },
        fifties: {
          $sum: {
            $cond: [{ $gte: ['$runs', 50] }, 1, 0]
          }
        },
        hundreds: {
          $sum: {
            $cond: [{ $gte: ['$runs', 100] }, 1, 0]
          }
        }
      }
    }
  ]);

  const battingByPlayer: any = {};
  battingAgg.forEach((b) => {
    battingByPlayer[b._id.toString()] = b;
  });

  // Bowling stats aggregation
  const bowlingAgg = await Ball.aggregate([
    { $match: { bowler: { $in: playerIds } } },
    {
      $group: {
        _id: '$bowler',
        runsConceded: { $sum: '$runs' },
        wickets: {
          $sum: {
            $cond: ['$isWicket', 1, 0]
          }
        },
        balls: { $sum: 1 }
      }
    }
  ]);
  const bowlingByPlayer: any = {};
  bowlingAgg.forEach((b) => {
    bowlingByPlayer[b._id.toString()] = b;
  });

  const enrichedPlayers = players.map((p) => {
    const bat = battingByPlayer[p._id.toString()] || { runs: 0, balls: 0, fifties: 0, hundreds: 0 };
    const bowl = bowlingByPlayer[p._id.toString()] || { wickets: 0, runsConceded: 0, balls: 0 };
    return {
      player: p,
      batting: {
        runs: bat.runs,
        balls: bat.balls,
        strikeRate: calcStrikeRate(bat.runs, bat.balls),
        fifties: bat.fifties,
        hundreds: bat.hundreds
      },
      bowling: {
        wickets: bowl.wickets,
        runsConceded: bowl.runsConceded,
        balls: bowl.balls
      }
    };
  });

  const topBatsmen = [...enrichedPlayers]
    .sort((a, b) => b.batting.runs - a.batting.runs)
    .slice(0, 5);
  const topBowlers = [...enrichedPlayers]
    .sort((a, b) => b.bowling.wickets - a.bowling.wickets)
    .slice(0, 5);

  res.json({
    team,
    stats: {
      totalMatches,
      wins,
      losses,
      winPct,
      totalRuns,
      highestTotal,
      avgScore,
      topBatsmen,
      topBowlers
    }
  });
}
