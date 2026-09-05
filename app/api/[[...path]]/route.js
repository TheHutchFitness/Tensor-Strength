import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import Stripe from 'stripe'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

// ---- Durable object storage (Cloudflare R2 / S3-compatible) ----
// When S3_* env vars are set, uploads go to R2 (survive pod redeploys) and are
// served back through the /api/files/<key> proxy on our own domain. If not
// configured, we transparently fall back to local disk so nothing breaks.
let s3Client
function getS3() {
  if (s3Client) return s3Client
  s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  })
  return s3Client
}
function r2Enabled() {
  return !!(process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY)
}
// Persist an upload buffer and return a browser-usable URL string.
// Records a per-file ACL doc (owner + visibility) so the /api/files proxy can
// enforce who may read it. visibility: 'public' (any logged-in member) or
// 'private' (owner + their assigned trainer/client + admin only).
async function saveUploadBuffer(db, buffer, ext, mime, ownerId, visibility) {
  const filename = uuidv4() + '.' + ext
  if (r2Enabled()) {
    const key = 'uploads/' + filename
    await getS3().send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mime || 'application/octet-stream',
      ContentLength: buffer.length,
      CacheControl: 'public, max-age=31536000, immutable',
    }))
    try {
      await db.collection('uploads').updateOne(
        { key },
        { $set: { key, ownerId: ownerId || null, visibility: visibility === 'public' ? 'public' : 'private', mime: mime || '', createdAt: new Date() } },
        { upsert: true }
      )
    } catch (e) { console.error('upload ACL write failed:', e?.message) }
    return '/api/files/' + key
  }
  const dir = process.cwd() + '/public/uploads'
  await mkdir(dir, { recursive: true })
  await writeFile(dir + '/' + filename, buffer)
  return '/uploads/' + filename
}

// MongoDB connection
let client
let db
let connectPromise

async function connectToMongo() {
  if (db) return db
  if (!connectPromise) {
    connectPromise = (async () => {
      client = new MongoClient(process.env.MONGO_URL)
      await client.connect()
      db = client.db(process.env.DB_NAME)
      return db
    })().catch((e) => {
      // Reset so a later request can retry a fresh connection.
      connectPromise = undefined
      client = undefined
      db = undefined
      throw e
    })
  }
  return connectPromise
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

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'trainer'
}

// Public-facing trainer profile shape (used on homepage + profile pages).
function publicTrainerProfile(u) {
  if (!u) return null
  const p = u.trainerProfile || {}
  return {
    slug: u.slug || slugify(u.username),
    name: p.displayName || u.username,
    title: p.trainerType || 'Coach',
    photo: p.photo || '',
    location: p.location || '',
    shortBio: p.shortBio || (p.bio ? String(p.bio).slice(0, 160) : ''),
    bio: p.bio ? String(p.bio).split('\n').map((x) => x.trim()).filter(Boolean) : [],
    credentials: Array.isArray(p.certifications) ? p.certifications : [],
    specialties: Array.isArray(p.specialties) ? p.specialties : [],
    testimonials: [],
  }
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

// ---------------- STRIPE ----------------
// Prefer the user's own Stripe account (STRIPE_SECRET_KEY -> api.stripe.com).
// Fall back to the Emergent-managed sandbox proxy when no own key is set.
const OWN_STRIPE_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_KEY = OWN_STRIPE_KEY || process.env.STRIPE_API_KEY
const STRIPE_BASE = OWN_STRIPE_KEY
  ? 'https://api.stripe.com/v1'
  : (process.env.INTEGRATION_PROXY_URL || 'https://integrations.emergentagent.com') + '/stripe/v1'
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
// Support multiple endpoints (e.g. preview + production), each with its own secret.
const WEBHOOK_SECRETS = [
  process.env.STRIPE_WEBHOOK_SECRET,
  ...((process.env.STRIPE_WEBHOOK_SECRETS || '').split(',')),
]
  .map((s) => (s || '').trim())
  .filter(Boolean)
// SDK instance is only used for webhook signature verification (own Stripe account).
const stripeSdk = OWN_STRIPE_KEY ? new Stripe(OWN_STRIPE_KEY) : null

// Server-side price allowlist. NEVER trust amounts from the client.
const PACKAGES = {
  monthly_9_99: {
    label: 'Tensor Strength Membership',
    mode: 'subscription',
    amount: 999,
    currency: 'usd',
    interval: 'month',
    accessType: 'membership',
  },
  yearly_90: {
    label: 'Tensor Strength Membership (Annual)',
    mode: 'subscription',
    amount: 9000,
    currency: 'usd',
    interval: 'year',
    accessType: 'membership',
  },
  custom_program_200: {
    label: 'Custom Program',
    mode: 'payment',
    amount: 20000,
    currency: 'usd',
    accessType: 'custom_program',
  },
  remote_coaching_400: {
    label: 'Remote Coaching',
    mode: 'subscription',
    amount: 40000,
    currency: 'usd',
    interval: 'month',
    accessType: 'remote_coaching',
  },
}

async function createStripeSession(pkg, { successUrl, cancelUrl, metadata, email }) {
  const params = new URLSearchParams()
  params.set('mode', pkg.mode)
  params.set('success_url', successUrl)
  params.set('cancel_url', cancelUrl)
  params.set('allow_promotion_codes', 'true')
  if (email) {
    // Prefill + ensure Stripe has an address for automatic receipts.
    params.set('customer_email', email)
    if (pkg.mode === 'payment') {
      params.set('payment_intent_data[receipt_email]', email)
    }
  }
  params.set('line_items[0][quantity]', '1')
  params.set('line_items[0][price_data][currency]', pkg.currency)
  params.set('line_items[0][price_data][product_data][name]', pkg.label)
  params.set('line_items[0][price_data][unit_amount]', String(pkg.amount))
  if (pkg.mode === 'subscription') {
    params.set('line_items[0][price_data][recurring][interval]', pkg.interval)
  }
  for (const [k, v] of Object.entries(metadata || {})) {
    params.set(`metadata[${k}]`, String(v))
    // Also stamp the subscription object so cancel/renewal webhooks can find the user.
    if (pkg.mode === 'subscription') {
      params.set(`subscription_data[metadata][${k}]`, String(v))
    }
  }
  const r = await fetch(`${STRIPE_BASE}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data?.error?.message || 'Stripe session create failed')
  return { id: data.id, url: data.url }
}

async function getStripeSession(sessionId) {
  const r = await fetch(`${STRIPE_BASE}/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  })
  // Sandbox has a short propagation delay right after creation -> treat as pending.
  if (r.status === 404) return { pending: true }
  let data
  try {
    data = await r.json()
  } catch {
    return { pending: true }
  }
  if (!r.ok) return { pending: true }
  return {
    status: data.status,
    payment_status: data.payment_status,
    amount_total: data.amount_total,
    currency: data.currency,
    subscription: data.subscription,
    customer: data.customer,
    metadata: data.metadata || {},
  }
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

    // ---- Serve uploaded files from durable R2 storage (access-controlled proxy) ----
    // Every uploaded object has an ACL doc (owner + visibility). Access rules:
    //   • Any request must be from a logged-in user (blocks anonymous URL leaks).
    //   • 'public' files (profile photos, forum media): any logged-in member.
    //   • 'private' files (trainer<->client files, message media): owner, their
    //     assigned trainer/client, or an admin only.
    if (path[0] === 'files' && method === 'GET') {
      const key = path.slice(1).join('/')
      if (!key || !key.startsWith('uploads/') || key.includes('..')) {
        return handleCORS(NextResponse.json({ error: 'Invalid key' }, { status: 400 }))
      }
      if (!r2Enabled()) {
        return handleCORS(NextResponse.json({ error: 'Storage not configured' }, { status: 404 }))
      }
      const me = await getCurrentUser(request, db)
      if (!me) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const meta = await db.collection('uploads').findOne({ key })
      if (meta && meta.visibility === 'private') {
        let allowed = me.role === 'admin' || me.id === meta.ownerId
        if (!allowed && meta.ownerId) {
          const owner = await db.collection('users').findOne({ id: meta.ownerId })
          // Allow the two parties of an assigned trainer<->client relationship.
          if (owner && (owner.assignedTrainerId === me.id || me.assignedTrainerId === owner.id)) {
            allowed = true
          }
        }
        if (!allowed) return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      try {
        const obj = await getS3().send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }))
        const bytes = await obj.Body.transformToByteArray()
        return new NextResponse(Buffer.from(bytes), {
          status: 200,
          headers: {
            'Content-Type': obj.ContentType || 'application/octet-stream',
            'Content-Length': String(bytes.length),
            'Cache-Control': 'private, max-age=31536000, immutable',
          },
        })
      } catch (e) {
        console.error('R2 fetch error:', e?.name, e?.message)
        return handleCORS(NextResponse.json({ error: 'File not found' }, { status: 404 }))
      }
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
        demoSource: (body.demoSource ? String(body.demoSource).slice(0, 80) : null),
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

    // Emergent-managed Google sign-in: exchange the one-time session_id for the
    // Google identity, then find-or-create the local user and issue our ts_token.
    if (route === '/auth/emergent' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const sessionId = (body.session_id || '').trim()
      if (!sessionId || sessionId.length > 512) {
        return handleCORS(NextResponse.json({ error: 'Invalid session_id' }, { status: 400 }))
      }
      let data
      try {
        const upstream = await fetch(
          'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
          { method: 'GET', headers: { 'X-Session-ID': sessionId }, cache: 'no-store' }
        )
        if (!upstream.ok) {
          return handleCORS(NextResponse.json({ error: 'Google sign-in was rejected. Please try again.' }, { status: 401 }))
        }
        data = await upstream.json()
      } catch (e) {
        console.error('Emergent session exchange failed:', e)
        return handleCORS(NextResponse.json({ error: 'Could not reach the sign-in service.' }, { status: 502 }))
      }
      const email = String(data.email || '').trim().toLowerCase()
      const name = String(data.name || '').trim()
      const picture = String(data.picture || '').trim()
      if (!email) {
        return handleCORS(NextResponse.json({ error: 'Google did not return an email.' }, { status: 502 }))
      }
      let user = await db.collection('users').findOne({ email })
      if (!user) {
        // Derive a unique, valid username from the Google name / email.
        let base = slugify(name || email.split('@')[0]).replace(/-/g, '')
        if (base.length < 3) base = 'user' + base
        let username = base
        let n = 1
        while (await db.collection('users').findOne({ username })) {
          username = base + ++n
        }
        user = {
          id: uuidv4(),
          username,
          email,
          passwordHash: null,        // social-only account
          role: 'member',
          portalAccess: false,
          isTrainer: false,
          authProvider: 'google',
          picture,
          createdAt: new Date(),
        }
        await db.collection('users').insertOne(user)
      } else {
        // Keep provider metadata fresh; never overwrite role/portalAccess/isTrainer.
        await db.collection('users').updateOne(
          { id: user.id },
          { $set: { authProvider: user.authProvider || 'google', picture: picture || user.picture || '', lastLoginAt: new Date() } }
        )
        user = await db.collection('users').findOne({ id: user.id })
      }
      const token = await signToken({ id: user.id, role: user.role })
      const res = NextResponse.json({ user: publicUser(user) })
      return handleCORS(setAuthCookie(res, token))
    }

    // ---- Demo → signup attribution (public: which tool demo was opened) ----
    if (route === '/analytics/demo' && method === 'POST') {
      const b = await request.json().catch(() => ({}))
      const tool = String(b.tool || '').slice(0, 80).trim()
      if (tool) {
        await db.collection('demo_analytics').updateOne(
          { tool },
          { $inc: { opens: 1 }, $set: { updatedAt: new Date() } },
          { upsert: true }
        )
      }
      return handleCORS(NextResponse.json({ ok: true }))
    }
    if (route === '/admin/demo-analytics' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || user.role !== 'admin') return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const opens = await db.collection('demo_analytics').find({}).sort({ opens: -1 }).toArray()
      const signups = await db.collection('users').aggregate([
        { $match: { demoSource: { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$demoSource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray()
      return handleCORS(NextResponse.json({
        opens: opens.map(({ _id, ...r }) => r),
        signups: signups.map((s) => ({ tool: s._id, count: s.count })),
      }))
    }

    // ---------------- COACHING SHOWCASE CONTENT ----------------
    // Public: fetch admin-editable captions + clip order
    if (route === '/coaching-content' && method === 'GET') {
      const doc = await db.collection('site_content').findOne({ key: 'coaching' })
      return handleCORS(NextResponse.json({
        labels: doc?.labels || {},
        order: Array.isArray(doc?.order) ? doc.order : [],
        featuredLabel: doc?.featuredLabel || null,
        featuredEnabled: doc?.featuredEnabled !== false,
      }))
    }
    // Admin: save captions + clip order
    if (route === '/admin/coaching-content' && method === 'PUT') {
      const admin = await getCurrentUser(request, db)
      if (!admin || admin.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const body = await request.json()
      const update = { key: 'coaching', updatedAt: new Date() }
      if (body.labels && typeof body.labels === 'object') {
        const clean = {}
        for (const [k, v] of Object.entries(body.labels)) {
          if (typeof k === 'string' && typeof v === 'string') {
            clean[k.slice(0, 200)] = v.slice(0, 120)
          }
        }
        update.labels = clean
      }
      if (Array.isArray(body.order)) {
        update.order = body.order.filter((s) => typeof s === 'string').map((s) => s.slice(0, 200)).slice(0, 200)
      }
      if (typeof body.featuredLabel === 'string') {
        update.featuredLabel = body.featuredLabel.slice(0, 120)
      }
      if (typeof body.featuredEnabled === 'boolean') {
        update.featuredEnabled = body.featuredEnabled
      }
      await db.collection('site_content').updateOne(
        { key: 'coaching' },
        { $set: update },
        { upsert: true }
      )
      const doc = await db.collection('site_content').findOne({ key: 'coaching' })
      return handleCORS(NextResponse.json({
        ok: true,
        labels: doc?.labels || {},
        order: Array.isArray(doc?.order) ? doc.order : [],
        featuredLabel: doc?.featuredLabel || null,
        featuredEnabled: doc?.featuredEnabled !== false,
      }))
    }

    // ---------------- COACH VIDEO TESTIMONIALS ----------------
    // Public: per-coach video testimonial overrides { coaches: { slug: {video...} } }
    if (route === '/coach-content' && method === 'GET') {
      const doc = await db.collection('site_content').findOne({ key: 'coaches' })
      return handleCORS(NextResponse.json({ coaches: doc?.coaches || {} }))
    }
    // Admin: set/clear a coach's video testimonial
    if (route === '/admin/coach-content' && method === 'PUT') {
      const admin = await getCurrentUser(request, db)
      if (!admin || admin.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const body = await request.json()
      const slug = (typeof body.slug === 'string' ? body.slug : '').trim().toLowerCase().slice(0, 80)
      if (!slug) {
        return handleCORS(NextResponse.json({ error: 'slug is required' }, { status: 400 }))
      }
      const doc = await db.collection('site_content').findOne({ key: 'coaches' })
      const coaches = doc?.coaches || {}
      const vt = body.videoTestimonial
      if (vt === null || (vt && typeof vt.src === 'string' && vt.src.trim() === '')) {
        // clear
        delete coaches[slug]
      } else if (vt && typeof vt === 'object' && typeof vt.src === 'string') {
        coaches[slug] = {
          src: vt.src.slice(0, 300),
          poster: typeof vt.poster === 'string' ? vt.poster.slice(0, 300) : '',
          name: typeof vt.name === 'string' ? vt.name.slice(0, 120) : '',
          detail: typeof vt.detail === 'string' ? vt.detail.slice(0, 120) : '',
        }
      } else {
        return handleCORS(NextResponse.json({ error: 'videoTestimonial.src is required' }, { status: 400 }))
      }
      await db.collection('site_content').updateOne(
        { key: 'coaches' },
        { $set: { key: 'coaches', coaches, updatedAt: new Date() } },
        { upsert: true }
      )
      return handleCORS(NextResponse.json({ ok: true, coaches }))
    }

    // ---------------- WORKOUT TRACKER CLOUD SYNC ----------------
    // Per-account workouts + templates (source of truth across devices)
    if (route === '/client/tracker' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const doc = await db.collection('tracker').findOne({ userId: user.id })
      return handleCORS(NextResponse.json({
        workouts: Array.isArray(doc?.workouts) ? doc.workouts : [],
        templates: Array.isArray(doc?.templates) ? doc.templates : [],
      }))
    }
    if (route === '/client/tracker' && method === 'PUT') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const body = await request.json()
      const workouts = Array.isArray(body.workouts) ? body.workouts.slice(0, 500) : []
      const templates = Array.isArray(body.templates) ? body.templates.slice(0, 200) : []
      await db.collection('tracker').updateOne(
        { userId: user.id },
        { $set: { userId: user.id, workouts, templates, updatedAt: new Date() } },
        { upsert: true }
      )
      return handleCORS(NextResponse.json({ ok: true, workouts, templates }))
    }

    // ---------------- COACH ASSIGN TEMPLATE (trainer -> client) ----------------
    // Trainer (or admin) pushes a template into a client's tracker.
    if (route === '/trainer/assign-template' && method === 'POST') {
      const coach = await getCurrentUser(request, db)
      if (!coach || (coach.role !== 'admin' && !coach.isTrainer)) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const body = await request.json()
      const clientId = typeof body.clientId === 'string' ? body.clientId : ''
      const template = body.template
      if (!clientId || !template || typeof template !== 'object' || !Array.isArray(template.exercises)) {
        return handleCORS(NextResponse.json({ error: 'clientId and template are required' }, { status: 400 }))
      }
      const client = await db.collection('users').findOne({ id: clientId })
      if (!client) return handleCORS(NextResponse.json({ error: 'Client not found' }, { status: 404 }))
      // Trainers may only push to their own assigned clients (admins to anyone)
      if (coach.role !== 'admin' && client.assignedTrainerId !== coach.id) {
        return handleCORS(NextResponse.json({ error: 'Not your client' }, { status: 403 }))
      }
      const clean = {
        id: Math.random().toString(36).slice(2),
        name: (typeof template.name === 'string' ? template.name : 'Coach Template').slice(0, 120),
        coachName: (coach.username || 'Coach').slice(0, 80),
        exercises: template.exercises.slice(0, 40).map((ex) => ({
          id: Math.random().toString(36).slice(2),
          name: (typeof ex.name === 'string' ? ex.name : '').slice(0, 120),
          cue: typeof ex.cue === 'string' ? ex.cue.slice(0, 200) : '',
          sets: Array.isArray(ex.sets) ? ex.sets.slice(0, 12).map((s) => ({
            id: Math.random().toString(36).slice(2),
            weight: typeof s.weight === 'string' ? s.weight.slice(0, 12) : '',
            reps: typeof s.reps === 'string' ? s.reps.slice(0, 12) : '',
            rpe: typeof s.rpe === 'string' ? s.rpe.slice(0, 8) : '',
          })) : [],
        })),
      }
      const doc = await db.collection('tracker').findOne({ userId: clientId })
      const templates = Array.isArray(doc?.templates) ? doc.templates : []
      templates.unshift(clean)
      await db.collection('tracker').updateOne(
        { userId: clientId },
        { $set: { userId: clientId, templates: templates.slice(0, 200), workouts: Array.isArray(doc?.workouts) ? doc.workouts : [], updatedAt: new Date() } },
        { upsert: true }
      )
      return handleCORS(NextResponse.json({ ok: true }))
    }

    // ---------------- COACH SAVED TEMPLATES (reusable across clients) ----------------
    if (route === '/trainer/templates' && method === 'GET') {
      const coach = await getCurrentUser(request, db)
      if (!coach || (coach.role !== 'admin' && !coach.isTrainer)) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const doc = await db.collection('coach_templates').findOne({ coachId: coach.id })
      return handleCORS(NextResponse.json({ templates: Array.isArray(doc?.templates) ? doc.templates : [] }))
    }
    if (route === '/trainer/templates' && method === 'PUT') {
      const coach = await getCurrentUser(request, db)
      if (!coach || (coach.role !== 'admin' && !coach.isTrainer)) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const body = await request.json()
      const templates = Array.isArray(body.templates) ? body.templates.slice(0, 100) : []
      await db.collection('coach_templates').updateOne(
        { coachId: coach.id },
        { $set: { coachId: coach.id, templates, updatedAt: new Date() } },
        { upsert: true }
      )
      return handleCORS(NextResponse.json({ ok: true, templates }))
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
      const target = await db.collection('users').findOne({ id: body.id })
      const update = { portalAccessUpdatedAt: new Date() }
      if (typeof body.portalAccess === 'boolean') {
        update.portalAccess = body.portalAccess
        if (body.portalAccess && !target?.accessType) update.accessType = 'in_person'
      }
      if (typeof body.isTrainer === 'boolean') {
        update.isTrainer = body.isTrainer
        // If demoting a trainer, unassign every client that pointed to them.
        if (body.isTrainer === false) {
          await db.collection('users').updateMany(
            { assignedTrainerId: body.id },
            { $set: { assignedTrainerId: null } }
          )
        }
      }
      // Assign (or clear) the trainer this member is coached by.
      if ('assignedTrainerId' in body) {
        const tid = body.assignedTrainerId || null
        if (tid) {
          const trainer = await db.collection('users').findOne({ id: tid })
          if (!trainer || !trainer.isTrainer) {
            return handleCORS(NextResponse.json({ error: 'Selected trainer is not a valid trainer.' }, { status: 400 }))
          }
        }
        update.assignedTrainerId = tid
      }
      // Admin-set a new password for a member (no email flow needed).
      if (typeof body.newPassword === 'string' && body.newPassword.length > 0) {
        if (body.newPassword.length < 6) {
          return handleCORS(NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 }))
        }
        update.passwordHash = await bcrypt.hash(body.newPassword, 10)
      }
      await db.collection('users').updateOne({ id: body.id }, { $set: update })
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

    // ---------------- TRAINER PORTAL ----------------
    // Trainer sees the clients assigned to them by the admin.
    if (route === '/trainer/clients' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const clients = await db.collection('users')
        .find({ assignedTrainerId: user.id })
        .sort({ createdAt: -1 })
        .toArray()
      // Attach the latest check-in date + count so the trainer sees activity at a glance.
      const withMeta = await Promise.all(
        clients.map(async (c) => {
          const count = await db.collection('checkins').countDocuments({ userId: c.id })
          const unseen = await db.collection('checkins').countDocuments({ userId: c.id, seenByTrainer: { $ne: true } })
          const latest = await db.collection('checkins')
            .find({ userId: c.id })
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray()
          return {
            ...publicUser(c),
            checkinCount: count,
            unseenCheckins: unseen,
            lastCheckinAt: latest[0]?.createdAt || null,
          }
        })
      )
      return handleCORS(NextResponse.json({ clients: withMeta }))
    }

    // Total unseen check-ins across this trainer's clients (notification badge).
    if (route === '/trainer/checkins-unseen' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) {
        return handleCORS(NextResponse.json({ count: 0 }))
      }
      const clients = await db.collection('users').find({ assignedTrainerId: user.id }).toArray()
      const ids = clients.map((c) => c.id)
      const count = ids.length
        ? await db.collection('checkins').countDocuments({ userId: { $in: ids }, seenByTrainer: { $ne: true } })
        : 0
      return handleCORS(NextResponse.json({ count }))
    }

    // Trainer views the check-in history for one of THEIR assigned clients.
    if (route === '/trainer/checkins' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const clientId = request.nextUrl.searchParams.get('clientId')
      if (!clientId) {
        return handleCORS(NextResponse.json({ error: 'clientId is required' }, { status: 400 }))
      }
      const client = await db.collection('users').findOne({ id: clientId })
      // Only allow if the client is assigned to this trainer (admins can view any).
      if (!client || (user.role !== 'admin' && client.assignedTrainerId !== user.id)) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const checkins = await db.collection('checkins')
        .find({ userId: clientId })
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray()
      // Mark this client's check-ins as seen by the trainer (clears the badge).
      if (user.isTrainer) {
        await db.collection('checkins').updateMany(
          { userId: clientId, seenByTrainer: { $ne: true } },
          { $set: { seenByTrainer: true } }
        )
      }
      const clean = checkins.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json({
        client: {
          id: client.id,
          username: client.username,
          email: client.email,
          profile: client.clientProfile || null,
        },
        checkins: clean,
      }))
    }

    // Trainer adds/updates a private note on one of their client's check-ins.
    if (route === '/trainer/checkins' && method === 'PATCH') {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const body = await request.json()
      if (!body.checkinId) {
        return handleCORS(NextResponse.json({ error: 'checkinId is required' }, { status: 400 }))
      }
      const ci = await db.collection('checkins').findOne({ id: body.checkinId })
      if (!ci) return handleCORS(NextResponse.json({ error: 'Check-in not found' }, { status: 404 }))
      const client = await db.collection('users').findOne({ id: ci.userId })
      if (!client || (user.role !== 'admin' && client.assignedTrainerId !== user.id)) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      await db.collection('checkins').updateOne(
        { id: body.checkinId },
        { $set: { trainerNote: String(body.note || ''), trainerNoteUpdatedAt: new Date() } }
      )
      const updated = await db.collection('checkins').findOne({ id: body.checkinId })
      const { _id, ...clean } = updated
      return handleCORS(NextResponse.json({ checkin: clean }))
    }

    // ---- Trainer profile: get / save (first-entry onboarding) ----
    if (route === '/trainer/profile' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      return handleCORS(NextResponse.json({
        profile: user.trainerProfile || null,
        completed: !!user.profileCompleted,
        slug: user.slug || null,
      }))
    }

    if (route === '/trainer/profile' && method === 'PUT') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.isTrainer) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const body = await request.json()
      const photo = (body.photo || '').trim()
      const bio = (body.bio || '').trim()
      const trainerType = (body.trainerType || '').trim()
      if (!photo || !bio || !trainerType) {
        return handleCORS(NextResponse.json({ error: 'Photo, bio and trainer type are required.' }, { status: 400 }))
      }
      const certifications = Array.isArray(body.certifications)
        ? body.certifications.map((c) => String(c).trim()).filter(Boolean)
        : []
      const specialties = Array.isArray(body.specialties)
        ? body.specialties.map((c) => String(c).trim()).filter(Boolean)
        : []
      const trainerProfile = {
        displayName: (body.displayName || user.username || '').trim() || user.username,
        photo,
        bio,
        shortBio: (body.shortBio || bio).slice(0, 200),
        trainerType,
        location: (body.location || '').trim(),
        certifications,
        specialties,
      }
      // Generate a unique slug once.
      let slug = user.slug
      if (!slug) {
        const base = slugify(trainerProfile.displayName || user.username)
        slug = base
        let n = 1
        while (await db.collection('users').findOne({ slug, id: { $ne: user.id } })) {
          slug = base + '-' + (++n)
        }
      }
      await db.collection('users').updateOne(
        { id: user.id },
        { $set: { trainerProfile, profileCompleted: true, slug } }
      )
      return handleCORS(NextResponse.json({ profile: trainerProfile, completed: true, slug }))
    }

    // ---- Public professionals (trainers who completed a profile) ----
    if (route === '/professionals' && method === 'GET') {
      const list = await db.collection('users')
        .find({ isTrainer: true, profileCompleted: true })
        .sort({ createdAt: 1 })
        .toArray()
      return handleCORS(NextResponse.json({ professionals: list.map(publicTrainerProfile) }))
    }
    if (path[0] === 'professionals' && path.length === 2 && method === 'GET') {
      const t = await db.collection('users').findOne({ slug: path[1], isTrainer: true, profileCompleted: true })
      if (!t) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      return handleCORS(NextResponse.json({ professional: publicTrainerProfile(t) }))
    }

    // ---- Programs: trainer creates, client reads ----
    if (route === '/trainer/programs' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.isTrainer) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const body = await request.json()
      const title = (body.title || '').trim()
      if (!title) return handleCORS(NextResponse.json({ error: 'A program title is required.' }, { status: 400 }))
      const exercises = Array.isArray(body.exercises)
        ? body.exercises
            .map((e) => ({
              name: String(e.name || '').trim(),
              cue: String(e.cue || '').trim(),
              sets: String(e.sets || '').trim(),
              reps: String(e.reps || '').trim(),
              load: String(e.load || '').trim(),
              notes: String(e.notes || '').trim(),
            }))
            .filter((e) => e.name)
        : []
      // clientId null => broadcast to all of this trainer's clients
      let clientId = body.clientId || null
      if (clientId) {
        const c = await db.collection('users').findOne({ id: clientId })
        if (!c || c.assignedTrainerId !== user.id) {
          return handleCORS(NextResponse.json({ error: 'That client is not assigned to you.' }, { status: 400 }))
        }
      }
      const program = {
        id: uuidv4(),
        trainerId: user.id,
        trainerName: user.username,
        clientId,
        title,
        notes: (body.notes || '').trim(),
        exercises,
        createdAt: new Date(),
      }
      await db.collection('programs').insertOne(program)
      const { _id, ...clean } = program
      return handleCORS(NextResponse.json(clean))
    }

    if (route === '/trainer/programs' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.isTrainer) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const list = await db.collection('programs')
        .find({ trainerId: user.id })
        .sort({ createdAt: -1 })
        .toArray()
      return handleCORS(NextResponse.json({ programs: list.map(({ _id, ...r }) => r) }))
    }

    if (route === '/trainer/programs' && method === 'DELETE') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.isTrainer) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const id = request.nextUrl.searchParams.get('id')
      if (!id) return handleCORS(NextResponse.json({ error: 'id is required' }, { status: 400 }))
      await db.collection('programs').deleteOne({ id, trainerId: user.id })
      return handleCORS(NextResponse.json({ ok: true }))
    }

    if (route === '/client/programs' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.portalAccess) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      if (!user.assignedTrainerId) return handleCORS(NextResponse.json({ programs: [] }))
      const list = await db.collection('programs')
        .find({ trainerId: user.assignedTrainerId, $or: [{ clientId: user.id }, { clientId: null }] })
        .sort({ createdAt: -1 })
        .toArray()
      return handleCORS(NextResponse.json({ programs: list.map(({ _id, ...r }) => r) }))
    }

    // ---- Coach meal templates (trainer pushes ready-to-log meals) ----
    if (route === '/trainer/meals' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.isTrainer) return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const b = await request.json()
      const name = (b.name || '').trim()
      if (!name) return handleCORS(NextResponse.json({ error: 'A meal name is required.' }, { status: 400 }))
      const items = Array.isArray(b.items)
        ? b.items.map((i) => ({
            name: String(i.name || '').trim(),
            label: String(i.label || '').trim(),
            cal: Number(i.cal) || 0,
            p: Number(i.p) || 0,
            c: Number(i.c) || 0,
            f: Number(i.f) || 0,
          })).filter((i) => i.name)
        : []
      let clientId = b.clientId || null
      if (clientId) {
        const c = await db.collection('users').findOne({ id: clientId })
        if (!c || c.assignedTrainerId !== user.id) {
          return handleCORS(NextResponse.json({ error: 'That client is not assigned to you.' }, { status: 400 }))
        }
      }
      const meal = { id: uuidv4(), trainerId: user.id, trainerName: user.username, clientId, name, items, createdAt: new Date() }
      await db.collection('coach_meals').insertOne(meal)
      const { _id, ...clean } = meal
      return handleCORS(NextResponse.json(clean))
    }
    if (route === '/trainer/meals' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.isTrainer) return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const list = await db.collection('coach_meals').find({ trainerId: user.id }).sort({ createdAt: -1 }).toArray()
      return handleCORS(NextResponse.json({ meals: list.map(({ _id, ...r }) => r) }))
    }
    if (route === '/trainer/meals' && method === 'DELETE') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.isTrainer) return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const id = request.nextUrl.searchParams.get('id')
      if (!id) return handleCORS(NextResponse.json({ error: 'id is required' }, { status: 400 }))
      await db.collection('coach_meals').deleteOne({ id, trainerId: user.id })
      return handleCORS(NextResponse.json({ ok: true }))
    }
    if (route === '/client/meals' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.portalAccess) return handleCORS(NextResponse.json({ meals: [] }))
      if (!user.assignedTrainerId) return handleCORS(NextResponse.json({ meals: [] }))
      const list = await db.collection('coach_meals')
        .find({ trainerId: user.assignedTrainerId, $or: [{ clientId: user.id }, { clientId: null }] })
        .sort({ createdAt: -1 }).toArray()
      return handleCORS(NextResponse.json({ meals: list.map(({ _id, ...r }) => r) }))
    }


    // ---- Client "About Me" profile (for trainer use) ----
    if (route === '/client/profile' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      return handleCORS(NextResponse.json({ profile: user.clientProfile || null }))
    }
    if (route === '/client/profile' && method === 'PUT') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const b = await request.json()
      const clientProfile = {
        squat: String(b.squat || '').trim(),
        bench: String(b.bench || '').trim(),
        deadlift: String(b.deadlift || '').trim(),
        overheadPress: String(b.overheadPress || '').trim(),
        diet: String(b.diet || '').trim(),
        gym: String(b.gym || '').trim(),
        workoutsPerWeek: String(b.workoutsPerWeek || '').trim(),
        activityLevel: String(b.activityLevel || '').trim(),
        restingHeartRate: String(b.restingHeartRate || '').trim(),
        currentCalories: String(b.currentCalories || '').trim(),
        notes: String(b.notes || '').trim(),
        updatedAt: new Date(),
      }
      await db.collection('users').updateOne({ id: user.id }, { $set: { clientProfile } })
      return handleCORS(NextResponse.json({ profile: clientProfile }))
    }

    // ---- Client nutrition sync (daily summary for coach view) ----
    if (route === '/client/nutrition' && method === 'PUT') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const b = await request.json()
      const date = String(b.date || '').slice(0, 10)
      if (!date) return handleCORS(NextResponse.json({ error: 'date is required' }, { status: 400 }))
      const doc = {
        userId: user.id,
        date,
        totals: {
          cal: Number(b.totals?.cal) || 0,
          p: Number(b.totals?.p) || 0,
          c: Number(b.totals?.c) || 0,
          f: Number(b.totals?.f) || 0,
        },
        goal: {
          calories: Number(b.goal?.calories) || 0,
          protein: Number(b.goal?.protein) || 0,
          carbs: Number(b.goal?.carbs) || 0,
          fat: Number(b.goal?.fat) || 0,
        },
        supplements: Array.isArray(b.supplements) ? b.supplements.map(String).slice(0, 60) : [],
        updatedAt: new Date(),
      }
      await db.collection('nutrition_logs').updateOne(
        { userId: user.id, date },
        { $set: doc },
        { upsert: true }
      )
      return handleCORS(NextResponse.json({ ok: true }))
    }

    // ---- Trainer views a client's nutrition (today + recent) ----
    if (route === '/trainer/client-nutrition' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const clientId = request.nextUrl.searchParams.get('clientId')
      if (!clientId) return handleCORS(NextResponse.json({ error: 'clientId is required' }, { status: 400 }))
      const client = await db.collection('users').findOne({ id: clientId })
      if (!client || (user.role !== 'admin' && client.assignedTrainerId !== user.id)) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10)
      const today = await db.collection('nutrition_logs').findOne({ userId: clientId, date })
      const recentRaw = await db.collection('nutrition_logs')
        .find({ userId: clientId })
        .sort({ date: -1 })
        .limit(7)
        .toArray()
      const strip = (d) => (d ? { date: d.date, totals: d.totals, goal: d.goal, supplements: d.supplements || [] } : null)
      return handleCORS(NextResponse.json({
        date,
        day: strip(today),
        recent: recentRaw.map(strip),
      }))
    }

    // ---- Client gets their assigned trainer (for messaging UI) ----
    if (route === '/client/trainer' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      if (!user.assignedTrainerId) return handleCORS(NextResponse.json({ trainer: null }))
      const t = await db.collection('users').findOne({ id: user.assignedTrainerId })
      if (!t) return handleCORS(NextResponse.json({ trainer: null }))
      return handleCORS(NextResponse.json({
        trainer: {
          id: t.id,
          name: t.trainerProfile?.displayName || t.username,
          photo: t.trainerProfile?.photo || '',
          trainerType: t.trainerProfile?.trainerType || 'Coach',
        },
      }))
    }

    // ---- Messaging (client <-> assigned trainer) ----
    if (route === '/messages' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const body = await request.json()
      const toUserId = body.toUserId
      const text = (body.body || '').trim()
      if (!toUserId || (!text && !body.mediaUrl)) {
        return handleCORS(NextResponse.json({ error: 'A recipient and a message or media are required.' }, { status: 400 }))
      }
      const other = await db.collection('users').findOne({ id: toUserId })
      if (!other) return handleCORS(NextResponse.json({ error: 'Recipient not found.' }, { status: 404 }))
      // Determine trainer/client pair and validate the assignment relationship.
      let trainerId, clientId, senderRole
      if (user.isTrainer && other.assignedTrainerId === user.id) {
        trainerId = user.id; clientId = other.id; senderRole = 'trainer'
      } else if (other.isTrainer && user.assignedTrainerId === other.id) {
        trainerId = other.id; clientId = user.id; senderRole = 'client'
      } else {
        return handleCORS(NextResponse.json({ error: 'You can only message your assigned trainer/client.' }, { status: 403 }))
      }
      const msg = {
        id: uuidv4(),
        trainerId,
        clientId,
        senderId: user.id,
        senderRole,
        body: text,
        mediaUrl: body.mediaUrl || null,
        mediaType: body.mediaType || null,
        read: false,
        createdAt: new Date(),
      }
      await db.collection('messages').insertOne(msg)
      const { _id, ...clean } = msg
      return handleCORS(NextResponse.json(clean))
    }

    if (route === '/messages' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const withUserId = request.nextUrl.searchParams.get('withUserId')
      if (!withUserId) return handleCORS(NextResponse.json({ error: 'withUserId is required' }, { status: 400 }))
      const other = await db.collection('users').findOne({ id: withUserId })
      if (!other) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      let trainerId, clientId
      if (user.isTrainer && other.assignedTrainerId === user.id) { trainerId = user.id; clientId = other.id }
      else if (other.isTrainer && user.assignedTrainerId === other.id) { trainerId = other.id; clientId = user.id }
      else return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const list = await db.collection('messages')
        .find({ trainerId, clientId })
        .sort({ createdAt: 1 })
        .limit(1000)
        .toArray()
      // Mark messages addressed TO the current user as read.
      await db.collection('messages').updateMany(
        { trainerId, clientId, senderId: { $ne: user.id }, read: false },
        { $set: { read: true } }
      )
      return handleCORS(NextResponse.json({ messages: list.map(({ _id, ...r }) => r) }))
    }

    // Unread count for the current user (notification badge).
    if (route === '/messages/unread' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ count: 0 }))
      const count = await db.collection('messages').countDocuments({
        read: false,
        senderId: { $ne: user.id },
        $or: [
          { trainerId: user.id },
          { clientId: user.id },
        ],
      })
      return handleCORS(NextResponse.json({ count }))
    }

    // Trainer's message threads (one per assigned client, with unread counts).
    if (route === '/trainer/threads' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.isTrainer) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const clients = await db.collection('users').find({ assignedTrainerId: user.id }).toArray()
      const threads = await Promise.all(clients.map(async (c) => {
        const last = await db.collection('messages')
          .find({ trainerId: user.id, clientId: c.id })
          .sort({ createdAt: -1 }).limit(1).toArray()
        const unread = await db.collection('messages').countDocuments({
          trainerId: user.id, clientId: c.id, senderId: { $ne: user.id }, read: false,
        })
        return {
          clientId: c.id,
          username: c.username,
          email: c.email,
          lastMessage: last[0] ? { body: last[0].body, senderRole: last[0].senderRole, createdAt: last[0].createdAt, mediaType: last[0].mediaType } : null,
          unread,
        }
      }))
      threads.sort((a, b) => {
        const ta = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0
        const tb = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0
        return tb - ta
      })
      return handleCORS(NextResponse.json({ threads }))
    }

    // ---- Generic file upload (PDFs, docs, images, video) — 50MB cap ----
    if (route === '/uploads/file' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      try {
        const form = await request.formData()
        const file = form.get('file')
        if (!file || typeof file === 'string') {
          return handleCORS(NextResponse.json({ error: 'No file provided' }, { status: 400 }))
        }
        const size = file.size || 0
        if (size > 50 * 1024 * 1024) {
          return handleCORS(NextResponse.json({ error: 'File too large (max 50MB).' }, { status: 400 }))
        }
        const mime = file.type || 'application/octet-stream'
        const origName = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
        const rawExt = origName.includes('.') ? origName.split('.').pop().toLowerCase() : ''
        // Allowlist safe extensions only — never persist HTML/SVG/scripts that could
        // execute on our own origin (SEC-001).
        const ALLOWED = new Set(['png','jpg','jpeg','webp','gif','heic','heif','mp4','mov','webm','m4v','pdf','doc','docx','xls','xlsx','csv','txt'])
        if (!ALLOWED.has(rawExt)) {
          return handleCORS(NextResponse.json({ error: 'That file type is not allowed. Use images, video, PDF or documents.' }, { status: 400 }))
        }
        const dotExt = rawExt
        const buffer = Buffer.from(await file.arrayBuffer())
        // Private by default; callers pass visibility=public only for member-visible
        // assets like coach profile photos.
        const visibility = (form.get('visibility') === 'public') ? 'public' : 'private'
        const url = await saveUploadBuffer(db, buffer, dotExt, mime, user.id, visibility)
        return handleCORS(NextResponse.json({ url, name: origName, size, mime }))
      } catch (e) {
        console.error('File upload error:', e)
        return handleCORS(NextResponse.json({ error: 'Upload failed' }, { status: 500 }))
      }
    }

    // ---- Trainer files (drop files for clients) ----
    if (route === '/trainer/files' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.isTrainer) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const body = await request.json()
      if (!body.url || !body.name) {
        return handleCORS(NextResponse.json({ error: 'A file url and name are required.' }, { status: 400 }))
      }
      let clientId = body.clientId || null
      if (clientId) {
        const c = await db.collection('users').findOne({ id: clientId })
        if (!c || c.assignedTrainerId !== user.id) {
          return handleCORS(NextResponse.json({ error: 'That client is not assigned to you.' }, { status: 400 }))
        }
      }
      const doc = {
        id: uuidv4(),
        trainerId: user.id,
        trainerName: user.username,
        clientId,
        name: body.name,
        url: body.url,
        size: body.size || 0,
        mime: body.mime || '',
        createdAt: new Date(),
      }
      await db.collection('trainerFiles').insertOne(doc)
      const { _id, ...clean } = doc
      return handleCORS(NextResponse.json(clean))
    }

    if (route === '/trainer/files' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.isTrainer) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const list = await db.collection('trainerFiles')
        .find({ trainerId: user.id })
        .sort({ createdAt: -1 })
        .toArray()
      return handleCORS(NextResponse.json({ files: list.map(({ _id, ...r }) => r) }))
    }

    if (route === '/trainer/files' && method === 'DELETE') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.isTrainer) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const id = request.nextUrl.searchParams.get('id')
      if (!id) return handleCORS(NextResponse.json({ error: 'id is required' }, { status: 400 }))
      await db.collection('trainerFiles').deleteOne({ id, trainerId: user.id })
      return handleCORS(NextResponse.json({ ok: true }))
    }

    if (route === '/client/files' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.portalAccess) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      if (!user.assignedTrainerId) return handleCORS(NextResponse.json({ files: [] }))
      const list = await db.collection('trainerFiles')
        .find({ trainerId: user.assignedTrainerId, $or: [{ clientId: user.id }, { clientId: null }] })
        .sort({ createdAt: -1 })
        .toArray()
      return handleCORS(NextResponse.json({ files: list.map(({ _id, ...r }) => r) }))
    }


    // ---------------- PAYMENTS (Stripe via Emergent proxy) ----------------
    // Public list of purchasable packages (display only; amounts enforced server-side).
    if (route === '/payments/packages' && method === 'GET') {
      const list = Object.entries(PACKAGES).map(([id, p]) => ({
        id,
        label: p.label,
        amount: p.amount,
        currency: p.currency,
        mode: p.mode,
        interval: p.interval || null,
      }))
      return handleCORS(NextResponse.json({ packages: list }))
    }

    if (route === '/payments/checkout' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      }
      const body = await request.json()
      const pkg = PACKAGES[body.packageId]
      if (!pkg) {
        return handleCORS(NextResponse.json({ error: 'Invalid package' }, { status: 400 }))
      }
      const base = process.env.NEXT_PUBLIC_BASE_URL
      const txId = uuidv4()
      const successUrl = `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${base}/billing/cancel`
      try {
        const session = await createStripeSession(pkg, {
          successUrl,
          cancelUrl,
          metadata: { txId, userId: user.id, packageId: body.packageId },
          email: user.email,
        })
        await db.collection('payment_transactions').insertOne({
          id: txId,
          userId: user.id,
          username: user.username,
          packageId: body.packageId,
          mode: pkg.mode,
          amount: pkg.amount,
          currency: pkg.currency,
          accessType: pkg.accessType,
          sessionId: session.id,
          status: 'created',
          paymentStatus: 'unpaid',
          accessGranted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        return handleCORS(NextResponse.json({ url: session.url, sessionId: session.id }))
      } catch (e) {
        console.error('Checkout error:', e)
        return handleCORS(NextResponse.json({ error: 'Unable to start checkout' }, { status: 500 }))
      }
    }

    if (route === '/payments/status' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      }
      const sessionId = request.nextUrl.searchParams.get('session_id')
      if (!sessionId) {
        return handleCORS(NextResponse.json({ error: 'session_id is required' }, { status: 400 }))
      }
      const tx = await db.collection('payment_transactions').findOne({ sessionId, userId: user.id })
      if (!tx) {
        return handleCORS(NextResponse.json({ error: 'Transaction not found' }, { status: 404 }))
      }
      const s = await getStripeSession(sessionId)
      if (s.pending) {
        return handleCORS(NextResponse.json({ paid: false, status: 'pending', payment_status: 'pending' }))
      }
      const paid = s.payment_status === 'paid' || s.status === 'complete'
      await db.collection('payment_transactions').updateOne(
        { id: tx.id },
        { $set: { status: s.status, paymentStatus: s.payment_status, updatedAt: new Date() } }
      )
      if (paid && !tx.accessGranted) {
        await db.collection('users').updateOne(
          { id: user.id },
          {
            $set: {
              portalAccess: true,
              accessType: tx.accessType,
              portalAccessUpdatedAt: new Date(),
              ...(s.subscription ? { stripeSubscriptionId: s.subscription } : {}),
              ...(s.customer ? { stripeCustomerId: s.customer } : {}),
            },
          }
        )
        await db.collection('payment_transactions').updateOne(
          { id: tx.id },
          { $set: { accessGranted: true, completedAt: new Date() } }
        )
      }
      return handleCORS(NextResponse.json({
        paid,
        status: s.status,
        payment_status: s.payment_status,
        packageId: tx.packageId,
      }))
    }

    // ---------------- HUTCH TOUCH FILES (gated — portal access only) ----------------
    if ((route === '/hutch-touch/pdf' || route === '/hutch-touch/tracker') && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.portalAccess) {
        return handleCORS(NextResponse.json(
          { error: 'The Hutch Touch is for clients and members only. Get portal access to download it.' },
          { status: 403 }
        ))
      }
      const HUTCH_FILES = {
        pdf: {
          url: 'https://customer-assets-39nsmqrw.emergentagent.net/job_trainer-profiles-2/artifacts/uozo0w84_The_Hutch_6_Day_PPL_Performance_Block.pdf',
          type: 'application/pdf',
          name: 'The-Hutch-Touch-8-Week-Program.pdf',
        },
        tracker: {
          url: 'https://customer-assets-39nsmqrw.emergentagent.net/job_trainer-profiles-2/artifacts/6rp8lcad_The_Hutch_6_Day_PPL_Performance_Tracker.xlsx',
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          name: 'The-Hutch-Touch-Tracker.xlsx',
        },
      }
      const f = route.endsWith('/pdf') ? HUTCH_FILES.pdf : HUTCH_FILES.tracker
      try {
        const r = await fetch(f.url)
        if (!r.ok) throw new Error('source fetch failed ' + r.status)
        const buf = Buffer.from(await r.arrayBuffer())
        const headers = new Headers()
        headers.set('Content-Type', f.type)
        headers.set('Content-Disposition', `inline; filename="${f.name}"`)
        headers.set('Cache-Control', 'private, no-store')
        return new NextResponse(buf, { status: 200, headers })
      } catch (e) {
        console.error('Hutch Touch file error:', e)
        return handleCORS(NextResponse.json({ error: 'File temporarily unavailable' }, { status: 502 }))
      }
    }

    // ---------------- MEMBER SUBSCRIPTION INFO (My Membership panel) ----------------
    if (route === '/payments/subscription' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      }
      const result = {
        accessType: user.accessType || null,
        portalAccess: !!user.portalAccess,
        subscription: null,
      }
      if (user.stripeSubscriptionId) {
        try {
          const r = await fetch(`${STRIPE_BASE}/subscriptions/${user.stripeSubscriptionId}`, {
            headers: { Authorization: `Bearer ${STRIPE_KEY}` },
          })
          const s = await r.json()
          if (r.ok) {
            const item = s.items?.data?.[0]
            result.subscription = {
              status: s.status,
              cancelAtPeriodEnd: s.cancel_at_period_end,
              currentPeriodEnd: s.current_period_end,
              amount: item?.price?.unit_amount ?? null,
              currency: item?.price?.currency ?? 'usd',
              interval: item?.price?.recurring?.interval ?? null,
            }
          }
        } catch (e) {
          console.error('Subscription fetch error:', e)
        }
      }
      return handleCORS(NextResponse.json(result))
    }

    // ---------------- ADMIN: PROMO CODES (Stripe coupons + promotion codes) ----------------
    if (route === '/admin/coupons' && method === 'GET') {
      const admin = await getCurrentUser(request, db)
      if (!admin || admin.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const r = await fetch(`${STRIPE_BASE}/promotion_codes?limit=100`, {
        headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Stripe-Version': '2024-06-20' },
      })
      const data = await r.json()
      if (!r.ok) return handleCORS(NextResponse.json({ codes: [] }))
      const codes = (data.data || []).map((pc) => ({
        id: pc.id,
        code: pc.code,
        active: pc.active,
        percentOff: pc.coupon?.percent_off ?? null,
        duration: pc.coupon?.duration || null,
        durationInMonths: pc.coupon?.duration_in_months ?? null,
        timesRedeemed: pc.times_redeemed ?? 0,
        maxRedemptions: pc.max_redemptions ?? null,
      }))
      return handleCORS(NextResponse.json({ codes }))
    }

    if (route === '/admin/coupons' && method === 'POST') {
      const admin = await getCurrentUser(request, db)
      if (!admin || admin.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const body = await request.json()
      const percentOff = Number(body.percentOff)
      if (!(percentOff >= 1 && percentOff <= 100)) {
        return handleCORS(NextResponse.json({ error: 'percentOff must be 1-100 (use 100 for a free code)' }, { status: 400 }))
      }
      const duration = ['once', 'repeating', 'forever'].includes(body.duration) ? body.duration : 'once'
      const stripeHeaders = {
        Authorization: `Bearer ${STRIPE_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2024-06-20',
      }
      // 1) coupon
      const cp = new URLSearchParams()
      cp.set('percent_off', String(percentOff))
      cp.set('duration', duration)
      if (duration === 'repeating') cp.set('duration_in_months', String(body.durationInMonths || 1))
      const cr = await fetch(`${STRIPE_BASE}/coupons`, { method: 'POST', headers: stripeHeaders, body: cp.toString() })
      const coupon = await cr.json()
      if (!cr.ok) {
        return handleCORS(NextResponse.json({ error: coupon?.error?.message || 'Coupon create failed' }, { status: 400 }))
      }
      // 2) promotion code
      const pp = new URLSearchParams()
      pp.set('coupon', coupon.id)
      if (body.code) pp.set('code', String(body.code).toUpperCase().replace(/[^A-Z0-9]/g, ''))
      if (body.maxRedemptions) pp.set('max_redemptions', String(body.maxRedemptions))
      const pr = await fetch(`${STRIPE_BASE}/promotion_codes`, { method: 'POST', headers: stripeHeaders, body: pp.toString() })
      const promo = await pr.json()
      if (!pr.ok) {
        return handleCORS(NextResponse.json({ error: promo?.error?.message || 'Promo code create failed' }, { status: 400 }))
      }
      return handleCORS(NextResponse.json({
        code: { id: promo.id, code: promo.code, active: promo.active, percentOff, duration, durationInMonths: coupon.duration_in_months ?? null, timesRedeemed: 0, maxRedemptions: promo.max_redemptions ?? null },
      }))
    }

    if (route === '/admin/coupons' && method === 'PUT') {
      const admin = await getCurrentUser(request, db)
      if (!admin || admin.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const body = await request.json()
      if (!body.id) return handleCORS(NextResponse.json({ error: 'id is required' }, { status: 400 }))
      const p = new URLSearchParams()
      p.set('active', body.active ? 'true' : 'false')
      // Stripe uses POST for updates.
      await fetch(`${STRIPE_BASE}/promotion_codes/${body.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2024-06-20' },
        body: p.toString(),
      })
      return handleCORS(NextResponse.json({ ok: true }))
    }

    // ---------------- STRIPE BILLING PORTAL (self-service) ----------------
    if (route === '/payments/portal' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      }
      if (!user.stripeCustomerId) {
        return handleCORS(NextResponse.json(
          { error: 'No billing account on file. This applies to members who paid online.' },
          { status: 400 }
        ))
      }
      const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/clients`
      async function createPortalSession() {
        const p = new URLSearchParams()
        p.set('customer', user.stripeCustomerId)
        p.set('return_url', returnUrl)
        const r = await fetch(`${STRIPE_BASE}/billing_portal/sessions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: p.toString(),
        })
        return { r, data: await r.json() }
      }
      try {
        let { r, data } = await createPortalSession()
        // If the account has no Customer Portal configuration yet, create a default and retry.
        if (!r.ok && /configuration/i.test(data?.error?.message || '')) {
          const cfg = new URLSearchParams()
          cfg.set('business_profile[headline]', 'Tensor Strength — manage your membership')
          cfg.set('features[invoice_history][enabled]', 'true')
          cfg.set('features[payment_method_update][enabled]', 'true')
          cfg.set('features[customer_update][enabled]', 'true')
          cfg.set('features[customer_update][allowed_updates][0]', 'email')
          cfg.set('features[customer_update][allowed_updates][1]', 'address')
          cfg.set('features[subscription_cancel][enabled]', 'true')
          await fetch(`${STRIPE_BASE}/billing_portal/configurations`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: cfg.toString(),
          })
          ;({ r, data } = await createPortalSession())
        }
        if (!r.ok) {
          console.error('Billing portal error:', data?.error?.message)
          return handleCORS(NextResponse.json({ error: 'Unable to open billing portal' }, { status: 500 }))
        }
        return handleCORS(NextResponse.json({ url: data.url }))
      } catch (e) {
        console.error('Billing portal exception:', e)
        return handleCORS(NextResponse.json({ error: 'Unable to open billing portal' }, { status: 500 }))
      }
    }

    // ---------------- STRIPE WEBHOOK (auto revoke on cancel / failed renewal) ----------------
    if (route === '/webhooks/stripe' && method === 'POST') {
      if (!stripeSdk || WEBHOOK_SECRETS.length === 0) {
        // Not configured yet — acknowledge so Stripe doesn't hammer retries.
        return NextResponse.json({ received: true, configured: false })
      }
      const sig = request.headers.get('stripe-signature')
      const rawBody = await request.text()
      let event = null
      for (const secret of WEBHOOK_SECRETS) {
        try {
          event = stripeSdk.webhooks.constructEvent(rawBody, sig, secret)
          break
        } catch {
          /* try next secret */
        }
      }
      if (!event) {
        console.error('Webhook signature verification failed for all secrets')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }

      // Idempotency — ignore events we've already processed.
      try {
        await db.collection('stripe_events').insertOne({ id: event.id, type: event.type, receivedAt: new Date() })
      } catch (e) {
        if (e?.code === 11000) return NextResponse.json({ received: true, duplicate: true })
      }

      async function findUser(obj) {
        const uid = obj?.metadata?.userId
        if (uid) return await db.collection('users').findOne({ id: uid })
        if (obj?.id) {
          const bySub = await db.collection('users').findOne({ stripeSubscriptionId: obj.id })
          if (bySub) return bySub
        }
        if (obj?.customer) {
          return await db.collection('users').findOne({ stripeCustomerId: obj.customer })
        }
        return null
      }

      async function setAccess(u, granted, status) {
        if (!u) return
        await db.collection('users').updateOne(
          { id: u.id },
          { $set: { portalAccess: granted, subscriptionStatus: status || null, portalAccessUpdatedAt: new Date() } }
        )
      }

      const obj = event.data.object
      const REVOKE_STATES = ['canceled', 'unpaid', 'incomplete_expired']

      switch (event.type) {
        case 'checkout.session.completed': {
          // Robustly grant access on any completed checkout (one-time OR subscription),
          // even if the buyer never lands on the success page.
          const u = await findUser(obj)
          const paid = obj.payment_status === 'paid' || obj.status === 'complete'
          if (u && paid) {
            const tx = await db.collection('payment_transactions').findOne({ sessionId: obj.id })
            const accessType =
              tx?.accessType || PACKAGES[obj?.metadata?.packageId]?.accessType || 'membership'
            await db.collection('users').updateOne(
              { id: u.id },
              {
                $set: {
                  portalAccess: true,
                  accessType,
                  portalAccessUpdatedAt: new Date(),
                  ...(obj.subscription ? { stripeSubscriptionId: obj.subscription } : {}),
                  ...(obj.customer ? { stripeCustomerId: obj.customer } : {}),
                },
              }
            )
            if (tx) {
              await db.collection('payment_transactions').updateOne(
                { id: tx.id },
                { $set: { accessGranted: true, status: obj.status, paymentStatus: obj.payment_status, completedAt: new Date() } }
              )
            }
          }
          break
        }
        case 'customer.subscription.deleted': {
          const u = await findUser(obj)
          await setAccess(u, false, 'canceled')
          break
        }
        case 'customer.subscription.updated': {
          const u = await findUser(obj)
          if (REVOKE_STATES.includes(obj.status)) await setAccess(u, false, obj.status)
          else if (['active', 'trialing'].includes(obj.status)) await setAccess(u, true, obj.status)
          // past_due: keep access (grace period) — do nothing.
          break
        }
        case 'customer.subscription.created': {
          const u = await findUser(obj)
          if (['active', 'trialing'].includes(obj.status)) await setAccess(u, true, obj.status)
          break
        }
        case 'invoice.payment_failed': {
          // Conservative: revoke on a failed renewal.
          let sub = obj.subscription
          if (sub) {
            const u = await db.collection('users').findOne({ stripeSubscriptionId: sub })
            await setAccess(u, false, 'past_due')
          }
          break
        }
        default:
          break
      }

      return NextResponse.json({ received: true })
    }

    // ---------------- COMMUNITY FORUM (members) ----------------
    if (route === '/forum/upload' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      try {
        const form = await request.formData()
        const file = form.get('file')
        if (!file || typeof file === 'string') {
          return handleCORS(NextResponse.json({ error: 'No file provided' }, { status: 400 }))
        }
        const mime = file.type || ''
        const isImg = mime.startsWith('image/')
        const isVid = mime.startsWith('video/')
        if (!isImg && !isVid) {
          return handleCORS(NextResponse.json({ error: 'Only image or video files are allowed' }, { status: 400 }))
        }
        const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' }
        const ext = extMap[mime] || (isImg ? 'jpg' : 'mp4')
        const buffer = Buffer.from(await file.arrayBuffer())
        // Forum media is community-visible to any logged-in member.
        const url = await saveUploadBuffer(db, buffer, ext, mime, user.id, 'public')
        return handleCORS(NextResponse.json({ url, type: isImg ? 'image' : 'video' }))
      } catch (e) {
        console.error('Forum upload error:', e)
        return handleCORS(NextResponse.json({ error: 'Upload failed' }, { status: 500 }))
      }
    }

    if (route === '/forum/posts' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const category = request.nextUrl.searchParams.get('category')
      const query = category && category !== 'all' ? { category } : {}
      const posts = await db.collection('forum_posts').find(query).sort({ createdAt: -1 }).limit(200).toArray()
      return handleCORS(NextResponse.json({ posts: posts.map(({ _id, ...p }) => p) }))
    }

    if (route === '/forum/posts' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const body = await request.json()
      if (!body.title?.trim()) return handleCORS(NextResponse.json({ error: 'A title is required' }, { status: 400 }))
      const FORUM_CATEGORIES = ['general', 'faq', 'prs', 'nutrition', 'form-checks']
      const category = FORUM_CATEGORIES.includes(body.category) ? body.category : 'general'
      const post = {
        id: uuidv4(),
        userId: user.id,
        username: user.username,
        title: body.title.trim(),
        body: (body.body || '').trim(),
        category,
        mediaUrl: body.mediaUrl || null,
        mediaType: body.mediaType || null,
        replyCount: 0,
        likes: [],
        createdAt: new Date(),
      }
      await db.collection('forum_posts').insertOne(post)
      const { _id, ...clean } = post
      return handleCORS(NextResponse.json({ post: clean }))
    }

    if (route === '/forum/thread' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const id = request.nextUrl.searchParams.get('id')
      const post = await db.collection('forum_posts').findOne({ id })
      if (!post) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      const replies = await db.collection('forum_replies').find({ postId: id }).sort({ createdAt: 1 }).toArray()
      const { _id, ...cleanPost } = post
      return handleCORS(NextResponse.json({ post: cleanPost, replies: replies.map(({ _id, ...r }) => r) }))
    }

    if (route === '/forum/replies' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const body = await request.json()
      if (!body.postId || !(body.body?.trim() || body.mediaUrl)) {
        return handleCORS(NextResponse.json({ error: 'A reply message or media is required' }, { status: 400 }))
      }
      const post = await db.collection('forum_posts').findOne({ id: body.postId })
      if (!post) return handleCORS(NextResponse.json({ error: 'Post not found' }, { status: 404 }))
      const reply = {
        id: uuidv4(),
        postId: body.postId,
        userId: user.id,
        username: user.username,
        body: (body.body || '').trim(),
        mediaUrl: body.mediaUrl || null,
        mediaType: body.mediaType || null,
        createdAt: new Date(),
      }
      await db.collection('forum_replies').insertOne(reply)
      await db.collection('forum_posts').updateOne({ id: body.postId }, { $inc: { replyCount: 1 } })
      const { _id, ...clean } = reply
      return handleCORS(NextResponse.json({ reply: clean }))
    }

    if (route === '/forum/like' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const body = await request.json()
      const post = await db.collection('forum_posts').findOne({ id: body.postId })
      if (!post) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      const liked = (post.likes || []).includes(user.id)
      await db.collection('forum_posts').updateOne(
        { id: body.postId },
        liked ? { $pull: { likes: user.id } } : { $addToSet: { likes: user.id } }
      )
      const updated = await db.collection('forum_posts').findOne({ id: body.postId })
      return handleCORS(NextResponse.json({ liked: !liked, likeCount: (updated.likes || []).length }))
    }

    if (route === '/forum/posts' && method === 'DELETE') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const body = await request.json()
      const post = await db.collection('forum_posts').findOne({ id: body.id })
      if (!post) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      if (post.userId !== user.id && user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'You can only delete your own posts.' }, { status: 403 }))
      }
      await db.collection('forum_posts').deleteOne({ id: body.id })
      await db.collection('forum_replies').deleteMany({ postId: body.id })
      return handleCORS(NextResponse.json({ ok: true }))
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
