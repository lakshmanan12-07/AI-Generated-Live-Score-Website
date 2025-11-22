
export function safeNumber(n: any, fallback = 0): number {
  if (typeof n === 'number' && !isNaN(n)) return n;
  const parsed = parseFloat(n);
  if (!isNaN(parsed)) return parsed;
  return fallback;
}

export function calcStrikeRate(runs: number, balls: number): number {
  if (!balls) return 0;
  return parseFloat(((runs / balls) * 100).toFixed(2));
}

export function calcAverage(runs: number, dismissals: number): number {
  if (!dismissals) return 0;
  return parseFloat((runs / dismissals).toFixed(2));
}

export function calcEconomy(runsConceded: number, balls: number): number {
  if (!balls) return 0;
  const overs = balls / 6;
  if (!overs) return 0;
  return parseFloat((runsConceded / overs).toFixed(2));
}
