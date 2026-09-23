import {
  TENSOR_AI_EVAL_CASES,
  TENSOR_AI_EVAL_SUITE_VERSION,
} from "../../../../../src/lib/ai/evalCases.mjs";
import { errorResponse, requireAdmin } from "../_lib/server";

export async function GET(request) {
  try {
    await requireAdmin(request);

    return Response.json({
      version: TENSOR_AI_EVAL_SUITE_VERSION,
      cases: TENSOR_AI_EVAL_CASES.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        quick: item.quick === true,
        critical: item.critical === true,
        prompt: item.prompt,
        checkCount: item.checks.length,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
