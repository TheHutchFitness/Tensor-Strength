import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

// MongoDB connection
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

const COOKIE_NAME = 'ts_token'
const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me')

async function signToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey)
}

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey)
    return payload
  } catch {
    return null
  }
}

function publicUser(u) {
  if (!u) return null
  const { _id, passwordHash, ...rest } = u
  return rest
}

// Ensure a single admin account exists (seeded from env)
async function ensureAdmin(db) {
  const existing = await db.collection('users').findOne({ role: 'admin' })
  if (existing) return
  const username = (process.env.ADMIN_USERNAME || 'hutch').toLowerCase()
  const password = process.env.ADMIN_PASSWORD || 'admin1234'
  const email = process.env.ADMIN_EMAIL || 'admin@tensorstrength.com'
  const passwordHash = await bcrypt.hash(password, 10)
  await db.collection('users').insertOne({
    id: uuidv4(),
    username,
    email,
    passwordHash,
    role: 'admin',
    portalAccess: true,
    createdAt: new Date(),
  })
}

async function getCurrentUser(request, db) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload?.id) return null
  const u = await db.collection('users').findOne({ id: payload.id })
  return u || null
}

function setAuthCookie(response, token) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: true,
    maxAge: 60 * 60 * 24 * 7,
  })
  return response
}

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()
    await ensureAdmin(db)

    if ((route === '/' || route === '/root') && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'Tensor Strength API' }))
    }

    // ---------------- AUTH ----------------
    if (route === '/auth/register' && method === 'POST') {
      const body = await request.json()
      const username = (body.username || '').trim().toLowerCase()
      const email = (body.email || '').trim().toLowerCase()
      const password = body.password || ''
      if (username.length < 3 || password.length < 6 || !email) {
        return handleCORS(NextResponse.json(
          { error: 'Username (3+ chars), a valid email, and password (6+ chars) are required.' },
          { status: 400 }
        ))
      }
      const dup = await db.collection('users').findOne({ $or: [{ username }, { email }] })
      if (dup) {
        return handleCORS(NextResponse.json(
          { error: 'That username or email is already registered.' },
          { status: 409 }
        ))
      }
      const passwordHash = await bcrypt.hash(password, 10)
      const user = {
        id: uuidv4(),
        username,
        email,
        passwordHash,
        role: 'member',
        portalAccess: false,
        createdAt: new Date(),
      }
      await db.collection('users').insertOne(user)
      const token = await signToken({ id: user.id, role: user.role })
      const res = NextResponse.json({ user: publicUser(user) })
      return handleCORS(setAuthCookie(res, token))
    }

    if (route === '/auth/login' && method === 'POST') {
      const body = await request.json()
      const identifier = (body.username || '').trim().toLowerCase()
      const password = body.password || ''
      const user = await db.collection('users').findOne({
        $or: [{ username: identifier }, { email: identifier }],
      })
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return handleCORS(NextResponse.json(
          { error: 'Invalid username or password.' },
          { status: 401 }
        ))
      }
      const token = await signToken({ id: user.id, role: user.role })
      const res = NextResponse.json({ user: publicUser(user) })
      return handleCORS(setAuthCookie(res, token))
    }

    if (route === '/auth/logout' && method === 'POST') {
      const res = NextResponse.json({ ok: true })
      res.cookies.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 })
      return handleCORS(res)
    }

    if (route === '/auth/me' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      }
      return handleCORS(NextResponse.json({ user: publicUser(user) }))
    }

    // ---------------- ADMIN ----------------
    if (route === '/admin/users' && method === 'GET') {
      const admin = await getCurrentUser(request, db)
      if (!admin || admin.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const users = await db.collection('users')
        .find({})
        .sort({ createdAt: -1 })
        .limit(1000)
        .toArray()
      return handleCORS(NextResponse.json({ users: users.map(publicUser) }))
    }

    if (route === '/admin/users' && method === 'PUT') {
      const admin = await getCurrentUser(request, db)
      if (!admin || admin.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const body = await request.json()
      if (!body.id) {
        return handleCORS(NextResponse.json({ error: 'id is required' }, { status: 400 }))
      }
      await db.collection('users').updateOne(
        { id: body.id },
        { $set: { portalAccess: !!body.portalAccess } }
      )
      const updated = await db.collection('users').findOne({ id: body.id })
      return handleCORS(NextResponse.json({ user: publicUser(updated) }))
    }

    if (route === '/admin/users' && method === 'DELETE') {
      const admin = await getCurrentUser(request, db)
      if (!admin || admin.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const body = await request.json()
      if (!body.id) {
        return handleCORS(NextResponse.json({ error: 'id is required' }, { status: 400 }))
      }
      const target = await db.collection('users').findOne({ id: body.id })
      if (target?.role === 'admin') {
        return handleCORS(NextResponse.json({ error: 'Cannot delete an admin account.' }, { status: 400 }))
      }
      await db.collection('users').deleteOne({ id: body.id })
      return handleCORS(NextResponse.json({ ok: true }))
    }

    // ---------------- CLIENT CHECK-IN (stored in Mongo) ----------------
    if (route === '/checkins' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.portalAccess) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const body = await request.json()
      const checkin = {
        id: uuidv4(),
        userId: user.id,
        username: user.username,
        ...body,
        createdAt: new Date(),
      }
      await db.collection('checkins').insertOne(checkin)
      const { _id, ...clean } = checkin
      return handleCORS(NextResponse.json(clean))
    }

    // ---------------- STATUS (template) ----------------
    if (route === '/status' && method === 'POST') {
      const body = await request.json()
      if (!body.client_name) {
        return handleCORS(NextResponse.json({ error: 'client_name is required' }, { status: 400 }))
      }
      const statusObj = { id: uuidv4(), client_name: body.client_name, timestamp: new Date() }
      await db.collection('status_checks').insertOne(statusObj)
      return handleCORS(NextResponse.json(statusObj))
    }

    if (route === '/status' && method === 'GET') {
      const statusChecks = await db.collection('status_checks').find({}).limit(1000).toArray()
      return handleCORS(NextResponse.json(statusChecks.map(({ _id, ...rest }) => rest)))
    }

    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
