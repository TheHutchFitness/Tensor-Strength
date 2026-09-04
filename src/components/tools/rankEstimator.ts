// Estimated strength percentile bands, derived from published strength-standard
// tables (e.g. StrengthLevel / SymmetricStrength) which aggregate competition and
// gym-lifter data. These are informed ESTIMATES, not official world rankings —
// your static site has no live database, so we map a result to a percentile band
// using sex, bodyweight, and age multipliers.
//
// Bands (percentile of the lifting population, i.e. "you're stronger than X%"):
//   Beginner       ~  0–25th  (Top 100–75%)
//   Novice         ~ 25–50th  (Top 75–50%)
//   Intermediate   ~ 50–70th  (Top 50–30%)
//   Advanced       ~ 70–90th  (Top 30–10%)
//   Elite          ~ 90–99th  (Top 10–1%)
//   World-class    ~ 99th+    (Top 1%)
//
// NOTE: "Top X%" = share of the population you OUTPERFORM inverted, so
// percentile 90 => "Top 10%". We report both for clarity.

export type Sex = "male" | "female";

export type RankResult = {
  percentile: number; // 0–100, share of pop you beat
  topPercent: number; // 100 - percentile
  tier: string; // label
  blurb: string; // short context
};

// Base "intermediate" 1RM totals in kg for a ~90kg male, by lift.
// These anchor the curve; everything else scales from here.
const BASE_1RM_KG_MALE: Record<string, number> = {
  bench: 100,
  squat: 135,
  deadlift: 160,
  overhead: 60,
  press: 60,
  default: 100,
};

const BASE_1RM_KG_FEMALE: Record<string, number> = {
  bench: 45,
  squat: 90,
  deadlift: 110,
  overhead: 30,
  press: 30,
  default: 45,
};

// Bodyweight scaling: strength scales ~ with bodyweight^0.67 (allometric).
// We normalize a lift to a "90kg male equivalent" score.
function bodyweightFactor(bodyweightKg: number, sex: Sex) {
  const refBw = sex === "male" ? 90 : 73;
  // allometric scaling: lifted / bw^0.67, then re-reference
  return Math.pow(refBw / bodyweightKg, 0.67);
}

// Age factor — strength peaks ~30, declines after. Multiplier on the result.
function ageFactor(age: number) {
  if (age <= 0) return 1;
  if (age < 30) return 0.85 + (age / 30) * 0.15; // ramps up to 1.0 by 30
  if (age <= 40) return 1.0;
  if (age <= 50) return 0.95;
  if (age <= 60) return 0.88;
  if (age <= 70) return 0.78;
  return 0.68;
}

// Map a normalized score (1.0 = intermediate baseline) to a percentile 0–100.
// Logistic-ish curve so elite/world-class taper off.
function scoreToPercentile(score: number): number {
  // score 0.4 => ~10th, 1.0 => ~60th, 1.5 => ~85th, 2.0 => ~95th, 2.5+ => ~99th
  const p = 100 / (1 + Math.exp(-(score - 1.0) * 3.2));
  return Math.max(1, Math.min(99.5, p));
}

function tierFor(percentile: number): { tier: string; blurb: string } {
  if (percentile >= 99)
    return { tier: "World-class", blurb: "Top 1% — competitive at a national/international level." };
  if (percentile >= 90)
    return { tier: "Elite", blurb: "Top 10% — advanced competitor, qualifying-level totals." };
  if (percentile >= 70)
    return { tier: "Advanced", blurb: "Top 30% — well above the average serious lifter." };
  if (percentile >= 50)
    return { tier: "Intermediate", blurb: "Top 50% — solid, experienced gym lifter." };
  if (percentile >= 25)
    return { tier: "Novice", blurb: "Top 75% — past the beginner stage, building a base." };
  return { tier: "Beginner", blurb: "Top 100% — early days. Everyone starts here." };
}

export type RankInput = {
  sex: Sex;
  bodyweightKg: number;
  age?: number;
  // For a single-lift 1RM:
  liftKg?: number;
  liftName?: string;
  // For a three-lift total:
  totalKg?: number;
};

function normalizeInput(input: RankInput): number {
  if (typeof input.totalKg === "number" && input.totalKg > 0) {
    // Total: baseline intermediate male total ~ 395kg (100+135+160), female ~245kg
    const baseTotal = input.sex === "male" ? 395 : 245;
    const bwFactor = bodyweightFactor(input.bodyweightKg, input.sex);
    const af = input.age ? ageFactor(input.age) : 1;
    // allometric-adjusted total relative to ref lifter
    const adjusted = input.totalKg * bwFactor;
    return adjusted / (baseTotal * af);
  }
  if (typeof input.liftKg === "number" && input.liftKg > 0) {
    const name = (input.liftName || "default").toLowerCase();
    const base =
      (input.sex === "male" ? BASE_1RM_KG_MALE : BASE_1RM_KG_FEMALE)[name] ||
      (input.sex === "male" ? BASE_1RM_KG_MALE : BASE_1RM_KG_FEMALE)["default"];
    const bwFactor = bodyweightFactor(input.bodyweightKg, input.sex);
    const af = input.age ? ageFactor(input.age) : 1;
    const adjusted = input.liftKg * bwFactor;
    return adjusted / (base * af);
  }
  return 0;
}

export function estimateRank(input: RankInput): RankResult | null {
  const score = normalizeInput(input);
  if (!score || !isFinite(score)) return null;
  const percentile = scoreToPercentile(score);
  const { tier, blurb } = tierFor(percentile);
  return {
    percentile: Math.round(percentile),
    topPercent: Math.round(100 - percentile),
    tier,
    blurb,
  };
}

export function rankBreakdown(input: RankInput): {
  overall: RankResult | null;
  bodyweightNote: string;
  ageNote: string;
} {
  const overall = estimateRank(input);
  const bwLb = (input.bodyweightKg * 2.2046).toFixed(0);
  const bwNote =
    input.sex === "male"
      ? `among ~${(input.bodyweightKg).toFixed(0)}kg / ${bwLb}lb male lifters`
      : `among ~${(input.bodyweightKg).toFixed(0)}kg / ${bwLb}lb female lifters`;
  let ageNote = "all ages combined";
  if (input.age && input.age > 0) {
    ageNote =
      input.age < 30
        ? `open-class ages (you're ${input.age})`
        : input.age <= 40
        ? `prime lifting ages (you're ${input.age})`
        : input.age <= 50
        ? `masters 40–50 (you're ${input.age})`
        : input.age <= 60
        ? `masters 50–60 (you're ${input.age})`
        : `masters 60+ (you're ${input.age})`;
  }
  return { overall, bodyweightNote: bwNote, ageNote };
}
