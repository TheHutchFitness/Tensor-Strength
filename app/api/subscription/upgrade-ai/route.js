import { MongoClient } from "mongodb";
import { jwtVerify } from "jose";

const COOKIE_NAME = "ts_token";
const CORE_ACCESS = "membership";
const AI_ACCESS = "tensor_ai_beta";
const AI_MONTHLY_AMOUNT = 1299;

let client;
let db;
let connectPromise;

async function getDb() {
  if (db) return db;

  if (!process.env.MONGO_URL || !process.env.DB_NAME) {
    throw Object.assign(new Error("Database is not configured."), { status: 503 });
  }

  if (!connectPromise) {
    connectPromise = (async () => {
      client = new MongoClient(process.env.MONGO_URL);
      await client.connect();
      db = client.db(process.env.DB_NAME);
      return db;
    })().catch((error) => {
      client = null;
      db = null;
      connectPromise = null;
      throw error;
    });
  }

  return connectPromise;
}

async function currentUser(request, database) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.JWT_SECRET?.trim();

  if (!token || !secret) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { algorithms: ["HS256"] },
    );

    if (!payload?.id) return null;

    return database.collection("users").findOne({ id: payload.id });
  } catch {
    return null;
  }
}

function stripeConfig() {
  const ownKey = process.env.STRIPE_SECRET_KEY?.trim();
  const fallbackKey = process.env.STRIPE_API_KEY?.trim();
  const key = ownKey || fallbackKey;

  if (!key) {
    throw Object.assign(new Error("Billing is not configured."), { status: 503 });
  }

  const base = ownKey
    ? "https://api.stripe.com/v1"
    : `${(process.env.INTEGRATION_PROXY_URL || "https://integrations.emergentagent.com").replace(/\/$/, "")}/stripe/v1`;

  return { key, base };
}

async function stripeGet(path) {
  const { key, base } = stripeConfig();

  const response = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw Object.assign(
      new Error(data?.error?.message || "Stripe request failed."),
      { status: response.status >= 500 ? 502 : response.status },
    );
  }

  return data;
}

async function stripePost(path, params) {
  const { key, base } = stripeConfig();

  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw Object.assign(
      new Error(data?.error?.message || "Stripe request failed."),
      { status: response.status >= 500 ? 502 : response.status },
    );
  }

  return data;
}

export async function POST(request) {
  try {
    const database = await getDb();
    const user = await currentUser(request, database);

    if (!user) {
      return Response.json({ error: "Sign in required." }, { status: 401 });
    }

    if (user.role === "admin" || user.isTrainer === true || user.aiBetaAccess === true) {
      return Response.json({ ok: true, alreadyEntitled: true });
    }

    if (user.accessType === AI_ACCESS) {
      return Response.json({ ok: true, alreadyEntitled: true });
    }

    if (user.accessType !== CORE_ACCESS) {
      return Response.json(
        {
          error:
            "This upgrade currently applies to Core Membership accounts. Contact Hutch if you have a coaching or legacy plan.",
        },
        { status: 409 },
      );
    }

    if (!user.stripeSubscriptionId) {
      return Response.json(
        {
          error:
            "This Core account does not have a recurring Stripe subscription to upgrade. Contact Hutch to enable Tensor AI Beta.",
        },
        { status: 409 },
      );
    }

    const subscription = await stripeGet(
      `/subscriptions/${encodeURIComponent(user.stripeSubscriptionId)}`,
    );

    if (!["active", "trialing"].includes(subscription?.status)) {
      return Response.json(
        { error: "Your current subscription is not active." },
        { status: 409 },
      );
    }

    const item = subscription?.items?.data?.[0];
    const interval =
      item?.price?.recurring?.interval ||
      item?.plan?.interval ||
      null;

    if (interval === "year") {
      return Response.json(
        {
          error:
            "Legacy annual plans are enabled for Tensor AI manually so we do not convert yearly billing by accident. Contact Hutch.",
        },
        { status: 409 },
      );
    }

    const product =
      typeof item?.price?.product === "string"
        ? item.price.product
        : item?.price?.product?.id;

    if (!item?.id || !product) {
      return Response.json(
        { error: "Could not identify your current Stripe plan." },
        { status: 409 },
      );
    }

    // Beta-friendly plan change:
    // - AI access starts immediately.
    // - The recurring rate changes to $12.99 for the next renewal.
    // - No surprise mid-cycle proration charge.
    const itemParams = new URLSearchParams();
    itemParams.set("price_data[currency]", "cad");
    itemParams.set("price_data[product]", product);
    itemParams.set("price_data[unit_amount]", String(AI_MONTHLY_AMOUNT));
    itemParams.set("price_data[recurring][interval]", "month");
    itemParams.set("proration_behavior", "none");

    await stripePost(
      `/subscription_items/${encodeURIComponent(item.id)}`,
      itemParams,
    );

    const subParams = new URLSearchParams();
    subParams.set("metadata[userId]", user.id);
    subParams.set("metadata[packageId]", "tensor_ai_beta_12_99");
    subParams.set("metadata[accessType]", AI_ACCESS);

    await stripePost(
      `/subscriptions/${encodeURIComponent(user.stripeSubscriptionId)}`,
      subParams,
    );

    const changedAt = new Date();

    await database.collection("users").updateOne(
      { id: user.id },
      {
        $set: {
          portalAccess: true,
          accessType: AI_ACCESS,
          aiPlanChangedAt: changedAt,
        },
      },
    );

    await database.collection("subscription_plan_changes").insertOne({
      userId: user.id,
      fromAccessType: CORE_ACCESS,
      toAccessType: AI_ACCESS,
      stripeSubscriptionId: user.stripeSubscriptionId,
      prorationBehavior: "none",
      effectiveAt: changedAt,
      createdAt: changedAt,
    });

    return Response.json({
      ok: true,
      accessType: AI_ACCESS,
      amount: AI_MONTHLY_AMOUNT,
      currency: "cad",
      currentPeriodEnd: subscription.current_period_end || null,
      note: "Tensor AI access is active now. The $12.99 CAD rate starts at your next renewal.",
    });
  } catch (error) {
    console.error("Tensor AI plan upgrade error:", error?.message || error);

    const status = Number(error?.status || 500);
    return Response.json(
      {
        error:
          status >= 500
            ? "Could not update your subscription right now. Please try again."
            : error?.message || "Could not update your subscription.",
      },
      { status: status >= 400 && status <= 599 ? status : 500 },
    );
  }
}
