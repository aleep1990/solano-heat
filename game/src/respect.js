// Respect / rank progression: ranks unlock missions and cars as respect grows.
import { RANKS } from './config.js';

export function createRespect() {
  function rankFor(respect) {
    let rank = RANKS[0];
    for (const r of RANKS) if (respect >= r.respect) rank = r;
    return rank;
  }
  function nextRank(respect) {
    for (const r of RANKS) if (respect < r.respect) return r;
    return null;
  }
  function rankName(respect) { return rankFor(respect).name; }
  function progressToNext(respect) {
    const next = nextRank(respect);
    if (!next) return 1;
    const prev = rankFor(respect);
    return (respect - prev.respect) / (next.respect - prev.respect);
  }
  return { rankFor, nextRank, rankName, progressToNext };
}
