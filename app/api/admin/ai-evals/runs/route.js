import { errorResponse, requireAdmin } from "../_lib/server";

export async function GET(request) {
  try {
    const { db } = await requireAdmin(request);

    const runs = await db.collection("aiEvalRuns")
      .find(
        {},
        {
          projection: {
            _id: 0,
            id: 1,
            suiteVersion: 1,
            mode: 1,
            expectedCaseIds: 1,
            status: 1,
            summary: 1,
            providers: 1,
            models: 1,
            createdByName: 1,
            startedAt: 1,
            completedAt: 1,
            createdAt: 1,
          },
        },
      )
      .sort({ createdAt: -1 })
      .limit(12)
      .toArray();

    const settings = await db.collection("aiEvalSettings")
      .find(
        { key: { $in: ["baseline:standard", "baseline:deep"] } },
        { projection: { _id: 0, key: 1, runId: 1 } },
      )
      .toArray();

    const baselineByMode = Object.fromEntries(
      settings.map((row) => [String(row.key).split(":")[1], row.runId]),
    );

    const runIds = runs.map((run) => run.id);
    const allResults = await db.collection("aiEvalResults")
      .find(
        { runId: { $in: runIds } },
        {
          projection: {
            _id: 0,
            runId: 1,
            caseId: 1,
            title: 1,
            category: 1,
            criticalCase: 1,
            answer: 1,
            provider: 1,
            model: 1,
            mode: 1,
            latencyMs: 1,
            inputTokens: 1,
            outputTokens: 1,
            grade: 1,
            status: 1,
            error: 1,
            completedAt: 1,
          },
        },
      )
      .toArray();

    const resultsByRun = new Map();
    for (const result of allResults) {
      if (!resultsByRun.has(result.runId)) resultsByRun.set(result.runId, []);
      resultsByRun.get(result.runId).push(result);
    }

    const baselineResultsByMode = {};
    for (const mode of ["standard", "deep"]) {
      const baselineId = baselineByMode[mode];
      if (!baselineId) continue;
      baselineResultsByMode[mode] = new Map(
        (resultsByRun.get(baselineId) || []).map((row) => [
          row.caseId,
          row.grade?.passed === true,
        ]),
      );
    }

    const payload = runs.map((run) => {
      const results = resultsByRun.get(run.id) || [];
      const baseline = baselineResultsByMode[run.mode];

      let regressions = 0;
      let improvements = 0;
      let comparable = 0;

      if (baseline && run.id !== baselineByMode[run.mode]) {
        for (const result of results) {
          if (!baseline.has(result.caseId) || result.status !== "complete") continue;
          comparable += 1;
          const before = baseline.get(result.caseId);
          const now = result.grade?.passed === true;
          if (before && !now) regressions += 1;
          if (!before && now) improvements += 1;
        }
      }

      return {
        ...run,
        baseline: run.id === baselineByMode[run.mode],
        comparison: baseline
          ? { comparable, regressions, improvements }
          : null,
        results: results.sort((a, b) =>
          String(a.caseId).localeCompare(String(b.caseId)),
        ),
      };
    });

    return Response.json({
      runs: payload,
      baselineByMode,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
