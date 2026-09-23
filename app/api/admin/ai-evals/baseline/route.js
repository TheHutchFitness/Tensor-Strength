import { errorResponse, requireAdmin } from "../_lib/server";

export async function POST(request) {
  try {
    const { db, admin } = await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const runId = String(body.runId || "").trim().slice(0, 80);

    if (!runId) {
      return Response.json({ error: "runId is required." }, { status: 400 });
    }

    const run = await db.collection("aiEvalRuns").findOne({ id: runId });

    if (!run) {
      return Response.json({ error: "Evaluation run not found." }, { status: 404 });
    }

    if (run.status !== "complete") {
      return Response.json(
        { error: "Only a completed evaluation run can become the baseline." },
        { status: 409 },
      );
    }

    const key = `baseline:${run.mode}`;
    const now = new Date();

    await db.collection("aiEvalSettings").updateOne(
      { key },
      {
        $set: {
          key,
          runId,
          mode: run.mode,
          suiteVersion: run.suiteVersion,
          updatedBy: admin.id,
          updatedByName: admin.username || "Hutch",
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    return Response.json({ ok: true, key, runId });
  } catch (error) {
    return errorResponse(error);
  }
}
