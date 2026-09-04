import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import Stripe from 'stripe'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'

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
          const latest = await db.collection('checkins')
            .find({ userId: c.id })
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray()
          return {
            ...publicUser(c),
            checkinCount: count,
            lastCheckinAt: latest[0]?.createdAt || null,
          }
        })
      )
      return handleCORS(NextResponse.json({ clients: withMeta }))
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
      const clean = checkins.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json({
        client: { id: client.id, username: client.username, email: client.email },
        checkins: clean,
      }))
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
        const dir = process.cwd() + '/public/uploads'
        await mkdir(dir, { recursive: true })
        const filename = uuidv4() + '.' + ext
        await writeFile(dir + '/' + filename, buffer)
        return handleCORS(NextResponse.json({ url: '/uploads/' + filename, type: isImg ? 'image' : 'video' }))
      } catch (e) {
        console.error('Forum upload error:', e)
        return handleCORS(NextResponse.json({ error: 'Upload failed' }, { status: 500 }))
      }
    }

    if (route === '/forum/posts' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const posts = await db.collection('forum_posts').find({}).sort({ createdAt: -1 }).limit(200).toArray()
      return handleCORS(NextResponse.json({ posts: posts.map(({ _id, ...p }) => p) }))
    }

    if (route === '/forum/posts' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const body = await request.json()
      if (!body.title?.trim()) return handleCORS(NextResponse.json({ error: 'A title is required' }, { status: 400 }))
      const post = {
        id: uuidv4(),
        userId: user.id,
        username: user.username,
        title: body.title.trim(),
        body: (body.body || '').trim(),
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
