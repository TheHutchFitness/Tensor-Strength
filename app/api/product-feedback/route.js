import { MongoClient } from "mongodb";
import { jwtVerify } from "jose";
import { v4 as uuidv4 } from "uuid";

const COOKIE_NAME = "ts_token";
let client;
let db;
let connectPromise;

async function getDb() {
  if (db) return db;
  if (!process.env.MONGO_URL || !process.env.DB_NAME) {
    throw new Error("Database not configured");
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

async function getUser(request, database) {
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

    return database.collection("users").findOne(
      { id: payload.id },
      { projection: { _id: 0, id: 1, username: 1, email: 1, role: 1 } },
    );
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const database = await getDb();
    const user = await getUser(request, database);

    if (!user) {
      return Response.json({ error: "Sign in required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const category = ["bug", "idea", "confusing", "praise"].includes(body.category)
      ? body.category
      : "idea";
    const message = String(body.message || "").trim().slice(0, 2000);
    const page = String(body.page || "").slice(0, 500);

    if (!message) {
      return Response.json({ error: "Feedback is required." }, { status: 400 });
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await database.collection("product_feedback").countDocuments({
      userId: user.id,
      createdAt: { $gte: dayAgo },
    });

    if (recentCount >= 12) {
      return Response.json(
        { error: "Feedback limit reached for today." },
        { status: 429 },
      );
    }

    await database.collection("product_feedback").insertOne({
      id: uuidv4(),
      userId: user.id,
      username: user.username || "",
      category,
      message,
      page,
      status: "new",
      createdAt: new Date(),
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("product feedback error:", error?.message || error);
    return Response.json(
      { error: "Could not save feedback." },
      { status: 500 },
    );
  }
}
