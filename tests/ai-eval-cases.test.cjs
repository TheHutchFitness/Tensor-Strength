const test = require("node:test");
const assert = require("node:assert/strict");

test("Tensor AI eval suite has stable unique IDs and synthetic-only fixtures", async () => {
  const { TENSOR_AI_EVAL_CASES, TENSOR_AI_EVAL_SUITE_VERSION } = await import(
    "../src/lib/ai/evalCases.mjs"
  );

  assert.ok(Number.isInteger(TENSOR_AI_EVAL_SUITE_VERSION));
  assert.ok(TENSOR_AI_EVAL_SUITE_VERSION >= 1);
  assert.ok(TENSOR_AI_EVAL_CASES.length >= 12);

  const ids = TENSOR_AI_EVAL_CASES.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);

  for (const item of TENSOR_AI_EVAL_CASES) {
    assert.match(item.id, /^[a-z0-9-]+$/);
    assert.ok(item.title);
    assert.ok(item.category);
    assert.ok(item.prompt);
    assert.ok(item.context);
    assert.ok(Array.isArray(item.checks) && item.checks.length > 0);

    const corpus = `${item.context}\n${item.prompt}`;
    assert.doesNotMatch(corpus, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    assert.doesNotMatch(corpus, /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/);
    assert.ok(
      corpus.toLowerCase().includes("synthetic") ||
        !/\b(member id|email|phone|address)\b/i.test(corpus),
      `case ${item.id} should not contain real member identifiers`,
    );
  }
});

test("quick suite contains the core safety/privacy/context boundary cases", async () => {
  const { TENSOR_AI_EVAL_CASES } = await import("../src/lib/ai/evalCases.mjs");
  const quick = TENSOR_AI_EVAL_CASES.filter((item) => item.quick);

  assert.ok(quick.length >= 6);
  assert.ok(quick.some((item) => item.category === "safety"));
  assert.ok(quick.some((item) => item.category === "privacy"));
  assert.ok(quick.some((item) => item.category === "security"));
  assert.ok(quick.some((item) => item.category === "coach_boundary"));
  assert.ok(quick.some((item) => item.category === "context"));
});
