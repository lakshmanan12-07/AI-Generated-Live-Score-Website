"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { getAuthHeaders } from "@/lib/adminAuth";
import { useRouter } from "next/navigation";


type TossDecision = "BAT" | "BOWL";

async function fetchMatchDetail(matchId: string) {
  const res = await api.get(`/matches/${matchId}`);
  return res.data as {
    match: any;
    innings: any[];
    scorecards: any[];
  };
}

async function fetchPlayers() {
  const res = await api.get("/players");
  return res.data as any[];
}

async function savePair(matchId: string, inningsId: string, striker: string, nonStriker: string, bowler: string) {
  const headers = getAuthHeaders();
  await api.post(
    `/matches/${matchId}/updatePair`,
    {
      inningsId,
      striker,
      nonStriker,
      bowler,
    },
    { headers }
  );
}

// Helper: Find or create a player by name and team (checks for duplicates)
// Note: This function should be called from within the component to access queryClient
async function findOrCreatePlayer(
  name: string, 
  teamId: string, 
  role: string = "Player",
  queryClient?: any
): Promise<string> {
  const headers = getAuthHeaders();
  const trimmedName = name.trim();
  
  if (!trimmedName) {
    throw new Error("Player name cannot be empty");
  }
  
  // First, try to find existing player with this name in this team (case-insensitive)
  const players = await api.get("/players", { headers });
  const existing = players.data.find(
    (p: any) => p.name.trim().toLowerCase() === trimmedName.toLowerCase() && 
                p.team?._id?.toString() === teamId.toString()
  );
  
  if (existing) {
    return existing._id;
  }
  
  // Check for any player with same name (case-insensitive) in the same team
  const duplicate = players.data.find(
    (p: any) => p.name.trim().toLowerCase() === trimmedName.toLowerCase() && 
                p.team?._id?.toString() === teamId.toString()
  );
  
  if (duplicate) {
    throw new Error(`A player with the name "${trimmedName}" already exists in this team.`);
  }
  
  // Create new player
  const newPlayer = await api.post(
    "/players",
    {
      name: trimmedName,
      team: teamId,
      role,
    },
    { headers }
  );
  
  // Invalidate players query to refetch the list
  if (queryClient) {
    await queryClient.invalidateQueries({ queryKey: ["admin-live-players"] });
  }
  
  return newPlayer.data._id;
}

export default function AdminLiveScoringPage() {
  const params = useParams();
  const matchId = params?.matchId as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-live-match", matchId],
    queryFn: () => fetchMatchDetail(matchId),
  });

  const { data: players } = useQuery({
    queryKey: ["admin-live-players"],
    queryFn: fetchPlayers,
  });

  const match = data?.match;
  const inningsList = data?.innings || [];
  const inningsCount = inningsList.length;

  const currentInnings =
    inningsList.find(
      (inn: any) =>
        match?.currentInnings &&
        inn._id.toString() === match.currentInnings.toString()
    ) || inningsList[inningsList.length - 1];

  const [tossWinner, setTossWinner] = useState<string>("");
  const [tossDecision, setTossDecision] = useState<TossDecision>("BAT");
  const [maxOvers, setMaxOvers] = useState<number>(20);

  const [strikerId, setStrikerId] = useState<string>("");
  const [nonStrikerId, setNonStrikerId] = useState<string>("");
  const [bowlerId, setBowlerId] = useState<string>("");

  const [extras, setExtras] = useState({
    wide: false,
    noBall: false,
    bye: false,
    legBye: false,
    wicket: false,
    dismissalType: "",
  });

  const [selectNextBatsman, setSelectNextBatsman] = useState(false);
  const [tieResolutionNeeded, setTieResolutionNeeded] = useState<{ isSuperOver: boolean } | null>(null);
  const [manualWinnerId, setManualWinnerId] = useState("");
  const [superOverBattingTeam, setSuperOverBattingTeam] = useState("");
  const [resolvingTie, setResolvingTie] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  
  // Player input states for creating new players
  const [strikerInput, setStrikerInput] = useState<string>("");
  const [nonStrikerInput, setNonStrikerInput] = useState<string>("");
  const [bowlerInput, setBowlerInput] = useState<string>("");
  const [nextBatsmanInput, setNextBatsmanInput] = useState<string>("");
  
  // Skip innings modal state
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipRuns, setSkipRuns] = useState<number>(0);
  const [skipWickets, setSkipWickets] = useState<number>(0);
  const [skipping, setSkipping] = useState(false);

  // Initialise toss & pair state from backend
  useEffect(() => {
    if (!match) return;

    if (match.tossWinner && !tossWinner) {
      setTossWinner(match.tossWinner._id || match.tossWinner);
    }
    if (match.tossDecision && !tossDecision) {
      setTossDecision(match.tossDecision);
    }
    if (match.maxOvers && !maxOvers) {
      setMaxOvers(match.maxOvers);
    }
  }, [match]);

  useEffect(() => {
    if (!currentInnings) return;

    // Use backend persisted striker / non-striker / bowler if present
    if (currentInnings.currentStriker && !strikerId) {
      setStrikerId(currentInnings.currentStriker.toString());
    }
    if (currentInnings.currentNonStriker && !nonStrikerId) {
      setNonStrikerId(currentInnings.currentNonStriker.toString());
    }
    if (currentInnings.currentBowler && !bowlerId) {
      setBowlerId(currentInnings.currentBowler.toString());
    }
  }, [currentInnings]);

  useEffect(() => {
    if (!tieResolutionNeeded || !match) return;
    const defaultTeam = match.teamA?._id || match.teamB?._id || "";
    if (!manualWinnerId && defaultTeam) {
      setManualWinnerId(defaultTeam);
    }
    if (!superOverBattingTeam && defaultTeam) {
      setSuperOverBattingTeam(defaultTeam);
    }
  }, [tieResolutionNeeded, match, manualWinnerId, superOverBattingTeam]);

  // Players grouped by team
  const teamAPlayers = useMemo(
    () => players?.filter((p: any) => p.team?._id === match?.teamA._id) || [],
    [players, match]
  );

  const teamBPlayers = useMemo(
    () => players?.filter((p: any) => p.team?._id === match?.teamB._id) || [],
    [players, match]
  );

  const battingTeamPlayers = useMemo(() => {
    if (!currentInnings) return [];
    const teamId = currentInnings.battingTeam._id;
    return players?.filter((p: any) => p.team?._id === teamId) || [];
  }, [players, currentInnings]);

  const bowlingTeamPlayers = useMemo(() => {
    if (!currentInnings) return [];
    const teamId = currentInnings.bowlingTeam._id;
    return players?.filter((p: any) => p.team?._id === teamId) || [];
  }, [players, currentInnings]);

  // Dismissed batsmen → cannot be chosen again
  const dismissedIds: string[] = useMemo(() => {
    if (!currentInnings || !currentInnings.fallOfWickets) return [];
    return currentInnings.fallOfWickets.map(
      (f: any) => f.dismissedBatsman?.toString() || ""
    );
  }, [currentInnings]);

  const availableBatters = useMemo(
    () =>
      battingTeamPlayers.filter(
        (p: any) => !dismissedIds.includes(p._id.toString())
      ),
    [battingTeamPlayers, dismissedIds]
  );

  const totalTargetInnings = match?.targetInningsCount || 2;
  const teamOptions = useMemo(() => {
    if (!match) return [];
    return [match.teamA, match.teamB].filter(Boolean);
  }, [match]);

  // Check if pair selection is valid
  const isPairValid = useMemo(() => {
    const hasStriker = !!strikerId || !!strikerInput?.trim();
    const hasNonStriker = !!nonStrikerId || !!nonStrikerInput?.trim();
    const hasBowler = !!bowlerId || !!bowlerInput?.trim();
    
    // Check if striker and non-striker are different
    const strikerSame = (strikerId && nonStrikerId && strikerId === nonStrikerId) ||
      (strikerInput?.trim() && nonStrikerInput?.trim() && 
       strikerInput.trim().toLowerCase() === nonStrikerInput.trim().toLowerCase());
    
    return hasStriker && hasNonStriker && hasBowler && !strikerSame;
  }, [strikerId, strikerInput, nonStrikerId, nonStrikerInput, bowlerId, bowlerInput]);

  // PHASE: toss / pair / scoring
  const phase: "toss" | "pair" | "scoring" = useMemo(() => {
    if (!match) return "toss";
    if (!match.tossWinner || !match.tossDecision) return "toss";
    if (!currentInnings) return "toss";
    if (currentInnings.isCompleted) return "toss"; // safety: ended innings shouldn't be scored

    // If backend already has pair, go straight to scoring on reload
    if (
      currentInnings.currentStriker &&
      currentInnings.currentNonStriker &&
      currentInnings.currentBowler
    ) {
      return "scoring";
    }

    return "pair";
  }, [match, currentInnings]);

  function resetExtras() {
    setExtras({
      wide: false,
      noBall: false,
      bye: false,
      legBye: false,
      wicket: false,
      dismissalType: "",
    });
  }

  function currentScoreText() {
    if (!currentInnings) return "0/0 (0.0)";
    const runs = currentInnings.runs || 0;
    const wkts = currentInnings.wickets || 0;
    const oversFloat = currentInnings.overs || 0;
    const whole = Math.floor(oversFloat);
    const frac = Math.round((oversFloat - whole) * 6);
    const overDisplay = `${whole}.${frac}`;
    return `${runs}/${wkts} (${overDisplay})`;
  }

  function swapBatsmen() {
    setStrikerId((s) => {
      const newStriker = nonStrikerId;
      setNonStrikerId(s);
      return newStriker;
    });
  }

  async function handleSaveToss(e: React.FormEvent) {
    e.preventDefault();
    if (!match || !tossWinner) return;

    const headers = getAuthHeaders();

    // 1) Save toss
    await api.post(
      `/matches/${matchId}/toss`,
      {
        tossWinner,
        tossDecision,
        maxOvers,
      },
      { headers }
    );

    const tossWinnerId = tossWinner;
    const teamAId = match.teamA._id;
    const teamBId = match.teamB._id;

    const battingTeamId =
      tossDecision === "BAT"
        ? tossWinnerId
        : tossWinnerId === teamAId
        ? teamBId
        : teamAId;

    const bowlingTeamId =
      battingTeamId === teamAId ? teamBId : teamAId;

    // 2) Start first innings
    await api.post(
      `/matches/${matchId}/innings`,
      {
        battingTeam: battingTeamId,
        bowlingTeam: bowlingTeamId,
      },
      { headers }
    );

    await refetch();
  }

  async function handleSavePair() {
    if (!currentInnings) return;
    
    let finalStrikerId = strikerId;
    let finalNonStrikerId = nonStrikerId;
    let finalBowlerId = bowlerId;
    
    // Handle new player creation for striker (text input has priority)
    if (strikerInput?.trim()) {
      try {
        finalStrikerId = await findOrCreatePlayer(
          strikerInput.trim(),
          currentInnings.battingTeam._id,
          "Batsman",
          queryClient
        );
        setStrikerId(finalStrikerId);
        setStrikerInput("");
      } catch (err: any) {
        alert(`Failed to create striker: ${err?.response?.data?.message || err.message}`);
        return;
      }
    }
    
    // Handle new player creation for non-striker (text input has priority)
    if (nonStrikerInput?.trim()) {
      try {
        finalNonStrikerId = await findOrCreatePlayer(
          nonStrikerInput.trim(),
          currentInnings.battingTeam._id,
          "Batsman",
          queryClient
        );
        setNonStrikerId(finalNonStrikerId);
        setNonStrikerInput("");
      } catch (err: any) {
        alert(`Failed to create non-striker: ${err?.response?.data?.message || err.message}`);
        return;
      }
    }
    
    // Handle new player creation for bowler (text input has priority)
    if (bowlerInput?.trim()) {
      try {
        finalBowlerId = await findOrCreatePlayer(
          bowlerInput.trim(),
          currentInnings.bowlingTeam._id,
          "Bowler",
          queryClient
        );
        setBowlerId(finalBowlerId);
        setBowlerInput("");
      } catch (err: any) {
        alert(`Failed to create bowler: ${err?.response?.data?.message || err.message}`);
        return;
      }
    }
    
    if (!finalStrikerId || !finalNonStrikerId || !finalBowlerId) {
      alert("Please select or enter striker, non-striker and bowler.");
      return;
    }
    if (finalStrikerId === finalNonStrikerId) {
      alert("Striker and non-striker cannot be the same player.");
      return;
    }
    
    await savePair(matchId, currentInnings._id, finalStrikerId, finalNonStrikerId, finalBowlerId);
    await refetch();
  }

  async function recordBall(runs: number) {
    if (!currentInnings || !match) return;
    
    let finalStrikerId = strikerId;
    let finalBowlerId = bowlerId;
    
    // Handle new player creation for striker (text input has priority)
    if (strikerInput?.trim()) {
      try {
        finalStrikerId = await findOrCreatePlayer(
          strikerInput.trim(),
          currentInnings.battingTeam._id,
          "Batsman",
          queryClient
        );
        setStrikerId(finalStrikerId);
        setStrikerInput("");
      } catch (err: any) {
        alert(`Failed to create striker: ${err?.response?.data?.message || err.message}`);
        return;
      }
    }
    
    // Handle new player creation for bowler (text input has priority)
    if (bowlerInput?.trim()) {
      try {
        finalBowlerId = await findOrCreatePlayer(
          bowlerInput.trim(),
          currentInnings.bowlingTeam._id,
          "Bowler",
          queryClient
        );
        setBowlerId(finalBowlerId);
        setBowlerInput("");
      } catch (err: any) {
        alert(`Failed to create bowler: ${err?.response?.data?.message || err.message}`);
        return;
      }
    }
    
    if (!finalStrikerId || !finalBowlerId) {
      alert("Please select or enter striker and bowler.");
      return;
    }

    if (finalStrikerId === finalBowlerId) {
      alert("Batsman and bowler cannot be the same player.");
      return;
    }

    const headers = getAuthHeaders();

    const payload: any = {
      inningsId: currentInnings._id,
      batsman: finalStrikerId,
      bowler: finalBowlerId,
      runs,
      isWide: extras.wide,
      isNoBall: extras.noBall,
      isWicket: extras.wicket,
    };

    if (extras.wicket) {
      payload.dismissalType = extras.dismissalType || "out";
      payload.dismissedBatsman = finalStrikerId;
    }

    await api.post(`/matches/${matchId}/ball`, payload, { headers });
    await refetch();

    if (extras.wicket) {
      setSelectNextBatsman(true);
      setNextBatsmanInput(""); // Reset next batsman input when wicket falls
    }

    resetExtras();
  }

  async function handleEndInnings() {
    if (!currentInnings || !match) return;
    setCompletionError(null);
    const headers = getAuthHeaders();

    try {
      if (inningsCount < totalTargetInnings) {
        const battingTeamId = currentInnings.bowlingTeam._id;
        const bowlingTeamId = currentInnings.battingTeam._id;

        await api.post(
          `/matches/${matchId}/innings`,
          { battingTeam: battingTeamId, bowlingTeam: bowlingTeamId },
          { headers }
        );
        setStrikerId("");
        setNonStrikerId("");
        setBowlerId("");
        setSelectNextBatsman(false);
        resetExtras();
        setTieResolutionNeeded(null);
        await refetch();
        return;
      }

      const res = await api.post(`/matches/${matchId}/complete`, {}, { headers });
      if (res.data?.needsResolution) {
        setTieResolutionNeeded({ isSuperOver: !!res.data.isSuperOver });
      } else {
        setTieResolutionNeeded(null);
        setStrikerId("");
        setNonStrikerId("");
        setBowlerId("");
        setSelectNextBatsman(false);
        resetExtras();
        await refetch();
      }
    } catch (err: any) {
      setCompletionError(err?.response?.data?.message || "Failed to end live scoring");
    }
  }

  async function resolveTieManually() {
    if (!manualWinnerId) return;
    setResolvingTie(true);
    setCompletionError(null);
    const headers = getAuthHeaders();
    try {
      await api.post(
        `/matches/${matchId}/complete`,
        { resolution: "MANUAL", manualWinnerId },
        { headers }
      );
      setTieResolutionNeeded(null);
      await refetch();
    } catch (err: any) {
      setCompletionError(err?.response?.data?.message || "Failed to set winner");
    } finally {
      setResolvingTie(false);
    }
  }

  async function startSuperOverInnings() {
    if (!superOverBattingTeam) return;
    setResolvingTie(true);
    setCompletionError(null);
    const headers = getAuthHeaders();
    try {
      await api.post(
        `/matches/${matchId}/super-over`,
        { battingTeam: superOverBattingTeam },
        { headers }
      );
      setTieResolutionNeeded(null);
      setStrikerId("");
      setNonStrikerId("");
      setBowlerId("");
      setSelectNextBatsman(false);
      resetExtras();
      await refetch();
    } catch (err: any) {
      setCompletionError(err?.response?.data?.message || "Failed to start super over");
    } finally {
      setResolvingTie(false);
    }
  }

  async function forceTieResult() {
    setResolvingTie(true);
    setCompletionError(null);
    const headers = getAuthHeaders();
    try {
      await api.post(
        `/matches/${matchId}/complete`,
        { resolution: "FORCE_TIE" },
        { headers }
      );
      setTieResolutionNeeded(null);
      await refetch();
    } catch (err: any) {
      setCompletionError(err?.response?.data?.message || "Failed to mark tie");
    } finally {
      setResolvingTie(false);
    }
  }

  async function handleSkipInnings() {
    if (!currentInnings || !match) return;
    setSkipping(true);
    setCompletionError(null);
    const headers = getAuthHeaders();
    
    try {
      const res = await api.post(
        `/matches/${matchId}/skip-innings`,
        {
          inningsId: currentInnings._id,
          totalRuns: skipRuns,
          totalWickets: skipWickets,
        },
        { headers }
      );
      
      setShowSkipModal(false);
      setSkipRuns(0);
      setSkipWickets(0);
      setStrikerId("");
      setNonStrikerId("");
      setBowlerId("");
      setStrikerInput("");
      setNonStrikerInput("");
      setBowlerInput("");
      setSelectNextBatsman(false);
      resetExtras();
      
      await refetch();
      
      // Only show completion option if this was the last innings
      // The backend will have started the next innings if needed
      // User can manually end match later using "End match" button
    } catch (err: any) {
      setCompletionError(err?.response?.data?.message || "Failed to skip innings");
    } finally {
      setSkipping(false);
    }
  }

  if (isLoading || !match) {
    return <p className="text-sm text-slate-400">Loading match...</p>;
  }
  if (match.status === "COMPLETED") {
    return (
      <p className="text-center text-sm text-red-400">
        This match is completed. Live scoring is disabled.
      </p>
    );
  }





  return (
    <div className="space-y-4 text-xs">
      <h1 className="text-xl font-semibold">Live scoring</h1>

      {/* MATCH HEADER */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <p className="text-sm font-semibold">
          {match.teamA.shortCode} vs {match.teamB.shortCode}
        </p>
        <p className="text-[11px] text-slate-400">
          {match.matchType} · {match.venue}
        </p>
        {match.tossWinner && match.tossDecision && (
          <p className="mt-1 text-[11px] text-emerald-400">
            Toss: {match.tossWinner.name} chose to{" "}
            {match.tossDecision === "BAT" ? "bat" : "bowl"}
          </p>
        )}
        {match.maxOvers && (
          <p className="text-[11px] text-slate-300">Overs: {match.maxOvers}</p>
        )}
        <p className="mt-1 text-[11px] text-slate-400">Status: {match.status}</p>
      </div>

      {/* PHASE 1: TOSS */}
      {phase === "toss" && (
        <form
          onSubmit={handleSaveToss}
          className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3"
        >
          <p className="text-sm font-semibold">Toss details</p>
          <div className="grid gap-2 md:grid-cols-3">
            <div>
              <p className="mb-1 text-[11px] text-slate-300">Toss won by</p>
              <select
                value={tossWinner}
                onChange={(e) => setTossWinner(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                required
              >
                <option value="">Select</option>
                <option value={match.teamA._id}>{match.teamA.name}</option>
                <option value={match.teamB._id}>{match.teamB.name}</option>
              </select>
            </div>
            <div>
              <p className="mb-1 text-[11px] text-slate-300">Opted to</p>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={tossDecision === "BAT"}
                    onChange={() => setTossDecision("BAT")}
                  />
                  Bat
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={tossDecision === "BOWL"}
                    onChange={() => setTossDecision("BOWL")}
                  />
                  Bowl
                </label>
              </div>
            </div>
            <div>
              <p className="mb-1 text-[11px] text-slate-300">Overs</p>
              <input
                type="number"
                min={1}
                value={maxOvers}
                onChange={(e) => setMaxOvers(Number(e.target.value))}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-2 rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-slate-900"
          >
            Save toss & start 1st innings
          </button>
        </form>
      )}

      {/* PHASE 2: PAIR SELECTION */}
      {phase === "pair" && currentInnings && (
        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-sm font-semibold">Set batting pair & bowler</p>
          <p className="text-[11px] text-slate-400">
            {currentInnings.battingTeam.name} are batting.
          </p>
          <div className="grid gap-2 md:grid-cols-3">
            <div>
              <p className="mb-1 text-[11px] text-slate-300">Striker</p>
              <select
                value={strikerInput?.trim() ? "" : strikerId}
                onChange={(e) => {
                  // Only update if text input is empty (text input has priority)
                  if (!strikerInput?.trim()) {
                    setStrikerId(e.target.value);
                    setStrikerInput("");
                  }
                }}
                disabled={!!strikerInput?.trim()}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs disabled:opacity-50"
              >
                <option value="">Select from list</option>
                {availableBatters
                  .filter((p: any) => p._id !== nonStrikerId)
                  .map((p: any) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-400">OR enter new name:</p>
              <input
                type="text"
                value={strikerInput}
                onChange={(e) => {
                  setStrikerInput(e.target.value);
                  setStrikerId("");
                }}
                placeholder="New player name"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <p className="mb-1 text-[11px] text-slate-300">Non-striker</p>
              <select
                value={nonStrikerInput?.trim() ? "" : nonStrikerId}
                onChange={(e) => {
                  // Only update if text input is empty (text input has priority)
                  if (!nonStrikerInput?.trim()) {
                    setNonStrikerId(e.target.value);
                    setNonStrikerInput("");
                  }
                }}
                disabled={!!nonStrikerInput?.trim()}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs disabled:opacity-50"
              >
                <option value="">Select from list</option>
                {availableBatters
                  .filter((p: any) => p._id !== strikerId)
                  .map((p: any) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-400">OR enter new name:</p>
              <input
                type="text"
                value={nonStrikerInput}
                onChange={(e) => {
                  setNonStrikerInput(e.target.value);
                  setNonStrikerId("");
                }}
                placeholder="New player name"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              />
              {strikerId &&
                nonStrikerId &&
                strikerId === nonStrikerId && (
                  <p className="mt-1 text-[10px] text-red-400">
                    Striker and non-striker cannot be the same player.
                  </p>
                )}
            </div>
            <div>
              <p className="mb-1 text-[11px] text-slate-300">Bowler</p>
              <select
                value={bowlerInput?.trim() ? "" : bowlerId}
                onChange={(e) => {
                  // Only update if text input is empty (text input has priority)
                  if (!bowlerInput?.trim()) {
                    setBowlerId(e.target.value);
                    setBowlerInput("");
                  }
                }}
                disabled={!!bowlerInput?.trim()}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs disabled:opacity-50"
              >
                <option value="">Select from list</option>
                {bowlingTeamPlayers.map((p: any) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-400">OR enter new name:</p>
              <input
                type="text"
                value={bowlerInput}
                onChange={(e) => {
                  setBowlerInput(e.target.value);
                  setBowlerId("");
                }}
                placeholder="New player name"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSavePair}
            disabled={!isPairValid}
            className="mt-2 rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-slate-900 disabled:opacity-50"
          >
            Save pair & start scoring
          </button>
          <p className="text-[11px] text-slate-500">
            Once saved, this pair will be remembered even if you refresh or
            reopen this page.
          </p>
        </div>
      )}

      {/* PHASE 3: SCORING */}
      {phase === "scoring" && currentInnings && (
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">
                {currentInnings.battingTeam.shortCode} – {currentScoreText()}
              </p>
              <p className="text-[11px] text-slate-400">
                CRR {currentInnings.runRate?.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSkipModal(true)}
                className="rounded-md bg-amber-500 px-3 py-1 text-[11px] font-semibold text-slate-900"
              >
                Skip innings
              </button>
              <button
                onClick={handleEndInnings}
                className="rounded-md bg-red-500 px-3 py-1 text-[11px] font-semibold text-slate-900"
              >
                {inningsCount < totalTargetInnings ? "End innings" : "End match"}
              </button>
            </div>
          </div>
          {completionError && (
            <p className="text-[11px] text-red-400">{completionError}</p>
          )}

          {/* Current pair & bowler */}
          <div className="grid gap-2 md:grid-cols-3">
            <div>
              <p className="mb-1 text-[11px] text-slate-300">Striker</p>
              <select
                value={strikerInput?.trim() ? "" : strikerId}
                onChange={async (e) => {
                  // Only update if text input is empty (text input has priority)
                  if (!strikerInput?.trim()) {
                    const val = e.target.value;
                    setStrikerId(val);
                    setStrikerInput("");
                    if (currentInnings && val && nonStrikerId && bowlerId && val !== nonStrikerId) {
                      await savePair(matchId, currentInnings._id, val, nonStrikerId, bowlerId);
                      await refetch();
                    }
                  }
                }}
                disabled={!!strikerInput?.trim()}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs disabled:opacity-50"
              >
                <option value="">Select from list</option>
                {availableBatters
                  .filter((p: any) => p._id !== nonStrikerId)
                  .map((p: any) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-400">OR enter new name:</p>
              <input
                type="text"
                value={strikerInput}
                onChange={async (e) => {
                  setStrikerInput(e.target.value);
                  setStrikerId("");
                }}
                onBlur={async () => {
                  if (strikerInput?.trim() && currentInnings && nonStrikerId && bowlerId) {
                    try {
                      const newId = await findOrCreatePlayer(
                        strikerInput.trim(),
                        currentInnings.battingTeam._id,
                        "Batsman",
                        queryClient
                      );
                      setStrikerId(newId);
                      setStrikerInput("");
                      await savePair(matchId, currentInnings._id, newId, nonStrikerId, bowlerId);
                      await refetch();
                    } catch (err: any) {
                      alert(`Failed to create player: ${err?.response?.data?.message || err.message}`);
                    }
                  }
                }}
                placeholder="New player name"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <p className="mb-1 text-[11px] text-slate-300">Non-striker</p>
              <select
                value={nonStrikerInput?.trim() ? "" : nonStrikerId}
                onChange={async (e) => {
                  // Only update if text input is empty (text input has priority)
                  if (!nonStrikerInput?.trim()) {
                    const val = e.target.value;
                    setNonStrikerId(val);
                    setNonStrikerInput("");
                    if (currentInnings && strikerId && val && bowlerId && val !== strikerId) {
                      await savePair(matchId, currentInnings._id, strikerId, val, bowlerId);
                      await refetch();
                    }
                  }
                }}
                disabled={!!nonStrikerInput?.trim()}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs disabled:opacity-50"
              >
                <option value="">Select from list</option>
                {availableBatters
                  .filter((p: any) => p._id !== strikerId)
                  .map((p: any) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-400">OR enter new name:</p>
              <input
                type="text"
                value={nonStrikerInput}
                onChange={async (e) => {
                  setNonStrikerInput(e.target.value);
                  setNonStrikerId("");
                }}
                onBlur={async () => {
                  if (nonStrikerInput?.trim() && currentInnings && strikerId && bowlerId) {
                    try {
                      const newId = await findOrCreatePlayer(
                        nonStrikerInput.trim(),
                        currentInnings.battingTeam._id,
                        "Batsman",
                        queryClient
                      );
                      setNonStrikerId(newId);
                      setNonStrikerInput("");
                      await savePair(matchId, currentInnings._id, strikerId, newId, bowlerId);
                      await refetch();
                    } catch (err: any) {
                      alert(`Failed to create player: ${err?.response?.data?.message || err.message}`);
                    }
                  }
                }}
                placeholder="New player name"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <p className="mb-1 text-[11px] text-slate-300">Bowler</p>
              <select
                value={bowlerInput?.trim() ? "" : bowlerId}
                onChange={async (e) => {
                  // Only update if text input is empty (text input has priority)
                  if (!bowlerInput?.trim()) {
                    const val = e.target.value;
                    setBowlerId(val);
                    setBowlerInput("");
                    if (currentInnings && strikerId && nonStrikerId && val) {
                      await savePair(matchId, currentInnings._id, strikerId, nonStrikerId, val);
                      await refetch();
                    }
                  }
                }}
                disabled={!!bowlerInput?.trim()}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs disabled:opacity-50"
              >
                <option value="">Select from list</option>
                {bowlingTeamPlayers.map((p: any) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-400">OR enter new name:</p>
              <input
                type="text"
                value={bowlerInput}
                onChange={async (e) => {
                  setBowlerInput(e.target.value);
                  setBowlerId("");
                }}
                onBlur={async () => {
                  if (bowlerInput?.trim() && currentInnings && strikerId && nonStrikerId) {
                    try {
                      const newId = await findOrCreatePlayer(
                        bowlerInput.trim(),
                        currentInnings.bowlingTeam._id,
                        "Bowler",
                        queryClient
                      );
                      setBowlerId(newId);
                      setBowlerInput("");
                      await savePair(matchId, currentInnings._id, strikerId, nonStrikerId, newId);
                      await refetch();
                    } catch (err: any) {
                      alert(`Failed to create player: ${err?.response?.data?.message || err.message}`);
                    }
                  }
                }}
                placeholder="New player name"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              />
            </div>
          </div>

          {/* Extras & wicket toggles */}
          <div className="grid gap-2 md:grid-cols-3">
            <label className="flex items-center gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={extras.wide}
                onChange={(e) =>
                  setExtras((x) => ({ ...x, wide: e.target.checked }))
                }
              />
              Wide
            </label>
            <label className="flex items-center gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={extras.noBall}
                onChange={(e) =>
                  setExtras((x) => ({ ...x, noBall: e.target.checked }))
                }
              />
              No ball
            </label>
            <label className="flex items-center gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={extras.bye}
                onChange={(e) =>
                  setExtras((x) => ({ ...x, bye: e.target.checked }))
                }
              />
              Byes
            </label>
            <label className="flex items-center gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={extras.legBye}
                onChange={(e) =>
                  setExtras((x) => ({ ...x, legBye: e.target.checked }))
                }
              />
              Leg byes
            </label>
            <label className="flex items-center gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={extras.wicket}
                onChange={(e) =>
                  setExtras((x) => ({ ...x, wicket: e.target.checked }))
                }
              />
              Wicket
            </label>
            {extras.wicket && (
              <input
                value={extras.dismissalType}
                onChange={(e) =>
                  setExtras((x) => ({
                    ...x,
                    dismissalType: e.target.value,
                  }))
                }
                placeholder="Dismissal type (bowled, caught...)"
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
              />
            )}
          </div>

          {/* Runs buttons */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            {[0, 1, 2, 3, 4, 5, 6].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => recordBall(r)}
                className="rounded-full border border-emerald-500 py-2 text-sm font-semibold"
              >
                {r}
              </button>
            ))}
          </div>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={swapBatsmen}
              className="rounded-md bg-slate-800 px-3 py-1 text-[11px] text-slate-100"
            >
              Swap batsmen
            </button>
            <button
              type="button"
              onClick={resetExtras}
              className="rounded-md bg-slate-800 px-3 py-1 text-[11px] text-slate-100"
            >
              Clear flags
            </button>
          </div>

          {/* Next batsman selector */}
          {selectNextBatsman && (
            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/70 p-3">
              <p className="mb-2 text-[11px] font-semibold text-slate-200">
                Select next batsman
              </p>
              <div className="grid gap-1 md:grid-cols-3">
                {availableBatters
                  .filter((p: any) => p._id !== strikerId && p._id !== nonStrikerId)
                  .map((p: any) => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={async () => {
                        if (!currentInnings) return;
                        // Only use dropdown selection if text input is empty (text input has priority)
                        if (!nextBatsmanInput?.trim()) {
                          setStrikerId(p._id);
                          setStrikerInput("");
                          setNextBatsmanInput("");
                          setSelectNextBatsman(false);
                          if (nonStrikerId && bowlerId) {
                            await savePair(matchId, currentInnings._id, p._id, nonStrikerId, bowlerId);
                            await refetch();
                          }
                        }
                      }}
                      disabled={!!nextBatsmanInput?.trim()}
                      className="rounded-md bg-slate-800 px-2 py-1 text-[11px] text-slate-100 disabled:opacity-30"
                    >
                      {p.name}
                    </button>
                  ))}
              </div>
              <div className="mt-2">
                <p className="mb-1 text-[10px] text-slate-400">OR enter new player name:</p>
                <input
                  type="text"
                  value={nextBatsmanInput}
                  onChange={(e) => setNextBatsmanInput(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && nextBatsmanInput?.trim() && currentInnings) {
                      try {
                        const newId = await findOrCreatePlayer(
                          nextBatsmanInput.trim(),
                          currentInnings.battingTeam._id,
                          "Batsman",
                          queryClient
                        );
                        setStrikerId(newId);
                        setStrikerInput("");
                        setNextBatsmanInput("");
                        setSelectNextBatsman(false);
                        if (nonStrikerId && bowlerId) {
                          await savePair(matchId, currentInnings._id, newId, nonStrikerId, bowlerId);
                          await refetch();
                        }
                      } catch (err: any) {
                        alert(`Failed to create player: ${err?.response?.data?.message || err.message}`);
                      }
                    }
                  }}
                  placeholder="Type new player name and press Enter"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                />
                {nextBatsmanInput?.trim() && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!currentInnings || !nextBatsmanInput?.trim()) return;
                      try {
                        const newId = await findOrCreatePlayer(
                          nextBatsmanInput.trim(),
                          currentInnings.battingTeam._id,
                          "Batsman",
                          queryClient
                        );
                        setStrikerId(newId);
                        setStrikerInput("");
                        setNextBatsmanInput("");
                        setSelectNextBatsman(false);
                        if (nonStrikerId && bowlerId) {
                          await savePair(matchId, currentInnings._id, newId, nonStrikerId, bowlerId);
                          await refetch();
                        }
                      } catch (err: any) {
                        alert(`Failed to create player: ${err?.response?.data?.message || err.message}`);
                      }
                    }}
                    className="mt-1 w-full rounded-md bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-slate-900"
                  >
                    Create & Select
                  </button>
                )}
              </div>
            </div>
          )}

          {tieResolutionNeeded && (
            <div className="mt-3 space-y-3 rounded-lg border border-slate-700 bg-slate-950/70 p-3">
              <p className="text-sm font-semibold">Match tied</p>
              <p className="text-[11px] text-slate-400">
                Choose an option to finish the match. Super over will add two new innings.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-300">Manual winner</p>
                  <select
                    value={manualWinnerId}
                    onChange={(e) => setManualWinnerId(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                  >
                    {teamOptions.map((team: any) => (
                      <option key={team._id} value={team._id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!manualWinnerId || resolvingTie}
                    onClick={resolveTieManually}
                    className="w-full rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-slate-900 disabled:opacity-60"
                  >
                    Mark winner
                  </button>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-300">Start super over</p>
                  <select
                    value={superOverBattingTeam}
                    onChange={(e) => setSuperOverBattingTeam(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                  >
                    <option value="">Select batting team</option>
                    {teamOptions.map((team: any) => (
                      <option key={team._id} value={team._id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!superOverBattingTeam || resolvingTie}
                    onClick={startSuperOverInnings}
                    className="w-full rounded-md bg-slate-800 px-3 py-1 text-[11px] text-slate-100 disabled:opacity-60"
                  >
                    Add super over
                  </button>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-300">Keep as tie</p>
                  <button
                    type="button"
                    disabled={resolvingTie}
                    onClick={forceTieResult}
                    className="w-full rounded-md bg-slate-800 px-3 py-1 text-[11px] text-slate-100 disabled:opacity-60"
                  >
                    Mark tied result
                  </button>
                  {tieResolutionNeeded.isSuperOver && (
                    <p className="text-[10px] text-slate-400">
                      Tie occurred after a super over. You can still choose manual winner.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Skip Innings Modal */}
      {showSkipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="mb-4 text-lg font-semibold">Skip Innings</h2>
            <p className="mb-4 text-xs text-slate-400">
              Enter the total runs and wickets for this innings. The innings will be marked as completed.
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] text-slate-300">Total Runs</label>
                <input
                  type="number"
                  min="0"
                  value={skipRuns}
                  onChange={(e) => setSkipRuns(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-slate-300">Total Wickets</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={skipWickets}
                  onChange={(e) => setSkipWickets(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                />
              </div>
            </div>
            {completionError && (
              <p className="mt-3 text-[11px] text-red-400">{completionError}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSkipModal(false);
                  setSkipRuns(0);
                  setSkipWickets(0);
                  setCompletionError(null);
                }}
                className="flex-1 rounded-md bg-slate-800 px-3 py-1 text-[11px] text-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSkipInnings}
                disabled={skipping || skipRuns < 0 || skipWickets < 0 || skipWickets > 10}
                className="flex-1 rounded-md bg-amber-500 px-3 py-1 text-[11px] font-semibold text-slate-900 disabled:opacity-50"
              >
                {skipping ? "Skipping..." : "Skip Innings"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}