import { MongoClient } from "mongodb";
import { jwtVerify } from "jose";
import { v4 as uuidv4 } from "uuid";

const COOKIE_NAME = "ts_token";

let client;
let db;
let connectPromise;

export async function getDb() {
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

export async function requireAdmin(request) {
  const secret = process.env.JWT_SECRET?.trim();
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!secret || !token) {
    throw Object.assign(new Error("Not signed in."), { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { algorithms: ["HS256"] },
    );

    if (!payload?.id) {
      throw Object.assign(new Error("Not signed in."), { status: 401 });
    }

    const database = await getDb();
    const user = await database.collection("users").findOne(
      { id: payload.id },
      { projection: { _id: 0, id: 1, username: 1, role: 1 } },
    );

    if (!user || user.role !== "admin") {
      throw Object.assign(new Error("Admin access required."), { status: 403 });
    }

    return { db: database, admin: user };
  } catch (error) {
    if (error?.status) throw error;
    throw Object.assign(new Error("Not signed in."), { status: 401 });
  }
}

export function makeId() {
  return uuidv4();
}

export function errorResponse(error) {
  const status = Number(error?.status || 500);
  const safeStatus = status >= 400 && status <= 599 ? status : 500;

  if (safeStatus >= 500) {
    console.error("Tensor AI eval error:", error?.message || error);
  }

  return Response.json(
    {
      error:
        safeStatus >= 500
          ? "Could not complete the Tensor AI evaluation."
          : error?.message || "Request failed.",
    },
    { status: safeStatus },
  );
}
