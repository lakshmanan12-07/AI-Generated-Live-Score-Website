import { Request, Response } from 'express';
import { Match } from '../models/Match';
import { Innings } from '../models/Innings';
import { Ball } from '../models/Ball';
import { Series } from '../models/Series';
import { Team } from '../models/Team';
import { Player } from '../models/Player';
// If you have a socket event helper, uncomment and fix the path:
// import { emitMatchEvent } from '../sockets/events';

// Helper: strike rate
function calcStrikeRate(runs: number, balls: number): number {
  if (!balls) return 0;
  return +(runs * 100 / balls).toFixed(2);
}

// Helper: economy
function calcEconomy(runsConceded: number, balls: number): number {
  if (!balls) return 0;
  const overs = balls / 6;
  if (!overs) return 0;
  return +(runsConceded / overs).toFixed(2);
}

type CompletionResolution = 'AUTO' | 'MANUAL' | 'FORCE_TIE';

function teamId(value: any): string {
  if (!value) return '';
  return value._id ? value._id.toString() : value.toString();
}

function getTeamDoc(match: any, id: string) {
  const teamAId = teamId(match.teamA);
  return teamAId === id ? match.teamA : match.teamB;
}

function formatResultSuffix(isSuperOver: boolean) {
  return isSuperOver ? ' (Super Over)' : '';
}

/**
 * Create a new match
 */
export async function createMatch(req: Request, res: Response) {
  try {
    const {
      series,
      teamA,
      teamB,
      matchType,
      venue,
      startDateTime,
    } = req.body;

    const match = await Match.create({
      series: series || undefined,
      teamA,
      teamB,
      matchType,
      venue,
      startDateTime,
      status: 'UPCOMING',
      targetInningsCount: 2,
    });

    const populated = await Match.findById(match._id)
      .populate('teamA teamB series')
      .lean();

    res.status(201).json(populated);
  } catch (err: any) {
    console.error('createMatch error', err);
    res.status(500).json({ message: 'Failed to create match' });
  }
}

/**
 * List matches (optionally filter by status)
 */
export async function getMatches(req: Request, res: Response) {
  try {
    const { status } = req.query;

    const filter: any = {};
    if (status && typeof status === 'string') {
      filter.status = status.toUpperCase();
    }

    const matches = await Match.find(filter)
      .populate('teamA teamB series winner')
      .sort({ startDateTime: -1 })
      .lean();

    res.json(matches);
  } catch (err: any) {
    console.error('getMatches error', err);
    res.status(500).json({ message: 'Failed to fetch matches' });
  }
}

/**
 * Match detail: match + innings + scorecards
 */
export async function getMatchDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const match = await Match.findById(id)
      .populate('teamA teamB series currentInnings tossWinner winner')
      .lean();

    if (!match) return res.status(404).json({ message: 'Match not found' });

    const innings = await Innings.find({ match: id })
      .populate('battingTeam bowlingTeam')
      .lean();

    const balls = await Ball.find({ match: id })
      .populate('batsman bowler dismissedBatsman')
      .lean();

    // Build scorecards per innings
    const scorecards: any[] = innings.map((inn) => {
      const innBalls = balls.filter(
        (b) => b.innings.toString() === inn._id.toString()
      );

      const battingMap: Record<string, any> = {};
      const bowlingMap: Record<string, any> = {};

      innBalls.forEach((b) => {
        // Batting
        const batId = b.batsman?._id?.toString();
        if (batId) {
          if (!battingMap[batId]) {
            battingMap[batId] = {
              player: b.batsman,
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              isOut: false,
              dismissalType: undefined,
            };
          }
          battingMap[batId].runs += b.runs;
          // count all balls faced except wides
          if (!b.isWide) battingMap[batId].balls += 1;
          if (b.runs === 4) battingMap[batId].fours += 1;
          if (b.runs === 6) battingMap[batId].sixes += 1;
          if (
            b.isWicket &&
            b.dismissedBatsman &&
            b.dismissedBatsman._id.toString() === batId
          ) {
            battingMap[batId].isOut = true;
            battingMap[batId].dismissalType = b.dismissalType;
          }
        }

        // Bowling
        const bowlId = b.bowler?._id?.toString();
        if (bowlId) {
          if (!bowlingMap[bowlId]) {
            bowlingMap[bowlId] = {
              player: b.bowler,
              runsConceded: 0,
              balls: 0,
              wickets: 0,
            };
          }
          bowlingMap[bowlId].runsConceded += b.runs + (b.isWide ? 1 : 0) + (b.isNoBall ? 1 : 0);
          if (!b.isWide && !b.isNoBall) bowlingMap[bowlId].balls += 1;
          if (b.isWicket) bowlingMap[bowlId].wickets += 1;
        }
      });

      const batting = Object.values(battingMap).map((s: any) => ({
        ...s,
        strikeRate: calcStrikeRate(s.runs, s.balls),
      }));

      const bowling = Object.values(bowlingMap).map((s: any) => ({
        ...s,
        overs: (s.balls / 6).toFixed(1),
        economy: calcEconomy(s.runsConceded, s.balls),
      }));

      // Over-wise summary
      const oversSummaryMap: Record<number, any> = {};
      innBalls.forEach((b) => {
        const key = b.overNumber;
        if (!oversSummaryMap[key]) {
          oversSummaryMap[key] = {
            overNumber: b.overNumber,
            bowler: b.bowler,
            runs: 0,
            wickets: 0,
            balls: [] as any[],
          };
        }
        oversSummaryMap[key].runs += b.runs + (b.isWide ? 1 : 0) + (b.isNoBall ? 1 : 0);
        if (b.isWicket) oversSummaryMap[key].wickets += 1;
        oversSummaryMap[key].balls.push({
          ballInOver: b.ballInOver,
          runs: b.runs,
          isWicket: b.isWicket,
          dismissalType: b.dismissalType,
          isWide: b.isWide,
          isNoBall: b.isNoBall,
        });
      });

      const oversSummary = Object.values(oversSummaryMap).sort(
        (a: any, b: any) => a.overNumber - b.overNumber
      );

      return {
        innings: inn,
        batting,
        bowling,
        oversSummary,
      };
    });

    res.json({
      match,
      innings,
      scorecards,
    });
  } catch (err: any) {
    console.error('getMatchDetail error', err);
    res.status(500).json({ message: 'Failed to fetch match detail' });
  }
}

/**
 * Set toss winner, decision, and (optional) maxOvers
 */
export async function setToss(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { tossWinner, tossDecision, maxOvers } = req.body;

    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    match.tossWinner = tossWinner;
    match.tossDecision = tossDecision;
    if (maxOvers) match.maxOvers = maxOvers;

    await match.save();

    const populated = await Match.findById(id)
      .populate('teamA teamB tossWinner')
      .lean();

    res.json(populated);
  } catch (err: any) {
    console.error('setToss error', err);
    res.status(500).json({ message: 'Failed to set toss' });
  }
}

/**
 * Create a new innings (used by admin "start innings" & "start next innings")
 */
export async function createInnings(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { battingTeam, bowlingTeam, isSuperOver } = req.body;

    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    const innings = await Innings.create({
      match: id,
      battingTeam,
      bowlingTeam,
      runs: 0,
      wickets: 0,
      overs: 0,
      runRate: 0,
      fallOfWickets: [],
      isSuperOver: !!isSuperOver,
    });

    match.currentInnings = innings._id;
    match.status = 'LIVE';
    match.currentInnings = innings._id;
    await match.save();

    res.status(201).json(innings);
  } catch (err: any) {
    console.error('createInnings error', err);
    res.status(500).json({ message: 'Failed to create innings' });
  }
}

/**
 * Record a ball with validations:
 * - Cannot use a batsman who is already out in this innings
 * - Cannot have batsman == bowler
 * - Automatically calculates overNumber & ballInOver
 * - Updates innings totals and fall of wickets
 */
export async function recordBall(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      inningsId,
      batsman,
      bowler,
      runs,
      isWide,
      isNoBall,
      isWicket,
      dismissalType,
      dismissedBatsman,
    } = req.body;

    const innings = await Innings.findById(inningsId);
    if (!innings) {
      return res.status(404).json({ message: 'Innings not found' });
    }

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // ❌ validation: batsman != bowler
    if (batsman && bowler && batsman.toString() === bowler.toString()) {
      return res
        .status(400)
        .json({ message: 'Batsman and bowler cannot be the same player.' });
    }

    // ❌ validation: batsman not already out in this innings
    const wicketBalls = await Ball.find({
      innings: inningsId,
      isWicket: true,
    }).lean();

    const outIdsFromBalls = wicketBalls
      .map((b) => (b.dismissedBatsman ? b.dismissedBatsman.toString() : null))
      .filter(Boolean) as string[];

    const outIdsFromFoW =
      (innings.fallOfWickets || []).map((f: any) =>
        f.dismissedBatsman?.toString()
      ) || [];

    const alreadyOutSet = new Set<string>([
      ...outIdsFromBalls,
      ...outIdsFromFoW,
    ]);

    if (batsman && alreadyOutSet.has(batsman.toString())) {
      return res
        .status(400)
        .json({ message: 'This batsman is already out in this innings.' });
    }

    // Determine overNumber / ballInOver based on *legal* balls
    const allBalls = await Ball.find({ innings: inningsId }).sort({
      createdAt: 1,
    });

    let legalBallsSoFar = 0;
    allBalls.forEach((b) => {
      if (!b.isWide && !b.isNoBall) {
        legalBallsSoFar += 1;
      }
    });

    const overNumber = Math.floor(legalBallsSoFar / 6) + 1;
    const ballInOver = (legalBallsSoFar % 6) + 1;

    const ball = await Ball.create({
      match: id,
      innings: inningsId,
      overNumber,
      ballInOver,
      batsman,
      bowler,
      runs,
      isWide: !!isWide,
      isNoBall: !!isNoBall,
      isWicket: !!isWicket,
      dismissalType,
      dismissedBatsman,
    });

    // Recompute innings totals
    const updatedBalls = await Ball.find({ innings: inningsId }).lean();
    let totalRuns = 0;
    let wickets = 0;
    let legalBalls = 0;

    updatedBalls.forEach((b) => {
      totalRuns += b.runs + (b.isWide ? 1 : 0) + (b.isNoBall ? 1 : 0);
      if (b.isWicket) wickets += 1;
      if (!b.isWide && !b.isNoBall) legalBalls += 1;
    });

    const overs = legalBalls / 6;
    const runRate = overs ? totalRuns / overs : 0;

    innings.runs = totalRuns;
    innings.wickets = wickets;
    innings.overs = overs;
    innings.runRate = runRate;

    // Maintain fall of wickets
    if (isWicket && dismissedBatsman) {
      const fallCount = (innings.fallOfWickets || []).length;
      const fowEntry: any = {
        wicketNumber: fallCount + 1,
        dismissedBatsman,
        scoreAtDismissal: totalRuns,
        over: overNumber,
      };
      if (!innings.fallOfWickets) {
        (innings as any).fallOfWickets = [fowEntry];
      } else {
        (innings as any).fallOfWickets.push(fowEntry);
      }
    }

    await innings.save();

    // Optional: emit socket events if you have such helper
    // emitMatchEvent(id, 'scoreUpdated', { matchId: id, innings });

    res.status(201).json({ ball, innings });
  } catch (err: any) {
    console.error('recordBall error', err);
    res.status(500).json({ message: 'Failed to record ball' });
  }
}

/**
 * Explicit endpoint to mark a match as COMPLETED.
 * Used by admin "End match" button after 2nd innings.
 */
export async function completeMatch(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { resolution = 'AUTO', manualWinnerId } = (req.body || {}) as {
      resolution?: CompletionResolution;
      manualWinnerId?: string;
    };

    const match = await Match.findById(id).populate('teamA teamB winner');
    if (!match) return res.status(404).json({ message: 'Match not found' });

    const innings = await Innings.find({ match: id }).sort({ createdAt: 1 }).lean();
    const targetInnings = match.targetInningsCount || 2;
    if (innings.length < targetInnings) {
      return res.status(400).json({ message: 'Required innings are not completed yet' });
    }

    const [firstInnings, secondInnings] = innings.slice(-2);
    const firstRuns = firstInnings.runs;
    const secondRuns = secondInnings.runs;
    const isSuperOver = !!(firstInnings.isSuperOver || secondInnings.isSuperOver);

    const mapWinnerDoc = (idValue: string) => getTeamDoc(match, idValue);

    const finalize = async (winnerDoc: any | null, summary: string) => {
      const update = await Match.findByIdAndUpdate(
        id,
        {
          status: 'COMPLETED',
          resultSummary: summary,
          winner: winnerDoc ? winnerDoc._id : undefined,
          currentInnings: undefined,
        },
        { new: true }
      ).populate('teamA teamB winner');

      res.json({
        status: update?.status,
        resultSummary: update?.resultSummary,
        winner: update?.winner,
      });
    };

    if (resolution === 'AUTO') {
      if (firstRuns > secondRuns) {
        const winnerId = firstInnings.battingTeam.toString();
        const winnerDoc = mapWinnerDoc(winnerId);
        const margin = firstRuns - secondRuns;
        const summary = `${winnerDoc.name} won by ${margin} runs${formatResultSuffix(isSuperOver)}`;
        return finalize(winnerDoc, summary);
      }

      if (secondRuns > firstRuns) {
        const winnerId = secondInnings.battingTeam.toString();
        const winnerDoc = mapWinnerDoc(winnerId);
        const wicketsLeft = Math.max(1, 10 - (secondInnings.wickets || 0));
        const summary = `${winnerDoc.name} won by ${wicketsLeft} wickets${formatResultSuffix(isSuperOver)}`;
        return finalize(winnerDoc, summary);
      }

      return res.json({
        needsResolution: true,
        message: 'Match tied',
        isSuperOver,
      });
    }

    if (resolution === 'MANUAL') {
      if (!manualWinnerId) {
        return res.status(400).json({ message: 'manualWinnerId is required' });
      }
      const winnerId = manualWinnerId.toString();
      const allowed = [teamId(match.teamA), teamId(match.teamB)];
      if (!allowed.includes(winnerId)) {
        return res.status(400).json({ message: 'Winner must be one of the playing teams' });
      }
      const winnerDoc = mapWinnerDoc(winnerId);
      const summary = `${winnerDoc.name} won${formatResultSuffix(isSuperOver)}`;
      return finalize(winnerDoc, summary);
    }

    if (resolution === 'FORCE_TIE') {
      const suffix = isSuperOver ? ' (Super Over tied)' : '';
      return finalize(null, `Match tied${suffix}`);
    }

    return res.status(400).json({ message: 'Unsupported resolution mode' });
  } catch (err: any) {
    console.error('completeMatch error', err);
    res.status(500).json({ message: 'Failed to complete match' });
  }
}


export async function updatePair(req: Request, res: Response) {
  const { id } = req.params;
  const { inningsId, striker, nonStriker, bowler } = req.body;

  try {
    const innings = await Innings.findById(inningsId);
    if (!innings) return res.status(404).json({ message: "Innings not found" });

    innings.currentStriker = striker;
    innings.currentNonStriker = nonStriker;
    innings.currentBowler = bowler;

    await innings.save();

    res.json({ success: true, innings });
  } catch (error: any) {
    console.error("updatePair error:", error);
    res.status(500).json({ message: "Failed to update pair" });
  }
}

export async function updateMatch(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    if (match.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Completed matches cannot be edited' });
    }

    const { series, teamA, teamB, matchType, venue, startDateTime } = req.body;

    if (series !== undefined) match.series = series || undefined;
    if (teamA !== undefined) match.teamA = teamA;
    if (teamB !== undefined) match.teamB = teamB;
    if (matchType !== undefined) match.matchType = matchType;
    if (venue !== undefined) match.venue = venue;
    if (startDateTime) match.startDateTime = new Date(startDateTime);

    await match.save();

    const populated = await Match.findById(id).populate('teamA teamB series winner');
    res.json(populated);
  } catch (err: any) {
    console.error('updateMatch error', err);
    res.status(500).json({ message: 'Failed to update match' });
  }
}

export async function deleteMatch(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    if (match.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Completed matches cannot be deleted' });
    }

    await Ball.deleteMany({ match: id });
    await Innings.deleteMany({ match: id });
    await Match.findByIdAndDelete(id);

    res.json({ success: true });
  } catch (err: any) {
    console.error('deleteMatch error', err);
    res.status(500).json({ message: 'Failed to delete match' });
  }
}

export async function startSuperOver(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { battingTeam } = req.body;

    if (!battingTeam) {
      return res.status(400).json({ message: 'battingTeam is required' });
    }

    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    const battingTeamStr = battingTeam.toString();
    const teamAId = teamId(match.teamA);
    const teamBId = teamId(match.teamB);

    if (![teamAId, teamBId].includes(battingTeamStr)) {
      return res.status(400).json({ message: 'Invalid team for super over' });
    }

    const innings = await Innings.find({ match: id });
    if (innings.length < (match.targetInningsCount || 2)) {
      return res.status(400).json({ message: 'Current innings pair is still in progress' });
    }

    match.targetInningsCount = (match.targetInningsCount || 2) + 2;

    const bowlingTeam =
      battingTeamStr === teamAId ? match.teamB : match.teamA;

    const newInnings = await Innings.create({
      match: id,
      battingTeam,
      bowlingTeam,
      runs: 0,
      wickets: 0,
      overs: 0,
      runRate: 0,
      fallOfWickets: [],
      isSuperOver: true,
    });

    match.currentInnings = newInnings._id;
    match.status = 'LIVE';
    match.resultSummary = undefined;
    match.winner = undefined;
    await match.save();

    res.status(201).json(newInnings);
  } catch (err: any) {
    console.error('startSuperOver error', err);
    res.status(500).json({ message: 'Failed to start super over' });
  }
}

/**
 * Skip innings: Manually set total runs and wickets, then end the innings
 */
export async function skipInnings(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { inningsId, totalRuns, totalWickets } = req.body;

    if (!inningsId || totalRuns === undefined || totalWickets === undefined) {
      return res.status(400).json({ message: 'inningsId, totalRuns, and totalWickets are required' });
    }

    const match = await Match.findById(id).populate('teamA teamB');
    if (!match) return res.status(404).json({ message: 'Match not found' });

    const innings = await Innings.findById(inningsId);
    if (!innings) return res.status(404).json({ message: 'Innings not found' });

    if (innings.match.toString() !== id) {
      return res.status(400).json({ message: 'Innings does not belong to this match' });
    }

    // Update innings with provided totals
    innings.runs = totalRuns;
    innings.wickets = totalWickets;
    // Set overs to maxOvers or default to 20
    innings.overs = match.maxOvers || 20;
    innings.runRate = innings.overs > 0 ? totalRuns / innings.overs : 0;
    innings.isCompleted = true;
    await innings.save();

    // Move to next innings or complete match
    const inningsList = await Innings.find({ match: id }).sort({ createdAt: 1 });
    const targetInnings = match.targetInningsCount || 2;
    const completedInnings = inningsList.filter((inn: any) => inn.isCompleted).length;

    if (completedInnings < targetInnings) {
      // Start next innings
      const battingTeamId = innings.bowlingTeam;
      const bowlingTeamId = innings.battingTeam;

      const newInnings = await Innings.create({
        match: id,
        battingTeam: battingTeamId,
        bowlingTeam: bowlingTeamId,
        runs: 0,
        wickets: 0,
        overs: 0,
        runRate: 0,
        fallOfWickets: [],
        isSuperOver: false,
      });

      match.currentInnings = newInnings._id;
      match.status = 'LIVE';
      await match.save();

      res.json({ innings: newInnings, message: 'Innings skipped, next innings started' });
    } else {
      // All innings completed - mark match as COMPLETED
      match.currentInnings = undefined;
      match.status = 'COMPLETED';
      
      // Try to determine winner automatically
      const regularInnings = inningsList.filter((inn: any) => !inn.isSuperOver);
      if (regularInnings.length >= 2) {
        const [firstInnings, secondInnings] = regularInnings.slice(-2);
        const firstRuns = firstInnings.runs;
        const secondRuns = secondInnings.runs;
        const isSuperOver = !!(firstInnings.isSuperOver || secondInnings.isSuperOver);

        if (firstRuns > secondRuns) {
          const winnerId = firstInnings.battingTeam.toString();
          const winnerDoc = getTeamDoc(match, winnerId);
          const margin = firstRuns - secondRuns;
          match.winner = winnerDoc._id;
          match.resultSummary = `${winnerDoc.name} won by ${margin} runs${formatResultSuffix(isSuperOver)}`;
        } else if (secondRuns > firstRuns) {
          const winnerId = secondInnings.battingTeam.toString();
          const winnerDoc = getTeamDoc(match, winnerId);
          const wicketsLeft = Math.max(1, 10 - (secondInnings.wickets || 0));
          match.winner = winnerDoc._id;
          match.resultSummary = `${winnerDoc.name} won by ${wicketsLeft} wickets${formatResultSuffix(isSuperOver)}`;
        } else {
          // Tie - leave winner and resultSummary undefined
          match.resultSummary = `Match tied${formatResultSuffix(isSuperOver)}`;
        }
      }
      
      await match.save();
      
      res.json({ message: 'Innings skipped, match completed', match: match });
    }
  } catch (err: any) {
    console.error('skipInnings error', err);
    res.status(500).json({ message: 'Failed to skip innings' });
  }
}
