// ============================================================================
// PR BOARD — public leaderboard of Tensor Strength client PRs
// ----------------------------------------------------------------------------
// Shown publicly on the homepage as social proof. Clients submit PRs through
// the Client Portal; those submissions go to Hutch's inbox, and Hutch adds the
// good ones here and re-publishes. (Static site — no live database — so the
// board updates on publish, not in real time.)
//
// To add a PR:
//   1. Copy an object below and edit the fields.
//   2. Save. Re-publish. It appears on the public PR Board.
// ============================================================================

export type PREntry = {
  id: string;
  firstName: string;
  lift: string;
  result: string;
  note?: string;
};

export const prBoard: PREntry[] = [
  {
    id: "pr1",
    firstName: "Nolan",
    lift: "Bench Press",
    result: "225 lb × 20 reps",
    note: "2nd overall at York Football testing — only beaten by a 24-year-old",
  },
  {
    id: "pr2",
    firstName: "Kat",
    lift: "Deadlift",
    result: "45 lb → 200 lb",
    note: "10 lb muscle gained, shoulder pain gone — in her 40s",
  },
  {
    id: "pr3",
    firstName: "Rachel",
    lift: "Air Force Firefighter Test",
    result: "Passed in 8 sessions",
    note: "Significant score improvement from her first attempt",
  },
  {
    id: "pr4",
    firstName: "Karina",
    lift: "Bodyweight",
    result: "Down 22 lb in 3 months",
    note: "Back playing badminton — healthy, sustainable loss",
  },
];
