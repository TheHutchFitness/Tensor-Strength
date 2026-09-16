import { MongoClient } from "mongodb";
import { NextResponse } from "next/server";

const REQUIRED_ENV_VARS = ["MONGO_URL", "DB_NAME", "JWT_SECRET", "NEXT_PUBLIC_BASE_URL"];
const OPTIONAL_SERVICE_ENV_VARS = {
  stripe: ["STRIPE_SECRET_KEY", "STRIPE_API_KEY"],
  stripeWebhooks: ["STRIPE_WEBHOOK_SECRET", "STRIPE_WEBHOOK_SECRETS"],
  email: ["RESEND_API_KEY", "EMAIL_FROM"],
  storage: ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"],
  cron: ["CRON_SECRET"],
};

function hasAnyEnv(keys: string[]) {
  return keys.some((key) => Boolean(process.env[key]?.trim()));
}

function hasAllEnv(keys: string[]) {
  return keys.every((key) => Boolean(process.env[key]?.trim()));
}

async function checkDatabase() {
  if (!hasAllEnv(["MONGO_URL", "DB_NAME"])) {
    return { ok: false, reason: "missing-env" };
  }

  const client = new MongoClient(process.env.MONGO_URL!, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    await client.db(process.env.DB_NAME).command({ ping: 1 });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "database-unreachable",
    };
  } finally {
    await client.close().catch(() => {});
  }
}

export async function GET() {
  const missingRequired = REQUIRED_ENV_VARS.filter((key) => !process.env[key]?.trim());
  const db = await checkDatabase();

  const body = {
    ok: missingRequired.length === 0 && db.ok,
    checks: {
      env: {
        ok: missingRequired.length === 0,
        missing: missingRequired,
      },
      database: db,
      services: {
        stripe: hasAnyEnv(OPTIONAL_SERVICE_ENV_VARS.stripe),
        stripeWebhooks: hasAnyEnv(OPTIONAL_SERVICE_ENV_VARS.stripeWebhooks),
        email: hasAllEnv(OPTIONAL_SERVICE_ENV_VARS.email),
        storage: hasAllEnv(OPTIONAL_SERVICE_ENV_VARS.storage),
        cron: hasAllEnv(OPTIONAL_SERVICE_ENV_VARS.cron),
        leadCapture: {
          configured: Boolean(process.env.LEAD_API_URL?.trim() || process.env.NEXT_PUBLIC_LEAD_API_URL?.trim()),
          available: true,
          usingDefault: !process.env.LEAD_API_URL?.trim() && !process.env.NEXT_PUBLIC_LEAD_API_URL?.trim(),
          source: process.env.LEAD_API_URL?.trim() || process.env.NEXT_PUBLIC_LEAD_API_URL?.trim() ? "env" : "default",
        },
      },
    },
  };

  return NextResponse.json(body, { status: body.ok ? 200 : 503 });
}
