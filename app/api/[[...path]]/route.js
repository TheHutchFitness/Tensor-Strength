import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import Stripe from 'stripe'
import { readFile, writeFile, mkdir, readdir, rm } from 'fs/promises'
import nodePath from 'path'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

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
    // Write the ACL doc BEFORE returning the URL. If it fails, best-effort delete
    // the just-uploaded object so we never leave an object with no ACL record.
    try {
      await db.collection('uploads').updateOne(
        { key },
        { $set: { key, ownerId: ownerId || null, visibility: visibility === 'public' ? 'public' : 'private', allowedUserIds: [], mime: mime || '', createdAt: new Date() } },
        { upsert: true }
      )
    } catch (e) {
      try { await getS3().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })) } catch {}
      throw e
    }
    return '/api/files/' + key
  }
  const dir = process.cwd() + '/public/uploads'
  // Without durable storage, local disk is served statically with NO auth/ACL.
  // Refuse private uploads here so sensitive files can never be exposed; public
  // assets (profile photos, forum media) may still use the dev fallback.
  if (visibility !== 'public') {
    throw new Error('Durable storage is not configured; cannot store a private file securely.')
  }
  await mkdir(dir, { recursive: true })
  await writeFile(dir + '/' + filename, buffer)
  return '/uploads/' + filename
}

// Extract the R2 object key from a stored /api/files/<key> URL.
function keyFromFileUrl(url) {
  const m = String(url || '').match(/\/api\/files\/(uploads\/[^?#]+)/)
  return m ? m[1] : null
}
// True only if `url` points at an uploaded object owned by `userId` (prevents a
// caller from referencing someone else's file when sharing/broadcasting).
async function ownsUploadKey(db, url, userId) {
  const key = keyFromFileUrl(url)
  if (!key || !userId) return false
  const meta = await db.collection('uploads').findOne({ key })
  return !!meta && meta.ownerId === userId
}

// Read an uploaded object's bytes from R2 (used to embed photos in the PDF report).
async function fetchUploadBytes(url) {
  const key = keyFromFileUrl(url)
  if (!key) return null
  try {
    const obj = await getS3().send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }))
    const b = await obj.Body.transformToByteArray()
    return Buffer.from(b)
  } catch { return null }
}

// Solo-coach convenience: connect a new member to the primary coach (first admin)
// so messaging, progress, insights & check-in ACLs work immediately after payment.
async function ensureCoachAssigned(db, userId) {
  const u = await db.collection('users').findOne({ id: userId })
  if (!u || u.assignedTrainerId) return
  const coach = await db.collection('users').findOne({ role: 'admin' })
  if (coach && coach.id !== userId) {
    await db.collection('users').updateOne({ id: userId }, { $set: { assignedTrainerId: coach.id } })
  }
}

// Build a branded, single-page monthly progress report PDF for a member.
async function buildProgressReportPdf(db, u) {
  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const tr = await db.collection('tracker').findOne({ userId: u.id })
  const workouts = Array.isArray(tr?.workouts) ? tr.workouts : []
  const wTimes = workouts.map((w) => new Date(w.date).getTime()).filter((t) => Number.isFinite(t))
  const last30 = wTimes.filter((t) => Date.now() - t <= 30 * 86400000).length
  const metrics = await db.collection('body_metrics').find({ userId: u.id }).sort({ date: 1 }).toArray()
  const firstM = metrics[0] || null
  const lastM = metrics[metrics.length - 1] || null
  const photos = await db.collection('progress_photos').find({ userId: u.id }).sort({ date: 1 }).toArray()
  const checkinCount = await db.collection('checkins').countDocuments({ userId: u.id })
  const sum = xpSummary(u.xp)

  const doc = await PDFDocument.create()
  const page = doc.addPage([612, 792])
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const ink = rgb(0.04, 0.02, 0.13)
  const electric = rgb(0.13, 0.45, 1)
  const grey = rgb(0.4, 0.4, 0.45)
  const M = 56
  let y = 736

  page.drawRectangle({ x: 0, y: 748, width: 612, height: 44, color: ink })
  page.drawText('TENSOR STRENGTH', { x: M, y: 762, size: 16, font: bold, color: rgb(1, 1, 1) })
  page.drawText('PROGRESS', { x: 612 - M - bold.widthOfTextAtSize('PROGRESS', 16), y: 762, size: 16, font: bold, color: electric })

  y = 700
  page.drawText('Monthly progress report', { x: M, y, size: 22, font: bold, color: ink })
  y -= 26
  page.drawText(`${u.username || 'Member'}  ·  ${monthLabel}`, { x: M, y, size: 12, font, color: grey })

  // Snapshot cards
  y -= 34
  const cards = [
    ['LEVEL', String(sum.level)],
    ['DAY STREAK', String(u.streak || 0)],
    ['WORKOUTS (30d)', String(last30)],
    ['CHECK-INS', String(checkinCount)],
  ]
  const cw = (612 - M * 2 - 24) / 4
  cards.forEach((c, i) => {
    const x = M + i * (cw + 8)
    page.drawRectangle({ x, y: y - 46, width: cw, height: 46, color: rgb(0.96, 0.97, 1) })
    page.drawText(c[1], { x: x + 10, y: y - 24, size: 20, font: bold, color: electric })
    page.drawText(c[0], { x: x + 10, y: y - 40, size: 7, font: bold, color: grey })
  })
  y -= 46

  // Body metrics table
  y -= 34
  page.drawText('BODY METRICS', { x: M, y, size: 9, font: bold, color: electric })
  y -= 16
  const fmtNum = (v) => (v == null ? '—' : String(v))
  const fmtDelta = (a, b) => {
    if (a == null || b == null) return '—'
    const d = Math.round((b - a) * 10) / 10
    return (d > 0 ? '+' : '') + d
  }
  const METRIC_ROWS = [
    ['Bodyweight', 'weight'], ['Waist', 'waist'], ['Chest', 'chest'], ['Hips', 'hips'],
    ['Arms', 'arms'], ['Thighs', 'thighs'], ['Sleep (hrs)', 'sleepHrs'], ['Steps', 'steps'], ['Resting HR', 'restingHr'],
  ].filter(([, k]) => (firstM && firstM[k] != null) || (lastM && lastM[k] != null))
  page.drawText('METRIC', { x: M, y, size: 8, font: bold, color: grey })
  page.drawText('START', { x: 280, y, size: 8, font: bold, color: grey })
  page.drawText('LATEST', { x: 360, y, size: 8, font: bold, color: grey })
  page.drawText('CHANGE', { x: 450, y, size: 8, font: bold, color: grey })
  y -= 4
  page.drawLine({ start: { x: M, y }, end: { x: 612 - M, y }, thickness: 0.7, color: rgb(0.85, 0.85, 0.88) })
  y -= 14
  if (METRIC_ROWS.length === 0) {
    page.drawText('No metrics logged yet.', { x: M, y, size: 10, font, color: grey })
    y -= 14
  } else {
    for (const [label, key] of METRIC_ROWS) {
      page.drawText(label, { x: M, y, size: 10, font, color: ink })
      page.drawText(fmtNum(firstM ? firstM[key] : null), { x: 280, y, size: 10, font, color: ink })
      page.drawText(fmtNum(lastM ? lastM[key] : null), { x: 360, y, size: 10, font, color: ink })
      page.drawText(fmtDelta(firstM ? firstM[key] : null, lastM ? lastM[key] : null), { x: 450, y, size: 10, font: bold, color: electric })
      y -= 15
    }
  }

  // Recent training
  y -= 20
  page.drawText('RECENT TRAINING', { x: M, y, size: 9, font: bold, color: electric })
  y -= 16
  const recent = [...workouts].sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0)).slice(0, 5)
  if (recent.length === 0) {
    page.drawText('No sessions logged yet.', { x: M, y, size: 10, font, color: grey }); y -= 14
  } else {
    for (const w of recent) {
      const line = `${w.date || ''}   ${(w.title || 'Workout').slice(0, 60)}`
      page.drawText(line, { x: M, y, size: 10, font, color: ink }); y -= 15
    }
  }

  // Progress photos (embed then/now front if available)
  y -= 20
  page.drawText('PROGRESS PHOTOS', { x: M, y, size: 9, font: bold, color: electric })
  y -= 8
  const firstFront = photos.find((p) => p.front)?.front
  const lastFront = [...photos].reverse().find((p) => p.front)?.front
  const embedInto = async (url, x) => {
    if (!url) return
    const bytes = await fetchUploadBytes(url)
    if (!bytes) return
    let img = null
    try { img = await doc.embedJpg(bytes) } catch { try { img = await doc.embedPng(bytes) } catch { img = null } }
    if (!img) return
    const w = 150
    const h = (img.height / img.width) * w
    const drawH = Math.min(h, 150)
    const drawW = (img.width / img.height) * drawH
    page.drawImage(img, { x, y: y - 8 - drawH, width: drawW, height: drawH })
  }
  if (firstFront || lastFront) {
    page.drawText('Then', { x: M, y: y - 20, size: 8, font: bold, color: grey })
    page.drawText('Now', { x: M + 170, y: y - 20, size: 8, font: bold, color: grey })
    y -= 22
    await embedInto(firstFront, M)
    await embedInto(lastFront, M + 170)
    y -= 156
  } else {
    y -= 6
    page.drawText(`${photos.length} photo${photos.length === 1 ? '' : 's'} on file.`, { x: M, y, size: 10, font, color: grey })
  }

  page.drawText('Generated by Tensor Strength — keep pushing.', { x: M, y: 60, size: 9, font, color: grey })
  return await doc.save()
}
// Grant a specific user read access to a private uploaded file (recipient-scoped).
async function grantFileAccess(db, url, userId) {
  const key = keyFromFileUrl(url)
  if (!key || !userId) return
  await db.collection('uploads').updateOne({ key }, { $addToSet: { allowedUserIds: userId } }).catch(() => {})
}
// Mark a file as broadcast to all of the owner-trainer's clients.
async function markFileBroadcast(db, url) {
  const key = keyFromFileUrl(url)
  if (!key) return
  await db.collection('uploads').updateOne({ key }, { $set: { broadcastFromTrainer: true } }).catch(() => {})
}
// Delete an uploaded object + its ACL doc when the owning record is removed.
async function deleteUpload(db, url) {
  const key = keyFromFileUrl(url)
  if (!key) return
  if (r2Enabled()) {
    try { await getS3().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })) } catch (e) { console.error('R2 delete failed:', e?.message) }
  }
  await db.collection('uploads').deleteOne({ key }).catch(() => {})
}

// ---- Forum notifications & @mentions ----
// Insert a notification for a recipient (skips self-notifications).
// Pluggable email sender. Until an email provider key is configured (e.g. RESEND_API_KEY),
// this is a no-op that reports "not configured" so callers can fall back to in-app
// notifications. Wiring a provider later only touches this one function.
async function sendEmail({ to, subject, text }) {
  const from = process.env.EMAIL_FROM
  if (process.env.RESEND_API_KEY && from) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, text }),
      })
      return { ok: r.ok }
    } catch { return { ok: false } }
  }
  return { ok: false, skipped: true }
}

async function pushNotification(db, { recipientId, actorId, actorName, type, postId, postTitle, replyId, snippet, emoji, targetType }) {
  if (!recipientId || recipientId === actorId) return
  await db.collection('forum_notifications').insertOne({
    id: uuidv4(),
    userId: recipientId,
    actorId: actorId || null,
    actorName: actorName || 'Someone',
    type, // 'mention' | 'reply' | 'best-answer' | 'reaction' | 'announcement'
    postId: postId || null,
    postTitle: postTitle || '',
    replyId: replyId || null,
    emoji: emoji || null,
    targetType: targetType || null,
    snippet: (snippet || '').slice(0, 140),
    read: false,
    createdAt: new Date(),
  }).catch(() => {})
}

// Scan free text for @mentions of known usernames (which may contain spaces) and
// notify each mentioned member. Matching is case-insensitive and exact on the
// stored username. Returns nothing; best-effort.
async function notifyMentions(db, { text, actor, postId, postTitle, replyId }) {
  if (!text || !text.includes('@')) return
  const lower = text.toLowerCase()
  const users = await db.collection('users').find({}, { projection: { id: 1, username: 1 } }).limit(500).toArray()
  const seen = new Set()
  for (const u of users) {
    if (!u.username || u.id === actor?.id) continue
    const token = ('@' + u.username).toLowerCase()
    if (lower.includes(token) && !seen.has(u.id)) {
      seen.add(u.id)
      await pushNotification(db, {
        recipientId: u.id,
        actorId: actor?.id,
        actorName: actor?.username,
        type: 'mention',
        postId, postTitle, replyId,
        snippet: text,
      })
    }
  }
}

// Toggle a single user's emoji reaction on a target document (post or reply).
// Reactions are stored as { [emoji]: [userId, ...] } on the document.
const ALLOWED_EMOJI = ['👍', '🔥', '💪', '👏', '😂', '❤️']
async function toggleReaction(db, collection, targetId, emoji, userId) {
  if (!ALLOWED_EMOJI.includes(emoji)) return null
  const doc = await db.collection(collection).findOne({ id: targetId })
  if (!doc) return null
  const reactions = doc.reactions || {}
  const arr = Array.isArray(reactions[emoji]) ? reactions[emoji] : []
  if (arr.includes(userId)) {
    reactions[emoji] = arr.filter((u) => u !== userId)
    if (reactions[emoji].length === 0) delete reactions[emoji]
  } else {
    reactions[emoji] = [...arr, userId]
  }
  await db.collection(collection).updateOne({ id: targetId }, { $set: { reactions } })
  return reactions
}


// MongoDB connection
let client
let db
let connectPromise

function trimTrailingSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function getAppBaseUrl(request) {
  const configured = trimTrailingSlash(process.env.NEXT_PUBLIC_BASE_URL)
  if (configured) return configured
  const forwardedHost = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').trim()
  if (forwardedHost) {
    const proto = (request.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim() || 'https'
    return `${proto}://${forwardedHost}`
  }
  return trimTrailingSlash(request.nextUrl.origin)
}

const LEAD_API_URL = process.env.LEAD_API_URL || process.env.NEXT_PUBLIC_LEAD_API_URL || 'https://alluring-encouragement-production.up.railway.app/public/lead_v3'

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
// No insecure fallback: a missing JWT_SECRET must fail closed (tokens become
// unforgeable/invalid) rather than fall back to a publicly-known default.
const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || '')

async function signToken(payload) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured')
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey)
}

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] })
    return payload
  } catch {
    return null
  }
}

function publicUser(u) {
  if (!u) return null
  // Strip DB internals, the password hash, and coach-only/internal fields that
  // must never be returned to the account owner (e.g. private notes a trainer
  // writes ABOUT a client live on the client's user doc).
  const {
    _id,
    passwordHash,
    coachNotes,
    coachNotesUpdatedAt,
    ...rest
  } = u
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
  if (existing) {
    // Admins double as the founder coach "Hutch": they can be assigned clients
    // and are LINKED to the existing static Hutch profile (slug 'hutch'). We do
    // NOT give the admin a separate DB trainer card. Idempotent migration.
    const set = {}
    const unset = {}
    if (existing.isTrainer !== true) set.isTrainer = true
    if (existing.slug !== 'hutch') set.slug = 'hutch'
    if (existing.profileCompleted) unset.profileCompleted = ''
    if (existing.trainerProfile) unset.trainerProfile = ''
    const ops = {}
    if (Object.keys(set).length) ops.$set = set
    if (Object.keys(unset).length) ops.$unset = unset
    if (Object.keys(ops).length) {
      await db.collection('users').updateOne({ id: existing.id }, ops)
    }
    return
  }
  const username = (process.env.ADMIN_USERNAME || 'hutch').toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  const email = process.env.ADMIN_EMAIL || 'admin@tensorstrength.com'
  // Never seed a guessable default admin password. If it's not configured,
  // skip seeding rather than create a weak, publicly-known credential.
  if (!password) {
    console.error('ADMIN_PASSWORD not set — skipping admin seed.')
    return
  }
  const passwordHash = await bcrypt.hash(password, 10)
  await db.collection('users').insertOne({
    id: uuidv4(),
    username,
    email,
    passwordHash,
    role: 'admin',
    portalAccess: true,
    // Admins act as the founder coach (Hutch) — assignable clients, linked to
    // the existing static Hutch profile (slug 'hutch'). No separate DB card.
    isTrainer: true,
    slug: 'hutch',
    emailVerified: true,
    authProvider: 'local',
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
    currency: 'cad',
    interval: 'month',
    accessType: 'membership',
  },
  yearly_90: {
    label: 'Tensor Strength Membership (Annual)',
    mode: 'subscription',
    amount: 9000,
    currency: 'cad',
    interval: 'year',
    accessType: 'membership',
  },
  custom_program_200: {
    label: 'Custom Program',
    mode: 'payment',
    amount: 20000,
    currency: 'cad',
    accessType: 'custom_program',
  },
  remote_coaching_400: {
    label: 'Remote Coaching',
    mode: 'subscription',
    amount: 40000,
    currency: 'cad',
    interval: 'month',
    accessType: 'remote_coaching',
  },
}

async function createStripeSession(pkg, { successUrl, cancelUrl, metadata, email, trialDays }) {
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
    // Free trial: Stripe still collects a card up front, charges nothing during the
    // trial, and auto-bills after unless the client cancels. Access opens immediately
    // (subscription status = 'trialing', handled by the existing webhook + status poll).
    if (trialDays && Number(trialDays) > 0) {
      params.set('subscription_data[trial_period_days]', String(Math.min(365, Math.round(Number(trialDays)))))
    }
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
  // Pin the allowed origin to our own app origin. We never fall back to a
  // wildcard '*' because it is invalid combined with Allow-Credentials and is
  // overly permissive; if no origin is configured we simply omit the header.
  const allowOrigin = process.env.NEXT_PUBLIC_BASE_URL || process.env.CORS_ORIGINS || ''
  if (allowOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowOrigin)
  }
  response.headers.set('Vary', 'Origin')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// ---- Simple in-memory rate limiter (per-process) for sensitive auth routes ----
// Not a distributed limiter, but it meaningfully slows automated credential
// stuffing / guessing against a single pod. Keyed by client IP + bucket.
const rateBuckets = new Map()
function rateLimit(request, bucket, limit, windowMs) {
  try {
    const xff = request.headers.get('x-forwarded-for') || ''
    const ip = (xff.split(',')[0] || '').trim() || request.headers.get('x-real-ip') || 'unknown'
    const key = `${bucket}:${ip}`
    const now = Date.now()
    // Occasional cleanup to keep the map bounded.
    if (rateBuckets.size > 5000) {
      for (const [k, v] of rateBuckets) if (now > v.reset) rateBuckets.delete(k)
    }
    const rec = rateBuckets.get(key)
    if (!rec || now > rec.reset) {
      rateBuckets.set(key, { count: 1, reset: now + windowMs })
      return { ok: true, retryAfter: 0 }
    }
    if (rec.count >= limit) {
      return { ok: false, retryAfter: Math.max(1, Math.ceil((rec.reset - now) / 1000)) }
    }
    rec.count++
    return { ok: true, retryAfter: 0 }
  } catch {
    return { ok: true, retryAfter: 0 }
  }
}
// Build a 429 response with a Retry-After header + retryAfter seconds in the body.
function tooMany(retryAfter) {
  const resp = NextResponse.json(
    { error: 'Too many attempts. Please wait a moment and try again.', retryAfter },
    { status: 429 }
  )
  resp.headers.set('Retry-After', String(retryAfter))
  return handleCORS(resp)
}

// ============================ GAMIFICATION ============================
// Steep XP curve — reaching high levels takes months of real consistency.
// XP to REACH a level = 1000 * (L-1)*L/2  -> L2:1000  L3:3000  L4:6000  L5:10000 ...
function cumulativeXp(level) { return 1000 * (level - 1) * level / 2 }
function levelFromXp(xp) { let L = 1; const x = xp || 0; while (cumulativeXp(L + 1) <= x) L++; return L }
function xpSummary(xp) {
  const total = xp || 0
  const level = levelFromXp(total)
  const cur = cumulativeXp(level)
  const next = cumulativeXp(level + 1)
  return { total, level, into: total - cur, needed: next - cur, nextLevelAt: next }
}
const XP_AWARD = { workout: 38 }
// Preset unlockable avatars (emoji + gradient — friendly for all ages).
const AVATARS = [
  { id: 'seed', name: 'Fresh Start', emoji: '🌱', level: 1, grad: ['#1f6f43', '#0a2a1a'] },
  { id: 'wolf', name: 'Lone Wolf', emoji: '🐺', level: 2, grad: ['#5a6b82', '#141a24'] },
  { id: 'bull', name: 'Bull', emoji: '🐂', level: 3, grad: ['#8a4b2a', '#241108'] },
  { id: 'fire', name: 'On Fire', emoji: '🔥', level: 4, grad: ['#ff6a00', '#3a1400'] },
  { id: 'bolt', name: 'Live Wire', emoji: '⚡', level: 5, grad: ['#146cff', '#04173a'] },
  { id: 'lion', name: 'Lionheart', emoji: '🦁', level: 6, grad: ['#d9a441', '#3a2708'] },
  { id: 'dragon', name: 'Dragon', emoji: '🐉', level: 8, grad: ['#2fae6a', '#06251a'] },
  { id: 'crown', name: 'Iron Crown', emoji: '👑', level: 10, grad: ['#c9a227', '#2a2205'] },
  { id: 'goat', name: 'The GOAT', emoji: '🐐', level: 12, grad: ['#146cff', '#000014'] },
]
const TITLES = [
  { id: 'newcomer', name: 'Newcomer', level: 1 },
  { id: 'grinder', name: 'The Grinder', level: 2 },
  { id: 'consistent', name: 'Consistency Machine', level: 3 },
  { id: 'ironwilled', name: 'Iron-Willed', level: 4 },
  { id: 'relentless', name: 'Relentless', level: 5 },
  { id: 'beast', name: 'Certified Beast', level: 6 },
  { id: 'elite', name: 'Elite', level: 8 },
  { id: 'legend', name: 'Tensor Legend', level: 10 },
]
// Built-in quests. Client computes progress from the member's own workouts and
// goals; the server dedupes claims per period so a quest pays out once per cycle.
const QUEST_DEFS = [
  { id: 'daily_log', period: 'daily', title: 'Log a workout today', desc: 'Record any session in the tracker.', xp: 15, target: 1, metric: 'workoutsToday' },
  { id: 'daily_sets', period: 'daily', title: 'Grind 20 sets today', desc: 'Rack up 20 working sets in one day.', xp: 25, target: 20, metric: 'setsToday' },
  { id: 'weekly_4', period: 'weekly', title: 'Train 4 times this week', desc: 'Log four workouts (Mon–Sun).', xp: 60, target: 4, metric: 'workoutsThisWeek' },
  { id: 'weekly_6', period: 'weekly', title: 'Train 6 times this week', desc: 'Six sessions in a week — serious work.', xp: 110, target: 6, metric: 'workoutsThisWeek' },
  { id: 'weekly_rotation', period: 'weekly', title: 'Full Hutch Touch rotation', desc: 'Log all 4 rotation sessions this week.', xp: 80, target: 4, metric: 'rotationThisWeek' },
  { id: 'weekly_volume', period: 'weekly', title: 'Log 100 sets this week', desc: 'Accumulate 100 working sets across the week.', xp: 80, target: 100, metric: 'setsThisWeek' },
  { id: 'weekly_variety', period: 'weekly', title: 'Hit 12 different exercises', desc: 'Train 12 distinct movements this week.', xp: 70, target: 12, metric: 'exercisesThisWeek' },
  { id: 'monthly_12', period: 'monthly', title: '12 workouts this month', desc: 'Stay consistent all month long.', xp: 200, target: 12, metric: 'workoutsThisMonth' },
  { id: 'monthly_20', period: 'monthly', title: '20 workouts this month', desc: 'Elite-level monthly consistency.', xp: 375, target: 20, metric: 'workoutsThisMonth' },
  { id: 'monthly_sets', period: 'monthly', title: 'Log 400 sets this month', desc: 'Big monthly volume — earn it.', xp: 275, target: 400, metric: 'setsThisMonth' },
]
function periodId(period, d = new Date()) {
  const y = d.getUTCFullYear()
  if (period === 'daily') return `${y}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  if (period === 'monthly') return `${y}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  // weekly (ISO-ish): year + week number
  const oneJan = new Date(Date.UTC(y, 0, 1))
  const week = Math.ceil((((d - oneJan) / 86400000) + oneJan.getUTCDay() + 1) / 7)
  return `${y}-W${String(week).padStart(2, '0')}`
}
function unlockedFor(level) {
  return {
    avatars: AVATARS.filter(a => a.level <= level).map(a => a.id),
    titles: TITLES.filter(t => t.level <= level).map(t => t.id),
  }
}
// One-off achievement badges.
const BADGES = [
  { id: 'first_step', name: 'First Step', emoji: '👟', desc: 'Log your first workout', xp: 50 },
  { id: 'week_warrior', name: 'Week Warrior', emoji: '🔥', desc: 'Reach a 7-day streak', xp: 150 },
  { id: 'month_monster', name: 'Month Monster', emoji: '🗓️', desc: 'Reach a 30-day streak', xp: 750 },
  { id: 'half_century', name: 'Half Century', emoji: '💯', desc: 'Log 50 workouts', xp: 300 },
  { id: 'quest_hunter', name: 'Quest Hunter', emoji: '🎯', desc: 'Complete 10 quests', xp: 200 },
  { id: 'rising_star', name: 'Rising Star', emoji: '⭐', desc: 'Reach level 5', xp: 250 },
  { id: 'program_finisher', name: 'Program Finisher', emoji: '🏁', desc: 'Complete a full program block', xp: 300 },
]
function evalBadges(stats, earned) {
  const has = (id) => (earned || []).includes(id)
  const out = []
  if (stats.workouts >= 1 && !has('first_step')) out.push('first_step')
  if (stats.streak >= 7 && !has('week_warrior')) out.push('week_warrior')
  if (stats.streak >= 30 && !has('month_monster')) out.push('month_monster')
  if (stats.workouts >= 50 && !has('half_century')) out.push('half_century')
  if (stats.questClaims >= 10 && !has('quest_hunter')) out.push('quest_hunter')
  if (stats.level >= 5 && !has('rising_star')) out.push('rising_star')
  return out
}
function badgeXp(ids) { return ids.reduce((s, id) => s + ((BADGES.find(b => b.id === id) || {}).xp || 0), 0) }
// Goal-based weekly quests generated from the member's signup goals.
const GOAL_QUESTS = {
  'Build Muscle': { id: 'goal_muscle', title: 'Build Muscle — 3 sessions', desc: 'Log 3 training sessions this week to drive growth.', target: 3, xp: 50 },
  'Get Stronger': { id: 'goal_strong', title: 'Get Stronger — 3 heavy sessions', desc: 'Log 3 sessions this week built around the main lifts.', target: 3, xp: 50 },
  'Lose Fat': { id: 'goal_fat', title: 'Lose Fat — 4 sessions', desc: 'Log 4 sessions this week to keep the routine tight.', target: 4, xp: 60 },
  'Athletic Performance': { id: 'goal_athletic', title: 'Athletic — 3 sessions', desc: 'Log 3 sessions this week including power / plyo work.', target: 3, xp: 50 },
  'Stay Consistent': { id: 'goal_consistent', title: 'Consistency — 5 sessions', desc: 'Log 5 sessions this week. Showing up is the win.', target: 5, xp: 70 },
  'General Health': { id: 'goal_health', title: 'General Health — 3 sessions', desc: 'Log 3 balanced sessions this week.', target: 3, xp: 50 },
}
function goalQuestsFor(goals) {
  return (goals || [])
    .map(g => GOAL_QUESTS[g])
    .filter(Boolean)
    .map(q => ({ ...q, period: 'weekly', metric: 'workoutsThisWeek' }))
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
      // Deny-by-default: anything that is not explicitly marked 'public' is private.
      // (A missing ACL doc is treated as private and only the admin may read it.)
      const isPublic = !!meta && meta.visibility === 'public'
      if (!isPublic) {
        // Recipient-scoped: admin, the owner, an explicitly-granted user
        // (allowedUserIds — e.g. the specific client a trainer shared with, or the
        // other party of a DM), or — for trainer broadcast files — any client
        // assigned to that trainer.
        let allowed = me.role === 'admin' || (!!meta && me.id === meta.ownerId)
        if (!allowed && meta && Array.isArray(meta.allowedUserIds) && meta.allowedUserIds.includes(me.id)) {
          allowed = true
        }
        if (!allowed && meta && meta.broadcastFromTrainer && me.assignedTrainerId === meta.ownerId) {
          allowed = true
        }
        if (!allowed) return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      // Never trust the stored/client Content-Type: derive a safe type from the
      // (allowlisted) extension and force nosniff so a mislabelled file can never
      // execute as HTML/JS on our own origin (SEC-001).
      const ext = (key.split('.').pop() || '').toLowerCase()
      const TYPE_MAP = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
        gif: 'image/gif', heic: 'image/heic', heif: 'image/heif',
        mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4v: 'video/x-m4v',
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv', txt: 'text/plain',
      }
      const INLINE_OK = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif', 'mp4', 'mov', 'webm', 'm4v', 'pdf'])
      const safeType = TYPE_MAP[ext]
      if (!safeType) return handleCORS(NextResponse.json({ error: 'Unsupported file type' }, { status: 400 }))
      const baseName = (key.split('/').pop() || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
      const disposition = (INLINE_OK.has(ext) ? 'inline' : 'attachment') + '; filename="' + baseName + '"'
      try {
        const obj = await getS3().send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }))
        const bytes = await obj.Body.transformToByteArray()
        return new NextResponse(Buffer.from(bytes), {
          status: 200,
          headers: {
            'Content-Type': safeType,
            'Content-Length': String(bytes.length),
            'Content-Disposition': disposition,
            'X-Content-Type-Options': 'nosniff',
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
      const rl = rateLimit(request, 'register', 20, 60_000)
      if (!rl.ok) return tooMany(rl.retryAfter)
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
        // Local sign-ups are NOT email-verified (we don't own the inbox). This is
        // used to safely resolve a later Google sign-in for the same address.
        emailVerified: false,
        authProvider: 'local',
        demoSource: (body.demoSource ? String(body.demoSource).slice(0, 80) : null),
        createdAt: new Date(),
      }
      await db.collection('users').insertOne(user)
      const token = await signToken({ id: user.id, role: user.role })
      const res = NextResponse.json({ user: publicUser(user) })
      return handleCORS(setAuthCookie(res, token))
    }

    if (route === '/auth/login' && method === 'POST') {
      const rl = rateLimit(request, 'login', 20, 60_000)
      if (!rl.ok) return tooMany(rl.retryAfter)
      const body = await request.json()
      const identifier = (body.username || '').trim().toLowerCase()
      const password = body.password || ''
      const user = await db.collection('users').findOne({
        $or: [{ username: identifier }, { email: identifier }],
      })
      if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
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
      const rl = rateLimit(request, 'emergent', 40, 60_000)
      if (!rl.ok) return tooMany(rl.retryAfter)
      const body = await request.json().catch(() => ({}))
      const sessionId = (body.session_id || '').trim()
      if (!sessionId || sessionId.length > 512) {
        return handleCORS(NextResponse.json({ error: 'Invalid session_id' }, { status: 400 }))
      }
      let data
      try {
        const upstream = await fetch(
          `${process.env.EMERGENT_AUTH_BASE || 'https://demobackend.emergentagent.com'}/auth/v1/env/oauth/session-data`,
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
          emailVerified: true,       // Google verified this address
          picture,
          createdAt: new Date(),
        }
        await db.collection('users').insertOne(user)
      } else {
        // An account already exists for this Google-verified email. If it was a
        // local (password) account that we never verified, the password could
        // have been set by an attacker who pre-registered the victim's email
        // (account pre-hijacking, SEC-002). Google proves ownership here, so we
        // adopt the account and INVALIDATE any pre-existing local password.
        const takeover = user.authProvider !== 'google' && !user.emailVerified
        const setFields = {
          authProvider: 'google',
          emailVerified: true,
          picture: picture || user.picture || '',
          lastLoginAt: new Date(),
        }
        const update = { $set: setFields }
        if (takeover && user.passwordHash) {
          update.$unset = { passwordHash: '' }
        }
        await db.collection('users').updateOne({ id: user.id }, update)
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

    if (route === '/lead-capture' && method === 'POST') {
      const body = await request.json().catch(() => null)
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return handleCORS(NextResponse.json({ error: 'Invalid payload' }, { status: 400 }))
      }
      const upstream = await fetch(LEAD_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      }).catch(() => null)
      if (!upstream) {
        return handleCORS(NextResponse.json({ error: 'Lead service unavailable' }, { status: 502 }))
      }
      let data = null
      try {
        data = await upstream.json()
      } catch {}
      if (!upstream.ok) {
        return handleCORS(NextResponse.json({ error: data?.error || 'Lead service rejected the request' }, { status: 502 }))
      }
      return handleCORS(NextResponse.json({ ok: true, data }))
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
        hidden: Array.isArray(doc?.hidden) ? doc.hidden : [],
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
      if (Array.isArray(body.hidden)) {
        update.hidden = body.hidden.filter((s) => typeof s === 'string').map((s) => s.slice(0, 200)).slice(0, 200)
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
        hidden: Array.isArray(doc?.hidden) ? doc.hidden : [],
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
        // Explicitly hide the coach's spotlight video. We must persist a marker
        // (not delete) so the profile page won't fall back to the static default.
        coaches[slug] = { hidden: true }
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

    // ---------------- GENERIC PER-USER CLOUD STORE ----------------
    // A namespaced key/value store scoped to the logged-in user so client tools
    // (nutrition log, PRs, bodyweight, habits, custom foods, coach templates, etc.)
    // persist server-side and follow the member across devices. localStorage is
    // used only as a fast local cache on the client.
    if (route === '/client/store' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const key = request.nextUrl.searchParams.get('key')
      if (key) {
        const doc = await db.collection('user_store').findOne({ userId: user.id, key })
        return handleCORS(NextResponse.json({ found: !!doc, value: doc ? doc.value : null }))
      }
      const docs = await db.collection('user_store').find({ userId: user.id }).limit(200).toArray()
      const data = {}
      for (const d of docs) data[d.key] = d.value
      return handleCORS(NextResponse.json({ data }))
    }
    if (route === '/client/store' && method === 'PUT') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const body = await request.json()
      const key = typeof body.key === 'string' ? body.key.slice(0, 120) : ''
      if (!key) return handleCORS(NextResponse.json({ error: 'A key is required' }, { status: 400 }))
      // Guard against oversized payloads (protect the 16MB doc limit).
      let size = 0
      try { size = JSON.stringify(body.value ?? null).length } catch { size = 0 }
      if (size > 2_000_000) return handleCORS(NextResponse.json({ error: 'Value too large' }, { status: 413 }))
      await db.collection('user_store').updateOne(
        { userId: user.id, key },
        { $set: { userId: user.id, key, value: body.value ?? null, updatedAt: new Date() } },
        { upsert: true }
      )
      return handleCORS(NextResponse.json({ ok: true }))
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
        .find({}, { projection: { passwordHash: 0, coachNotes: 0, coachNotesUpdatedAt: 0 } })
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
      body.id = typeof body.id === 'string' ? body.id : ''
      if (!body.id) {
        return handleCORS(NextResponse.json({ error: 'id is required' }, { status: 400 }))
      }
      const target = await db.collection('users').findOne({ id: body.id })
      if (!target) {
        return handleCORS(NextResponse.json({ error: 'User not found' }, { status: 404 }))
      }
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
      body.id = typeof body.id === 'string' ? body.id : ''
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
      // Whitelist only the fields the check-in form submits — never spread raw
      // body (would let a member forge userId / seenByTrainer / trainerNote).
      const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '')
      // Optional form-critique video (uploaded via the chunked uploader → /api/files/...).
      const video = (typeof body.videoUrl === 'string' && body.videoUrl.startsWith('/api/files/')) ? body.videoUrl : null
      if (video && !(await ownsUploadKey(db, video, user.id))) {
        return handleCORS(NextResponse.json({ error: 'Invalid video reference.' }, { status: 400 }))
      }
      const checkin = {
        id: uuidv4(),
        userId: user.id,
        username: user.username,
        week: str(body.week, 80),
        readiness: str(body.readiness, 200),
        wins: str(body.wins, 4000),
        struggles: str(body.struggles, 4000),
        video,
        replies: [],
        seenByTrainer: false,
        hasCoachReply: false,
        trainerNote: '',
        createdAt: new Date(),
      }
      await db.collection('checkins').insertOne(checkin)
      // Let the member's assigned coach read the attached video (recipient-scoped ACL).
      if (video && user.assignedTrainerId) {
        await grantFileAccess(db, video, user.assignedTrainerId)
      }
      const { _id, ...clean } = checkin
      return handleCORS(NextResponse.json(clean))
    }

    // Member views their OWN check-in history (with coach replies + videos).
    if (route === '/checkins' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.portalAccess) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const list = await db.collection('checkins')
        .find({ userId: user.id })
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray()
      return handleCORS(NextResponse.json({ checkins: list.map(({ _id, ...r }) => r) }))
    }

    // Coach OR member adds a threaded reply (text and/or video) to a check-in.
    if (route === '/checkins/reply' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const body = await request.json()
      if (!body.checkinId || typeof body.checkinId !== 'string') {
        return handleCORS(NextResponse.json({ error: 'checkinId is required' }, { status: 400 }))
      }
      const ci = await db.collection('checkins').findOne({ id: body.checkinId })
      if (!ci) return handleCORS(NextResponse.json({ error: 'Check-in not found' }, { status: 404 }))
      const client = await db.collection('users').findOne({ id: ci.userId })
      const isOwner = user.id === ci.userId
      const isCoach = user.role === 'admin' || (user.isTrainer && client && client.assignedTrainerId === user.id)
      if (!isOwner && !isCoach) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const text = (typeof body.text === 'string' ? body.text.slice(0, 4000) : '')
      const video = (typeof body.videoUrl === 'string' && body.videoUrl.startsWith('/api/files/')) ? body.videoUrl : null
      if (!text && !video) {
        return handleCORS(NextResponse.json({ error: 'A message or video is required.' }, { status: 400 }))
      }
      if (video && !(await ownsUploadKey(db, video, user.id))) {
        return handleCORS(NextResponse.json({ error: 'Invalid video reference.' }, { status: 400 }))
      }
      const asCoach = isCoach && !isOwner
      const reply = {
        id: uuidv4(),
        authorId: user.id,
        authorName: user.username,
        authorRole: asCoach ? 'coach' : 'member',
        text,
        video,
        createdAt: new Date(),
      }
      await db.collection('checkins').updateOne(
        { id: ci.id },
        {
          $push: { replies: reply },
          // A coach reply marks the check-in reviewed; a member reply re-flags it.
          $set: asCoach
            ? { hasCoachReply: true, seenByTrainer: true }
            : { seenByTrainer: false },
        }
      )
      // Give the other party read access to any attached reply video.
      if (video) {
        if (asCoach) {
          await grantFileAccess(db, video, ci.userId)
        } else if (client && client.assignedTrainerId) {
          await grantFileAccess(db, video, client.assignedTrainerId)
        }
      }
      return handleCORS(NextResponse.json({ reply }))
    }

    // ---------------- PROGRESS: PHOTOS & BODY METRICS ----------------
    // Weekly progress photos (front/side/back). Files are uploaded privately via
    // /api/uploads/file first; here we record the entry and grant the member's
    // assigned coach read access to each photo.
    if (route === '/progress/photos' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.portalAccess) return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const body = await request.json().catch(() => ({}))
      const isFileUrl = (u) => typeof u === 'string' && u.startsWith('/api/files/')
      const front = isFileUrl(body.front) ? body.front : null
      const side = isFileUrl(body.side) ? body.side : null
      const back = isFileUrl(body.back) ? body.back : null
      if (!front && !side && !back) {
        return handleCORS(NextResponse.json({ error: 'Add at least one photo.' }, { status: 400 }))
      }
      // Only reference photos the member actually owns.
      for (const u of [front, side, back]) {
        if (u && !(await ownsUploadKey(db, u, user.id))) {
          return handleCORS(NextResponse.json({ error: 'Invalid photo reference.' }, { status: 400 }))
        }
      }
      const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '')
      const doc = {
        id: uuidv4(),
        userId: user.id,
        date: str(body.date, 20) || new Date().toISOString().slice(0, 10),
        front, side, back,
        weight: str(body.weight, 20),
        note: str(body.note, 1000),
        createdAt: new Date(),
      }
      await db.collection('progress_photos').insertOne(doc)
      if (user.assignedTrainerId) {
        for (const u of [front, side, back]) if (u) await grantFileAccess(db, u, user.assignedTrainerId)
      }
      const { _id, ...clean } = doc
      return handleCORS(NextResponse.json(clean))
    }
    if (route === '/progress/photos' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.portalAccess) return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const list = await db.collection('progress_photos').find({ userId: user.id }).sort({ date: 1, createdAt: 1 }).limit(500).toArray()
      return handleCORS(NextResponse.json({ photos: list.map(({ _id, ...r }) => r) }))
    }
    if (route === '/progress/photos' && method === 'DELETE') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const id = request.nextUrl.searchParams.get('id')
      if (!id) return handleCORS(NextResponse.json({ error: 'id is required' }, { status: 400 }))
      const existing = await db.collection('progress_photos').findOne({ id, userId: user.id })
      await db.collection('progress_photos').deleteOne({ id, userId: user.id })
      if (existing) for (const u of [existing.front, existing.side, existing.back]) if (u) await deleteUpload(db, u)
      return handleCORS(NextResponse.json({ ok: true }))
    }
    // Coach views an assigned client's progress photo timeline.
    if (route === '/trainer/progress-photos' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const clientId = request.nextUrl.searchParams.get('clientId')
      if (!clientId) return handleCORS(NextResponse.json({ error: 'clientId is required' }, { status: 400 }))
      const client = await db.collection('users').findOne({ id: clientId })
      if (!client || (user.role !== 'admin' && client.assignedTrainerId !== user.id)) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const list = await db.collection('progress_photos').find({ userId: clientId }).sort({ date: 1, createdAt: 1 }).limit(500).toArray()
      return handleCORS(NextResponse.json({ photos: list.map(({ _id, ...r }) => r) }))
    }

    // Body metrics — one entry per date (upsert). Weight, measurements, sleep,
    // steps, resting HR. Coach reads an assigned client's series.
    if (route === '/progress/metrics' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.portalAccess) return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const body = await request.json().catch(() => ({}))
      const num = (v) => {
        const n = parseFloat(v)
        return Number.isFinite(n) && n >= 0 && n < 100000 ? n : null
      }
      const date = (typeof body.date === 'string' ? body.date.slice(0, 20) : '') || new Date().toISOString().slice(0, 10)
      const fields = {
        weight: num(body.weight), waist: num(body.waist), chest: num(body.chest),
        hips: num(body.hips), arms: num(body.arms), thighs: num(body.thighs),
        sleepHrs: num(body.sleepHrs), steps: num(body.steps), restingHr: num(body.restingHr),
        note: (typeof body.note === 'string' ? body.note.slice(0, 500) : ''),
      }
      await db.collection('body_metrics').updateOne(
        { userId: user.id, date },
        { $set: { ...fields, userId: user.id, date, updatedAt: new Date() }, $setOnInsert: { id: uuidv4(), createdAt: new Date() } },
        { upsert: true }
      )
      const saved = await db.collection('body_metrics').findOne({ userId: user.id, date })
      const { _id, ...clean } = saved
      return handleCORS(NextResponse.json(clean))
    }
    if (route === '/progress/metrics' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.portalAccess) return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const list = await db.collection('body_metrics').find({ userId: user.id }).sort({ date: 1 }).limit(1000).toArray()
      return handleCORS(NextResponse.json({ metrics: list.map(({ _id, ...r }) => r) }))
    }
    if (route === '/progress/metrics' && method === 'DELETE') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const id = request.nextUrl.searchParams.get('id')
      if (!id) return handleCORS(NextResponse.json({ error: 'id is required' }, { status: 400 }))
      await db.collection('body_metrics').deleteOne({ id, userId: user.id })
      return handleCORS(NextResponse.json({ ok: true }))
    }
    if (route === '/trainer/progress-metrics' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const clientId = request.nextUrl.searchParams.get('clientId')
      if (!clientId) return handleCORS(NextResponse.json({ error: 'clientId is required' }, { status: 400 }))
      const client = await db.collection('users').findOne({ id: clientId })
      if (!client || (user.role !== 'admin' && client.assignedTrainerId !== user.id)) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const list = await db.collection('body_metrics').find({ userId: clientId }).sort({ date: 1 }).limit(1000).toArray()
      return handleCORS(NextResponse.json({ metrics: list.map(({ _id, ...r }) => r) }))
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
        .limit(500)
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
      const clients = await db.collection('users').find({ assignedTrainerId: user.id }).limit(500).toArray()
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
      if (!body.checkinId || typeof body.checkinId !== 'string') {
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
      if (!user || (!user.isTrainer && user.role !== 'admin')) {
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
    // ---- Public site stats (live counts, no auth) ----
    if (route === '/stats' && method === 'GET') {
      const users = db.collection('users')
      // Athletes coached = a base of 15 (coached before the site tracked it)
      // plus everyone who has paid for remote or in-person coaching here.
      const ATHLETES_BASE = 15
      const paidCoached = await users.countDocuments({
        accessType: { $in: ['remote_coaching', 'in_person'] },
      })
      // Total accounts on the website (exclude the seeded admin + demo client
      // so the number reflects real signups only).
      const totalAccounts = await users.countDocuments({
        role: { $ne: 'admin' },
        isDemo: { $ne: true },
      })
      // Workouts logged across all members (real, grows live).
      let workoutsLogged = 0
      try {
        const docs = await db.collection('tracker')
          .find({}, { projection: { workouts: 1 } })
          .toArray()
        for (const t of docs) {
          if (Array.isArray(t.workouts)) workoutsLogged += t.workouts.length
        }
      } catch { workoutsLogged = 0 }
      return handleCORS(NextResponse.json({
        athletesCoached: ATHLETES_BASE + paidCoached,
        totalAccounts,
        workoutsLogged,
      }))
    }

    // ---- Coaching applications ----
    // Public submission (no auth, no Google sign-in required)
    if (route === '/applications' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const name = (body.name || '').toString().trim()
      const email = (body.email || '').toString().trim()
      if (!name || !email) {
        return handleCORS(NextResponse.json({ error: 'Name and email are required' }, { status: 400 }))
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return handleCORS(NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 }))
      }
      const application = {
        id: uuidv4(),
        name,
        email,
        phone: (body.phone || '').toString().trim(),
        focus: (body.focus || '').toString().trim(),         // remote / in_person / custom / not_sure
        experience: (body.experience || '').toString().trim(),
        goals: (body.goals || '').toString().trim().slice(0, 4000),
        injuries: (body.injuries || '').toString().trim().slice(0, 4000),
        status: 'new',
        createdAt: new Date(),
      }
      await db.collection('applications').insertOne(application)
      const { _id, ...safe } = application
      return handleCORS(NextResponse.json({ ok: true, application: safe }))
    }

    // Admin: list applications
    if (route === '/applications' && method === 'GET') {
      const admin = await getCurrentUser(request, db)
      if (!admin || admin.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const apps = await db.collection('applications')
        .find({}, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .toArray()
      return handleCORS(NextResponse.json({ applications: apps }))
    }

    // Admin: update an application's status (new / reviewed / archived)
    if (route === '/applications' && method === 'PUT') {
      const admin = await getCurrentUser(request, db)
      if (!admin || admin.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const body = await request.json().catch(() => ({}))
      const { id, status } = body
      if (!id || !['new', 'reviewed', 'archived'].includes(status)) {
        return handleCORS(NextResponse.json({ error: 'Invalid request' }, { status: 400 }))
      }
      await db.collection('applications').updateOne({ id }, { $set: { status } })
      return handleCORS(NextResponse.json({ ok: true }))
    }




    if (route === '/professionals' && method === 'GET') {
      const list = await db.collection('users')
        .find({ isTrainer: true, profileCompleted: true })
        .sort({ createdAt: 1 })
        .limit(500)
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
      let clientId = typeof body.clientId === 'string' ? body.clientId : null
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
        .limit(500)
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
        .limit(500)
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
      let clientId = typeof b.clientId === 'string' ? b.clientId : null
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
      const list = await db.collection('coach_meals').find({ trainerId: user.id }).sort({ createdAt: -1 }).limit(500).toArray()
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
        .sort({ createdAt: -1 }).limit(500).toArray()
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
        goal: String(b.goal || '').trim(),
        injuries: String(b.injuries || '').trim(),
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

    // ---- Coach Tools: read a client's workout history (progress dashboard) ----
    if (route === '/trainer/client-tracker' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const clientId = request.nextUrl.searchParams.get('clientId')
      if (!clientId) return handleCORS(NextResponse.json({ error: 'clientId is required' }, { status: 400 }))
      const client = await db.collection('users').findOne({ id: String(clientId) })
      if (!client || (user.role !== 'admin' && client.assignedTrainerId !== user.id)) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const doc = await db.collection('tracker').findOne({ userId: String(clientId) })
      return handleCORS(NextResponse.json({
        workouts: Array.isArray(doc?.workouts) ? doc.workouts : [],
      }))
    }

    // ---- Coach Tools: push macro/calorie targets to a client ----
    if (route === '/trainer/push-macros' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const body = await request.json()
      const clientId = typeof body.clientId === 'string' ? body.clientId : ''
      const client = await db.collection('users').findOne({ id: clientId })
      if (!client || (user.role !== 'admin' && client.assignedTrainerId !== user.id)) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const goal = {
        calories: Math.max(0, Math.round(Number(body.goal?.calories) || 0)),
        protein: Math.max(0, Math.round(Number(body.goal?.protein) || 0)),
        carbs: Math.max(0, Math.round(Number(body.goal?.carbs) || 0)),
        fat: Math.max(0, Math.round(Number(body.goal?.fat) || 0)),
        setAt: new Date().toISOString(),
        setByName: user.trainerProfile?.displayName || user.username,
      }
      await db.collection('users').updateOne({ id: clientId }, { $set: { coachNutritionGoal: goal } })
      // Notify the client via their message thread so they see it immediately.
      const msg = {
        id: uuidv4(), trainerId: user.id, clientId, senderId: user.id, senderRole: 'trainer',
        body: `New nutrition targets from your coach: ${goal.calories} kcal · ${goal.protein}g protein · ${goal.carbs}g carbs · ${goal.fat}g fat. They're now loaded in your Nutrition Tracker.`,
        mediaUrl: null, mediaType: null, read: false, createdAt: new Date(),
      }
      await db.collection('messages').insertOne(msg)
      return handleCORS(NextResponse.json({ ok: true, goal }))
    }

    // ---- Client reads coach-set nutrition goal (Nutrition Tracker) ----
    if (route === '/client/coach-goal' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const fresh = await db.collection('users').findOne({ id: user.id })
      return handleCORS(NextResponse.json({ goal: fresh?.coachNutritionGoal || null }))
    }

    // ---- Coach Tools: broadcast one message to ALL assigned clients ----
    if (route === '/trainer/broadcast' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const body = await request.json()
      const text = (typeof body.body === 'string' ? body.body : '').trim().slice(0, 4000)
      if (!text) return handleCORS(NextResponse.json({ error: 'A message is required' }, { status: 400 }))
      const clients = await db.collection('users').find({ assignedTrainerId: user.id }).limit(500).toArray()
      if (!clients.length) return handleCORS(NextResponse.json({ ok: true, sent: 0 }))
      const now = new Date()
      const docs = clients.map((c) => ({
        id: uuidv4(), trainerId: user.id, clientId: c.id, senderId: user.id, senderRole: 'trainer',
        body: text, mediaUrl: null, mediaType: null, read: false, broadcast: true, createdAt: now,
      }))
      await db.collection('messages').insertMany(docs)
      return handleCORS(NextResponse.json({ ok: true, sent: docs.length }))
    }

    // ---- Coach Tools: private per-client notes (coach + admin only) ----
    if (route === '/trainer/client-notes' && (method === 'GET' || method === 'PUT')) {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const clientId = method === 'GET'
        ? request.nextUrl.searchParams.get('clientId')
        : null
      if (method === 'GET') {
        const client = await db.collection('users').findOne({ id: String(clientId || '') })
        if (!client || (user.role !== 'admin' && client.assignedTrainerId !== user.id)) {
          return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
        }
        return handleCORS(NextResponse.json({ notes: client.coachNotes || '' }))
      }
      const body = await request.json()
      const cid = typeof body.clientId === 'string' ? body.clientId : ''
      const client = await db.collection('users').findOne({ id: cid })
      if (!client || (user.role !== 'admin' && client.assignedTrainerId !== user.id)) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const notes = (typeof body.notes === 'string' ? body.notes : '').slice(0, 8000)
      await db.collection('users').updateOne({ id: cid }, { $set: { coachNotes: notes, coachNotesUpdatedAt: new Date() } })
      return handleCORS(NextResponse.json({ ok: true, notes }))
    }


    // ---- Coach Tools: client activity board (all clients at a glance) ----
    if (route === '/trainer/activity' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const clients = await db.collection('users').find({ assignedTrainerId: user.id }).limit(500).toArray()
      const out = []
      for (const c of clients) {
        const tr = await db.collection('tracker').findOne({ userId: c.id })
        const workouts = Array.isArray(tr?.workouts) ? tr.workouts : []
        const lastWorkout = workouts.reduce((m, w) => (w.date && w.date > m ? w.date : m), '')
        const nut = await db.collection('nutrition_logs').find({ userId: c.id }).sort({ date: -1 }).limit(1).toArray()
        const ci = await db.collection('checkins').find({ userId: c.id }).sort({ createdAt: -1 }).limit(1).toArray()
        out.push({
          id: c.id, username: c.username,
          workoutCount: workouts.length,
          lastWorkout: lastWorkout || null,
          lastNutrition: nut[0]?.date || null,
          lastCheckin: ci[0]?.createdAt || null,
        })
      }
      return handleCORS(NextResponse.json({ clients: out }))
    }

    // ---- Coach Insights: adherence scorecard, needs-attention flags, RPE/readiness ----
    if (route === '/trainer/insights' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const clients = await db.collection('users').find({ assignedTrainerId: user.id }).limit(500).toArray()
      const now = Date.now()
      const DAY = 86400000
      const weekKey = (d) => {
        const x = new Date(d)
        if (isNaN(x.getTime())) return null
        const oneJan = new Date(Date.UTC(x.getUTCFullYear(), 0, 1))
        const wk = Math.ceil((((x - oneJan) / DAY) + oneJan.getUTCDay() + 1) / 7)
        return `${x.getUTCFullYear()}-W${wk}`
      }
      const out = []
      for (const c of clients) {
        const tr = await db.collection('tracker').findOne({ userId: c.id })
        const workouts = Array.isArray(tr?.workouts) ? tr.workouts : []
        const wTimes = workouts.map((w) => new Date(w.date).getTime()).filter((t) => Number.isFinite(t))
        const lastWorkoutTs = wTimes.length ? Math.max(...wTimes) : null
        const workoutsLast7 = wTimes.filter((t) => now - t <= 7 * DAY).length
        const target = parseInt((c.clientProfile && c.clientProfile.workoutsPerWeek) || '', 10) || 3
        const workoutPct = Math.min(100, Math.round((workoutsLast7 / target) * 100))
        // Nutrition adherence over last 7 logged days
        const nut = await db.collection('nutrition_logs').find({ userId: c.id }).sort({ date: -1 }).limit(7).toArray()
        let hit = 0, counted = 0
        for (const d of nut) {
          const goalCal = d.goal && d.goal.calories
          const cal = d.totals && d.totals.cal
          if (goalCal && cal != null) { counted++; if (Math.abs(cal - goalCal) <= goalCal * 0.1) hit++ }
        }
        const macroHitRate = counted ? Math.round((hit / counted) * 100) : null
        const lastNutritionTs = nut[0]?.date ? new Date(nut[0].date).getTime() : null
        // Check-ins + consecutive-week streak
        const cis = await db.collection('checkins').find({ userId: c.id }).sort({ createdAt: -1 }).limit(60).toArray()
        const lastCheckin = cis[0]?.createdAt || null
        const weeks = new Set(cis.map((ci) => weekKey(ci.createdAt)).filter(Boolean))
        let streak = 0
        let cursor = new Date()
        for (;;) { const k = weekKey(cursor); if (k && weeks.has(k)) { streak++; cursor = new Date(cursor.getTime() - 7 * DAY) } else break }
        const latestReadiness = (cis[0]?.readiness || '').trim()
        const lowReadiness = /^(1|4)/.test(latestReadiness)
        // Average RPE across last 3 workouts
        const recent3 = [...workouts].sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0)).slice(0, 3)
        let rpeSum = 0, rpeN = 0
        for (const w of recent3) for (const ex of (w.exercises || [])) for (const s of (ex.sets || [])) {
          const r = parseFloat(s.rpe); if (Number.isFinite(r)) { rpeSum += r; rpeN++ }
        }
        const avgRpe = rpeN ? Math.round((rpeSum / rpeN) * 10) / 10 : null
        const highRpe = avgRpe != null && avgRpe >= 9
        // Needs-attention flags
        const flags = []
        const dwo = lastWorkoutTs ? Math.floor((now - lastWorkoutTs) / DAY) : null
        if (dwo === null || dwo > 5) flags.push({ type: 'no_workout', label: dwo === null ? 'No workouts logged yet' : `No workout in ${dwo} days` })
        const dci = lastCheckin ? Math.floor((now - new Date(lastCheckin).getTime()) / DAY) : null
        if (dci === null || dci > 8) flags.push({ type: 'missed_checkin', label: dci === null ? 'No check-in yet' : `No check-in in ${dci} days` })
        const dnut = lastNutritionTs ? Math.floor((now - lastNutritionTs) / DAY) : null
        if (dnut === null || dnut > 4) flags.push({ type: 'no_nutrition', label: dnut === null ? 'No nutrition logged' : `No nutrition in ${dnut} days` })
        else if (macroHitRate != null && macroHitRate < 40) flags.push({ type: 'macros_dropping', label: `Macros off target (${macroHitRate}% hit)` })
        if (lowReadiness) flags.push({ type: 'low_readiness', label: `Low readiness reported`, suggestion: 'Consider a lighter/deload session or drop top-set load ~5–10%.' })
        if (highRpe) flags.push({ type: 'high_rpe', label: `RPE trending high (avg ${avgRpe})`, suggestion: 'Fatigue building — suggest a deload or reduce top-set load.' })
        out.push({
          id: c.id, username: c.username, email: c.email,
          adherence: { workoutsLast7, workoutTarget: target, workoutPct, macroHitRate, checkinStreak: streak },
          lastWorkout: lastWorkoutTs ? new Date(lastWorkoutTs).toISOString() : null,
          lastCheckin, lastNutrition: nut[0]?.date || null,
          avgRpe, latestReadiness,
          flags,
        })
      }
      out.sort((a, b) => b.flags.length - a.flags.length)
      return handleCORS(NextResponse.json({ clients: out }))
    }
    if (route === '/trainer/client-goals' && (method === 'GET' || method === 'PUT')) {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const cid = method === 'GET' ? request.nextUrl.searchParams.get('clientId') : null
      if (method === 'GET') {
        const client = await db.collection('users').findOne({ id: String(cid || '') })
        if (!client || (user.role !== 'admin' && client.assignedTrainerId !== user.id)) {
          return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
        }
        return handleCORS(NextResponse.json({ goals: Array.isArray(client.coachGoals) ? client.coachGoals : [] }))
      }
      const body = await request.json()
      const clientId = typeof body.clientId === 'string' ? body.clientId : ''
      const client = await db.collection('users').findOne({ id: clientId })
      if (!client || (user.role !== 'admin' && client.assignedTrainerId !== user.id)) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const goals = (Array.isArray(body.goals) ? body.goals : []).slice(0, 50).map((g) => ({
        id: typeof g.id === 'string' ? g.id : uuidv4(),
        label: String(g.label || '').slice(0, 120),
        target: Number(g.target) || 0,
        current: Number(g.current) || 0,
        unit: String(g.unit || '').slice(0, 12),
      }))
      await db.collection('users').updateOne({ id: clientId }, { $set: { coachGoals: goals } })
      return handleCORS(NextResponse.json({ ok: true, goals }))
    }

    // ---- Coach Tools: per-client intake / onboarding checklist ----
    if (route === '/trainer/client-intake' && (method === 'GET' || method === 'PUT')) {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const own = async (cid) => {
        const c = await db.collection('users').findOne({ id: String(cid || '') })
        return c && (user.role === 'admin' || c.assignedTrainerId === user.id) ? c : null
      }
      if (method === 'GET') {
        const c = await own(request.nextUrl.searchParams.get('clientId'))
        if (!c) return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
        return handleCORS(NextResponse.json({ items: Array.isArray(c.intakeChecklist) ? c.intakeChecklist : [] }))
      }
      const body = await request.json()
      const c = await own(body.clientId)
      if (!c) return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 50).map((it) => ({
        id: typeof it.id === 'string' ? it.id : uuidv4(),
        label: String(it.label || '').slice(0, 160),
        done: !!it.done,
      }))
      await db.collection('users').updateOne({ id: c.id }, { $set: { intakeChecklist: items } })
      return handleCORS(NextResponse.json({ ok: true, items }))
    }

    // ---- Admin: analytics summary ----
    if (route === '/admin/analytics' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || user.role !== 'admin') return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const users = await db.collection('users').find({}).limit(20000).toArray()
      const now = Date.now()
      const d30 = now - 30 * 86400000
      const members = users.filter((u) => u.role !== 'admin')
      const weeks = []
      for (let i = 7; i >= 0; i--) {
        const start = now - (i + 1) * 7 * 86400000
        const end = now - i * 7 * 86400000
        const count = users.filter((u) => { const t = new Date(u.createdAt || 0).getTime(); return t >= start && t < end }).length
        weeks.push({ label: `${i === 0 ? 'This wk' : i + 'w ago'}`, count })
      }
      const [forumPosts, checkins] = await Promise.all([
        db.collection('forum_posts').countDocuments({}),
        db.collection('checkins').countDocuments({}),
      ])
      return handleCORS(NextResponse.json({
        totalMembers: members.length,
        portalAccess: members.filter((u) => u.portalAccess).length,
        trainers: users.filter((u) => u.isTrainer).length,
        newLast30: users.filter((u) => new Date(u.createdAt || 0).getTime() >= d30).length,
        activeSubscribers: users.filter((u) => u.stripeSubscriptionId).length,
        forumPosts, checkins,
        signupsByWeek: weeks,
      }))
    }

    // ---- Admin: revenue / subscription breakdown ----
    if (route === '/admin/revenue' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || user.role !== 'admin') return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const users = await db.collection('users').find({ stripeSubscriptionId: { $exists: true, $ne: null } }).limit(20000).toArray()
      const byPlan = {}
      for (const u of users) {
        const plan = u.accessType || 'unknown'
        byPlan[plan] = (byPlan[plan] || 0) + 1
      }
      return handleCORS(NextResponse.json({
        activeSubscribers: users.length,
        byPlan: Object.entries(byPlan).map(([plan, count]) => ({ plan, count })),
      }))
    }

    // ---- Site announcement banner ----
    if (route === '/announcement' && method === 'GET') {
      const doc = await db.collection('site_content').findOne({ key: 'announcement' })
      return handleCORS(NextResponse.json({
        enabled: !!doc?.enabled && !!doc?.message,
        message: doc?.message || '',
        updatedAt: doc?.updatedAt || null,
      }))
    }
    if (route === '/admin/announcement' && method === 'PUT') {
      const user = await getCurrentUser(request, db)
      if (!user || user.role !== 'admin') return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const body = await request.json()
      const message = String(body.message || '').slice(0, 300)
      const enabled = !!body.enabled
      await db.collection('site_content').updateOne(
        { key: 'announcement' },
        { $set: { key: 'announcement', message, enabled, updatedAt: new Date() } },
        { upsert: true }
      )
      return handleCORS(NextResponse.json({ ok: true, enabled, message }))
    }

    // ---- First-week-free trial settings ----
    // Admin toggles a free trial for NEW remote coaching clients (card on file, no
    // charge during the trial, auto-bills after unless cancelled).
    if (route === '/admin/trial-settings' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || user.role !== 'admin') return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const doc = await db.collection('site_content').findOne({ key: 'trial_settings' })
      return handleCORS(NextResponse.json({
        enabled: !!doc?.enabled,
        days: Number(doc?.days) > 0 ? Number(doc.days) : 7,
        updatedAt: doc?.updatedAt || null,
      }))
    }
    if (route === '/admin/trial-settings' && method === 'PUT') {
      const user = await getCurrentUser(request, db)
      if (!user || user.role !== 'admin') return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const body = await request.json()
      const enabled = !!body.enabled
      let days = Math.round(Number(body.days))
      if (!Number.isFinite(days) || days < 1) days = 7
      if (days > 365) days = 365
      await db.collection('site_content').updateOne(
        { key: 'trial_settings' },
        { $set: { key: 'trial_settings', enabled, days, updatedAt: new Date() } },
        { upsert: true }
      )
      return handleCORS(NextResponse.json({ ok: true, enabled, days }))
    }
    // Lightweight info for the client portal: is a free week available to THIS user?
    if (route === '/trial-info' && method === 'GET') {
      const doc = await db.collection('site_content').findOne({ key: 'trial_settings' })
      const enabled = !!doc?.enabled
      const days = Number(doc?.days) > 0 ? Number(doc.days) : 7
      let eligible = false
      if (enabled) {
        const user = await getCurrentUser(request, db)
        if (user) {
          const priorPaid = await db.collection('payment_transactions').findOne({ userId: user.id, accessGranted: true })
          eligible = !user.portalAccess && !user.stripeSubscriptionId && !priorPaid
        }
      }
      return handleCORS(NextResponse.json({ enabled, days, eligible }))
    }
    // ---- Admin: bulk assign clients to a trainer ----
    if (route === '/admin/bulk-assign' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user || user.role !== 'admin') return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const body = await request.json()
      const clientIds = (Array.isArray(body.clientIds) ? body.clientIds : []).filter((s) => typeof s === 'string').slice(0, 1000)
      const trainerId = typeof body.trainerId === 'string' ? body.trainerId : ''
      if (!clientIds.length) return handleCORS(NextResponse.json({ error: 'No clients selected' }, { status: 400 }))
      if (trainerId) {
        const t = await db.collection('users').findOne({ id: trainerId })
        if (!t || !t.isTrainer) return handleCORS(NextResponse.json({ error: 'Invalid trainer' }, { status: 400 }))
      }
      const res = await db.collection('users').updateMany(
        { id: { $in: clientIds } },
        { $set: { assignedTrainerId: trainerId || null } }
      )
      return handleCORS(NextResponse.json({ ok: true, updated: res.modifiedCount }))
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
      const toUserId = typeof body.toUserId === 'string' ? body.toUserId : ''
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
      // Grant the recipient read access to any attached private media (owner =
      // sender already has access; the other party is added here).
      if (msg.mediaUrl) await grantFileAccess(db, msg.mediaUrl, other.id)
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
      // Reflect that read state in the response we just fetched (avoid stale flags).
      return handleCORS(NextResponse.json({
        messages: list.map(({ _id, ...r }) => (r.senderId !== user.id ? { ...r, read: true } : r)),
      }))
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
      const clients = await db.collection('users').find({ assignedTrainerId: user.id }).limit(500).toArray()
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
        const ALLOWED = new Set(['png','jpg','jpeg','webp','gif','heic','heif','mp4','mov','webm','m4v','pdf','doc','docx','xls','xlsx','csv','txt','m4a','mp3','wav','ogg','oga','aac'])
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

    // ---- Chunked video upload (bypasses proxy body-size limits for large videos) ----
    // Flow: init -> append (many) -> complete. Chunks land in a per-upload temp dir,
    // then are concatenated and pushed to durable R2 storage (private by default).
    if (route === '/uploads/video/init' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const rl = rateLimit(request, 'video-init', 30, 60_000)
      if (!rl.ok) return tooMany(rl.retryAfter)
      const body = await request.json().catch(() => ({}))
      const origName = String(body.filename || 'video').replace(/[^a-zA-Z0-9._-]/g, '_')
      const ext = origName.includes('.') ? origName.split('.').pop().toLowerCase() : ''
      const ALLOWED = new Set(['mp4', 'mov', 'webm', 'm4v'])
      if (!ALLOWED.has(ext)) {
        return handleCORS(NextResponse.json({ error: 'Use an MP4, MOV, WEBM or M4V video.' }, { status: 400 }))
      }
      // Reap abandoned sessions (>1h old) + their temp dirs so /tmp can't fill up.
      const stale = await db.collection('upload_sessions')
        .find({ createdAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } }).limit(200).toArray()
      for (const s of stale) {
        await rm('/tmp/ts-chunks/' + s.uploadId, { recursive: true, force: true }).catch(() => {})
      }
      if (stale.length) {
        await db.collection('upload_sessions').deleteMany({ uploadId: { $in: stale.map((s) => s.uploadId) } }).catch(() => {})
      }
      // Cap concurrent in-flight uploads per user to bound memory/disk usage.
      const active = await db.collection('upload_sessions').countDocuments({ ownerId: user.id })
      if (active >= 5) {
        return handleCORS(NextResponse.json({ error: 'Too many uploads in progress. Finish or wait, then try again.' }, { status: 429 }))
      }
      const uploadId = uuidv4()
      await db.collection('upload_sessions').insertOne({
        uploadId, ownerId: user.id, ext, mime: String(body.mime || 'video/mp4'), received: 0, createdAt: new Date(),
      })
      await mkdir('/tmp/ts-chunks/' + uploadId, { recursive: true })
      return handleCORS(NextResponse.json({ uploadId }))
    }

    if (route === '/uploads/video/append' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const rl = rateLimit(request, 'video-append', 600, 60_000)
      if (!rl.ok) return tooMany(rl.retryAfter)
      const form = await request.formData()
      const uploadId = String(form.get('uploadId') || '')
      const index = parseInt(String(form.get('index') || ''), 10)
      if (!/^[0-9a-f-]{36}$/.test(uploadId) || !Number.isInteger(index) || index < 0 || index > 200000) {
        return handleCORS(NextResponse.json({ error: 'Bad upload part' }, { status: 400 }))
      }
      const sess = await db.collection('upload_sessions').findOne({ uploadId, ownerId: user.id })
      if (!sess) return handleCORS(NextResponse.json({ error: 'Upload session not found' }, { status: 404 }))
      const chunk = form.get('chunk')
      if (!chunk || typeof chunk === 'string') {
        return handleCORS(NextResponse.json({ error: 'No chunk provided' }, { status: 400 }))
      }
      // Reject an oversized single chunk BEFORE reading it into memory (DoS guard).
      if (typeof chunk.size === 'number' && chunk.size > 8 * 1024 * 1024) {
        return handleCORS(NextResponse.json({ error: 'Chunk too large.' }, { status: 400 }))
      }
      const buf = Buffer.from(await chunk.arrayBuffer())
      const newTotal = (sess.received || 0) + buf.length
      if (newTotal > 500 * 1024 * 1024) {
        await rm('/tmp/ts-chunks/' + uploadId, { recursive: true, force: true }).catch(() => {})
        await db.collection('upload_sessions').deleteOne({ uploadId })
        return handleCORS(NextResponse.json({ error: 'Video too large (max 500MB).' }, { status: 400 }))
      }
      await writeFile('/tmp/ts-chunks/' + uploadId + '/' + String(index).padStart(6, '0') + '.part', buf)
      await db.collection('upload_sessions').updateOne({ uploadId }, { $set: { received: newTotal } })
      return handleCORS(NextResponse.json({ ok: true }))
    }

    if (route === '/uploads/video/complete' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const rl = rateLimit(request, 'video-complete', 60, 60_000)
      if (!rl.ok) return tooMany(rl.retryAfter)
      const body = await request.json().catch(() => ({}))
      const uploadId = String(body.uploadId || '')
      if (!/^[0-9a-f-]{36}$/.test(uploadId)) {
        return handleCORS(NextResponse.json({ error: 'Bad upload id' }, { status: 400 }))
      }
      const sess = await db.collection('upload_sessions').findOne({ uploadId, ownerId: user.id })
      if (!sess) return handleCORS(NextResponse.json({ error: 'Upload session not found' }, { status: 404 }))
      const dir = '/tmp/ts-chunks/' + uploadId
      try {
        const files = (await readdir(dir)).filter((f) => f.endsWith('.part')).sort()
        const buffers = []
        for (const f of files) buffers.push(await readFile(nodePath.join(dir, f)))
        const buffer = Buffer.concat(buffers)
        await rm(dir, { recursive: true, force: true }).catch(() => {})
        await db.collection('upload_sessions').deleteOne({ uploadId })
        if (!buffer.length) {
          return handleCORS(NextResponse.json({ error: 'No data received.' }, { status: 400 }))
        }
        const url = await saveUploadBuffer(db, buffer, sess.ext, sess.mime, user.id, 'private')
        return handleCORS(NextResponse.json({ url, mime: sess.mime }))
      } catch (e) {
        console.error('Video assemble error:', e)
        await rm(dir, { recursive: true, force: true }).catch(() => {})
        await db.collection('upload_sessions').deleteOne({ uploadId }).catch(() => {})
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
      let clientId = typeof body.clientId === 'string' ? body.clientId : null
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
      // Grant the intended recipient read access (recipient-scoped ACL). A file
      // targeted at one client is visible only to that client; a broadcast file
      // (no clientId) is visible to all of this trainer's clients.
      if (clientId) {
        await grantFileAccess(db, doc.url, clientId)
      } else {
        await markFileBroadcast(db, doc.url)
      }
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
        .limit(500)
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
      const existing = await db.collection('trainerFiles').findOne({ id, trainerId: user.id })
      await db.collection('trainerFiles').deleteOne({ id, trainerId: user.id })
      if (existing?.url) await deleteUpload(db, existing.url)
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
        .limit(500)
        .toArray()
      return handleCORS(NextResponse.json({ files: list.map(({ _id, ...r }) => r) }))
    }

    // ---------------- COACH DEMO VIDEO LIBRARY ----------------
    // Trainers publish exercise/technique demo videos. scope: 'global' (all their
    // clients) or a specific client. Reuses the same recipient-scoped file ACL.
    if (route === '/trainer/videos' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const body = await request.json()
      if (!body.url || !body.title) {
        return handleCORS(NextResponse.json({ error: 'A video and title are required.' }, { status: 400 }))
      }
      if (typeof body.url !== 'string' || !body.url.startsWith('/api/files/')) {
        return handleCORS(NextResponse.json({ error: 'Invalid video reference.' }, { status: 400 }))
      }
      if (!(await ownsUploadKey(db, body.url, user.id))) {
        return handleCORS(NextResponse.json({ error: 'You can only publish videos you uploaded.' }, { status: 400 }))
      }
      const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '')
      let clientId = (typeof body.clientId === 'string' && body.clientId) ? body.clientId : null
      if (clientId) {
        const c = await db.collection('users').findOne({ id: clientId })
        if (!c || (user.role !== 'admin' && c.assignedTrainerId !== user.id)) {
          return handleCORS(NextResponse.json({ error: 'That client is not assigned to you.' }, { status: 400 }))
        }
      }
      const doc = {
        id: uuidv4(),
        trainerId: user.id,
        trainerName: user.username,
        clientId,
        title: str(body.title, 120),
        description: str(body.description, 2000),
        category: str(body.category, 60),
        url: body.url,
        mime: str(body.mime, 100),
        createdAt: new Date(),
      }
      await db.collection('trainer_videos').insertOne(doc)
      if (clientId) {
        await grantFileAccess(db, doc.url, clientId)
      } else {
        await markFileBroadcast(db, doc.url)
      }
      const { _id, ...clean } = doc
      return handleCORS(NextResponse.json(clean))
    }

    if (route === '/trainer/videos' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const list = await db.collection('trainer_videos')
        .find({ trainerId: user.id })
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray()
      return handleCORS(NextResponse.json({ videos: list.map(({ _id, ...r }) => r) }))
    }

    if (route === '/trainer/videos' && method === 'DELETE') {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      const id = request.nextUrl.searchParams.get('id')
      if (!id) return handleCORS(NextResponse.json({ error: 'id is required' }, { status: 400 }))
      const existing = await db.collection('trainer_videos').findOne({ id, trainerId: user.id })
      await db.collection('trainer_videos').deleteOne({ id, trainerId: user.id })
      if (existing?.url) await deleteUpload(db, existing.url)
      return handleCORS(NextResponse.json({ ok: true }))
    }

    // Member sees demo videos available to them: their coach's global demos + any
    // videos targeted specifically at them.
    if (route === '/member/videos' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.portalAccess) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      if (!user.assignedTrainerId) return handleCORS(NextResponse.json({ videos: [] }))
      const list = await db.collection('trainer_videos')
        .find({ trainerId: user.assignedTrainerId, $or: [{ clientId: user.id }, { clientId: null }] })
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray()
      return handleCORS(NextResponse.json({ videos: list.map(({ _id, ...r }) => r) }))
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
      const base = getAppBaseUrl(request)
      const txId = uuidv4()
      const successUrl = `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${base}/billing/cancel`

      // First-week-free trial: admin-toggled, remote coaching only, first-time clients only.
      let trialDays = 0
      if (body.packageId === 'remote_coaching_400') {
        const cfg = await db.collection('site_content').findOne({ key: 'trial_settings' })
        if (cfg?.enabled && Number(cfg.days) > 0) {
          const priorPaid = await db.collection('payment_transactions').findOne({ userId: user.id, accessGranted: true })
          const isNewClient = !user.portalAccess && !user.stripeSubscriptionId && !priorPaid
          if (isNewClient) trialDays = Math.min(365, Math.round(Number(cfg.days)))
        }
      }

      try {
        const session = await createStripeSession(pkg, {
          successUrl,
          cancelUrl,
          metadata: { txId, userId: user.id, packageId: body.packageId },
          email: user.email,
          trialDays,
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
          trialDays,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        return handleCORS(NextResponse.json({ url: session.url, sessionId: session.id, trialDays }))
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
        await ensureCoachAssigned(db, user.id)
      }
      return handleCORS(NextResponse.json({
        paid,
        status: s.status,
        payment_status: s.payment_status,
        packageId: tx.packageId,
      }))
    }

    // ---- Member: update their own profile (display name + email) ----
    if (route === '/account/profile' && method === 'PUT') {
      const user = await getCurrentUser(request, db)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      }
      const body = await request.json().catch(() => ({}))
      const updates = {}
      if (typeof body.username === 'string' && body.username.trim()) {
        const uname = body.username.trim().slice(0, 40)
        const clash = await db.collection('users').findOne({ username: uname, id: { $ne: user.id } })
        if (clash) {
          return handleCORS(NextResponse.json({ error: 'That display name is already taken.' }, { status: 400 }))
        }
        updates.username = uname
      }
      if (typeof body.email === 'string' && body.email.trim()) {
        const email = body.email.trim().toLowerCase()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return handleCORS(NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 }))
        }
        const clash = await db.collection('users').findOne({ email, id: { $ne: user.id } })
        if (clash) {
          return handleCORS(NextResponse.json({ error: 'That email is already in use.' }, { status: 400 }))
        }
        updates.email = email
      }
      if (!Object.keys(updates).length) {
        return handleCORS(NextResponse.json({ error: 'Nothing to update.' }, { status: 400 }))
      }
      await db.collection('users').updateOne({ id: user.id }, { $set: updates })
      const fresh = await db.collection('users').findOne({ id: user.id })
      return handleCORS(NextResponse.json({ ok: true, user: publicUser(fresh) }))
    }

    // ---- Member: their own billing history ----
    if (route === '/billing/history' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      }
      const txns = await db.collection('payment_transactions')
        .find(
          { userId: user.id },
          { projection: { _id: 0, id: 1, packageId: 1, amount: 1, currency: 1, accessType: 1, status: 1, paymentStatus: 1, createdAt: 1 } }
        )
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray()
      return handleCORS(NextResponse.json({ transactions: txns }))
    }

    // ---- Member: downloadable PDF receipt for one of their transactions ----
    if (route === '/billing/invoice' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      }
      const txId = request.nextUrl.searchParams.get('id')
      if (!txId) {
        return handleCORS(NextResponse.json({ error: 'id is required' }, { status: 400 }))
      }
      const tx = await db.collection('payment_transactions').findOne({ id: txId, userId: user.id })
      if (!tx) {
        return handleCORS(NextResponse.json({ error: 'Receipt not found' }, { status: 404 }))
      }
      const isPaid = tx.paymentStatus === 'paid' || tx.status === 'complete' || tx.accessGranted
      if (!isPaid) {
        return handleCORS(NextResponse.json({ error: 'A receipt is available once the payment is complete.' }, { status: 400 }))
      }
      try {
        const pkg = PACKAGES[tx.packageId] || {}
        const itemLabel = pkg.label || tx.accessType || 'Tensor Strength purchase'
        const currency = (tx.currency || 'cad').toUpperCase()
        const amount = ((tx.amount || 0) / 100).toFixed(2)
        const dateStr = new Date(tx.completedAt || tx.createdAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        const receiptNo = `TS-${String(tx.id).slice(0, 8).toUpperCase()}`

        const doc = await PDFDocument.create()
        const page = doc.addPage([612, 792]) // US Letter
        const bold = await doc.embedFont(StandardFonts.HelveticaBold)
        const font = await doc.embedFont(StandardFonts.Helvetica)
        const ink = rgb(0.04, 0.02, 0.13)
        const electric = rgb(0.13, 0.45, 1)
        const grey = rgb(0.4, 0.4, 0.45)
        const M = 56
        let y = 736

        // Header band
        page.drawRectangle({ x: 0, y: 748, width: 612, height: 44, color: ink })
        page.drawText('TENSOR STRENGTH', { x: M, y: 762, size: 16, font: bold, color: rgb(1, 1, 1) })
        page.drawText('RECEIPT', { x: 612 - M - bold.widthOfTextAtSize('RECEIPT', 16), y: 762, size: 16, font: bold, color: electric })

        y = 700
        page.drawText('Payment receipt', { x: M, y, size: 22, font: bold, color: ink })
        y -= 30
        page.drawText(`Receipt no.  ${receiptNo}`, { x: M, y, size: 11, font, color: grey })
        y -= 16
        page.drawText(`Date  ${dateStr}`, { x: M, y, size: 11, font, color: grey })

        // Billed to
        y -= 40
        page.drawText('BILLED TO', { x: M, y, size: 9, font: bold, color: electric })
        y -= 16
        page.drawText(user.username || 'Member', { x: M, y, size: 12, font, color: ink })
        if (user.email) { y -= 15; page.drawText(user.email, { x: M, y, size: 11, font, color: grey }) }

        // From
        page.drawText('FROM', { x: 340, y: 620, size: 9, font: bold, color: electric })
        page.drawText('Tensor Strength', { x: 340, y: 604, size: 12, font, color: ink })
        page.drawText('TensorStrength.com', { x: 340, y: 589, size: 11, font, color: grey })

        // Line items table
        y -= 46
        page.drawLine({ start: { x: M, y }, end: { x: 612 - M, y }, thickness: 1, color: rgb(0.85, 0.85, 0.88) })
        y -= 20
        page.drawText('DESCRIPTION', { x: M, y, size: 9, font: bold, color: grey })
        page.drawText('AMOUNT', { x: 612 - M - bold.widthOfTextAtSize('AMOUNT', 9), y, size: 9, font: bold, color: grey })
        y -= 20
        page.drawText(itemLabel, { x: M, y, size: 12, font, color: ink })
        const amtStr = `${currency} $${amount}`
        page.drawText(amtStr, { x: 612 - M - font.widthOfTextAtSize(amtStr, 12), y, size: 12, font, color: ink })
        y -= 12
        page.drawLine({ start: { x: M, y }, end: { x: 612 - M, y }, thickness: 1, color: rgb(0.85, 0.85, 0.88) })

        // Total
        y -= 26
        page.drawText('Total paid', { x: 612 - M - 200, y, size: 12, font: bold, color: ink })
        const totalStr = `${currency} $${amount}`
        page.drawText(totalStr, { x: 612 - M - bold.widthOfTextAtSize(totalStr, 14), y: y - 1, size: 14, font: bold, color: electric })

        // Status pill text
        y -= 40
        page.drawText('Status:  PAID', { x: M, y, size: 11, font: bold, color: rgb(0.1, 0.55, 0.3) })

        // Footer note
        page.drawText('Thank you for training with Tensor Strength.', { x: M, y: 90, size: 10, font, color: grey })
        page.drawText('This receipt was generated for your records. Questions? Reply to your welcome email.', { x: M, y: 74, size: 9, font, color: grey })

        const bytes = await doc.save()
        const headers = new Headers()
        headers.set('Content-Type', 'application/pdf')
        headers.set('Content-Disposition', `inline; filename="Tensor-Strength-Receipt-${receiptNo}.pdf"`)
        headers.set('Cache-Control', 'private, no-store')
        return new NextResponse(Buffer.from(bytes), { status: 200, headers })
      } catch (e) {
        console.error('Receipt generation error:', e)
        return handleCORS(NextResponse.json({ error: 'Unable to generate receipt right now.' }, { status: 502 }))
      }
    }

    // ============================ GAMIFICATION ROUTES ============================
    if (route === '/gamification' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      const sum = xpSummary(user.xp)
      const unlocked = unlockedFor(sum.level)
      const isPaid = !!user.portalAccess
      // Custom quests: site-wide + any assigned to this member by their trainer.
      const custom = await db.collection('site_quests').find({
        active: true,
        $or: [{ scope: 'site' }, { scope: 'trainer', clientIds: user.id }],
      }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(30).toArray()
      return handleCORS(NextResponse.json({
        xp: sum, isPaid,
        goals: user.goals || [],
        equippedAvatar: user.equippedAvatar || 'seed',
        equippedTitle: user.equippedTitle || 'newcomer',
        unlocked,
        claims: user.questClaims || {},
        avatars: AVATARS, titles: TITLES,
        quests: QUEST_DEFS,
        goalQuests: goalQuestsFor(user.goals),
        customQuests: custom,
        xpAward: XP_AWARD,
        streak: user.streak || 0,
        badges: BADGES,
        earnedBadges: user.badges || [],
      }))
    }

    if (route === '/gamification/goals' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      const body = await request.json().catch(() => ({}))
      const goals = Array.isArray(body.goals) ? body.goals.filter(g => typeof g === 'string').slice(0, 6) : []
      await db.collection('users').updateOne({ id: user.id }, { $set: { goals } })
      return handleCORS(NextResponse.json({ ok: true, goals }))
    }

    // Award XP for a logged workout (deduped by workoutId so re-saving can't farm).
    if (route === '/gamification/workout' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      const body = await request.json().catch(() => ({}))
      const wid = String(body.workoutId || '').slice(0, 60)
      if (!wid) return handleCORS(NextResponse.json({ error: 'workoutId required' }, { status: 400 }))
      const awarded = user.awardedWorkouts || []
      const already = awarded.includes(wid)
      // Update daily streak (runs whenever a workout is logged today).
      const todayStr = periodId('daily')
      const yStr = periodId('daily', new Date(Date.now() - 86400000))
      let streak = user.streak || 0
      let streakBonus = 0
      if (user.lastActiveDay !== todayStr) {
        streak = user.lastActiveDay === yStr ? streak + 1 : 1
        streakBonus = Math.min(50, streak * 5) // escalating daily bonus, capped
      }
      const newAwarded = already ? awarded : [wid, ...awarded].slice(0, 400)
      // Anti-cheat: pay workout XP at most ONCE per day (logging extra sessions
      // still counts for streak/badges but can't farm XP). Streak bonus is already
      // gated to once/day via lastActiveDay above.
      const paidToday = user.lastWorkoutXpDay === todayStr
      const awardWorkoutXp = !already && !paidToday
      const workoutXp = awardWorkoutXp ? XP_AWARD.workout : 0
      let newXp = (user.xp || 0) + workoutXp + streakBonus
      // Evaluate one-off badges against fresh stats.
      const stats = { workouts: newAwarded.length, streak, questClaims: user.questClaimCount || 0, level: levelFromXp(newXp) }
      const newBadges = evalBadges(stats, user.badges || [])
      if (newBadges.length) newXp += badgeXp(newBadges)
      await db.collection('users').updateOne({ id: user.id }, {
        $set: {
          xp: newXp,
          awardedWorkouts: newAwarded,
          streak,
          lastActiveDay: todayStr,
          ...(awardWorkoutXp ? { lastWorkoutXpDay: todayStr } : {}),
          badges: [...(user.badges || []), ...newBadges],
        },
      })
      return handleCORS(NextResponse.json({
        ok: true, awarded: awardWorkoutXp, gained: workoutXp + streakBonus,
        streak, streakBonus, newBadges, xp: xpSummary(newXp),
      }))
    }

    // Claim a quest's XP (deduped per period).
    if (route === '/gamification/claim' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      const body = await request.json().catch(() => ({}))
      const qid = String(body.questId || '')
      let quest = QUEST_DEFS.find(q => q.id === qid)
      if (!quest) quest = goalQuestsFor(user.goals).find(q => q.id === qid)
      if (!quest) {
        const c = await db.collection('site_quests').findOne({ id: qid, active: true })
        if (c) quest = { id: c.id, period: c.period, xp: Math.min(500, c.xp || 100) }
      }
      if (!quest) return handleCORS(NextResponse.json({ error: 'Unknown quest' }, { status: 400 }))
      const pid = periodId(quest.period)
      const claims = user.questClaims || {}
      if (claims[qid] === pid) {
        return handleCORS(NextResponse.json({ error: 'Already claimed this period', xp: xpSummary(user.xp) }, { status: 409 }))
      }
      claims[qid] = pid
      const claimCount = (user.questClaimCount || 0) + 1
      let newXp = (user.xp || 0) + quest.xp
      const stats = { workouts: (user.awardedWorkouts || []).length, streak: user.streak || 0, questClaims: claimCount, level: levelFromXp(newXp) }
      const newBadges = evalBadges(stats, user.badges || [])
      if (newBadges.length) newXp += badgeXp(newBadges)
      await db.collection('users').updateOne({ id: user.id }, {
        $set: { xp: newXp, questClaims: claims, questClaimCount: claimCount, badges: [...(user.badges || []), ...newBadges] },
      })
      return handleCORS(NextResponse.json({ ok: true, gained: quest.xp, newBadges, xp: xpSummary(newXp) }))
    }

    // Equip an unlocked avatar / title (paying members only for rewards).
    if (route === '/gamification/equip' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      if (!user.portalAccess) return handleCORS(NextResponse.json({ error: 'Rewards are for members. Upgrade to unlock avatars and titles.' }, { status: 403 }))
      const body = await request.json().catch(() => ({}))
      const level = levelFromXp(user.xp)
      const unlocked = unlockedFor(level)
      const set = {}
      if (body.avatarId) {
        if (!unlocked.avatars.includes(body.avatarId)) return handleCORS(NextResponse.json({ error: 'Avatar still locked — keep leveling up.' }, { status: 403 }))
        set.equippedAvatar = body.avatarId
      }
      if (body.titleId) {
        if (!unlocked.titles.includes(body.titleId)) return handleCORS(NextResponse.json({ error: 'Title still locked — keep leveling up.' }, { status: 403 }))
        set.equippedTitle = body.titleId
      }
      if (!Object.keys(set).length) return handleCORS(NextResponse.json({ error: 'Nothing to equip' }, { status: 400 }))
      await db.collection('users').updateOne({ id: user.id }, { $set: set })
      return handleCORS(NextResponse.json({ ok: true, ...set }))
    }

    // Leaderboard — top members by XP (compete site-wide).
    if (route === '/gamification/leaderboard' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      const top = await db.collection('users')
        .find({ xp: { $gt: 0 } }, { projection: { _id: 0, username: 1, xp: 1, equippedAvatar: 1, equippedTitle: 1 } })
        .sort({ xp: -1 }).limit(20).toArray()
      const rows = top.map(u => ({ username: u.username, level: levelFromXp(u.xp), xp: u.xp || 0, avatar: u.equippedAvatar || 'seed', title: u.equippedTitle || 'newcomer' }))
      return handleCORS(NextResponse.json({ leaderboard: rows }))
    }

    // List quests created by this coach (admin sees all).
    if (route === '/gamification/quests' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      const isAdmin = user.role === 'admin'
      if (!user.isTrainer && !isAdmin) return handleCORS(NextResponse.json({ error: 'Coaches only' }, { status: 403 }))
      const q = isAdmin ? {} : { trainerId: user.id }
      const list = await db.collection('site_quests').find(q, { projection: { _id: 0, clientIds: 0 } }).sort({ createdAt: -1 }).limit(100).toArray()
      return handleCORS(NextResponse.json({ quests: list }))
    }

    // Activate / deactivate a quest.
    if (route === '/gamification/quests/toggle' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      const isAdmin = user.role === 'admin'
      if (!user.isTrainer && !isAdmin) return handleCORS(NextResponse.json({ error: 'Coaches only' }, { status: 403 }))
      const body = await request.json().catch(() => ({}))
      const filter = isAdmin ? { id: body.id } : { id: body.id, trainerId: user.id }
      const target = await db.collection('site_quests').findOne(filter)
      if (!target) return handleCORS(NextResponse.json({ error: 'Quest not found' }, { status: 404 }))
      await db.collection('site_quests').updateOne(filter, { $set: { active: !target.active } })
      return handleCORS(NextResponse.json({ ok: true, active: !target.active }))
    }

    // Create a quest — admin (site-wide) or trainer (for their assigned clients).
    if (route === '/gamification/quests' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      const isAdmin = user.role === 'admin'
      const isTrainer = !!user.isTrainer || isAdmin
      if (!isTrainer) return handleCORS(NextResponse.json({ error: 'Only coaches can create quests.' }, { status: 403 }))
      const body = await request.json().catch(() => ({}))
      const title = String(body.title || '').trim().slice(0, 120)
      const desc = String(body.desc || '').trim().slice(0, 300)
      const period = ['daily', 'weekly', 'monthly'].includes(body.period) ? body.period : 'weekly'
      const xp = Math.max(10, Math.min(500, parseInt(body.xp, 10) || 100))
      if (!title) return handleCORS(NextResponse.json({ error: 'Title required' }, { status: 400 }))
      const scope = (isAdmin && body.scope === 'site') ? 'site' : 'trainer'
      let clientIds = []
      if (scope === 'trainer') {
        const mine = await db.collection('users').find({ assignedTrainerId: user.id }, { projection: { _id: 0, id: 1 } }).toArray()
        clientIds = mine.map(m => m.id)
      }
      const quest = { id: uuidv4(), scope, trainerId: user.id, clientIds, title, desc, period, xp, active: true, createdBy: user.username, createdAt: new Date() }
      await db.collection('site_quests').insertOne(quest)
      const { _id, ...clean } = quest
      return handleCORS(NextResponse.json({ ok: true, quest: clean }))
    }

    // ---- Trainer programs: coaches author programs only their clients can load ----
    if (route === '/trainer/programs' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      if (!user.isTrainer && user.role !== 'admin') return handleCORS(NextResponse.json({ error: 'Coaches only' }, { status: 403 }))
      const b = await request.json().catch(() => ({}))
      const name = String(b.name || '').trim().slice(0, 120)
      if (!name) return handleCORS(NextResponse.json({ error: 'Program name required' }, { status: 400 }))
      const sessions = Array.isArray(b.sessions) ? b.sessions.slice(0, 12).map((s, i) => ({
        id: String(s.id || `s${i}`),
        title: String(s.title || `Day ${i + 1}`).slice(0, 100),
        exercises: (Array.isArray(s.exercises) ? s.exercises : []).slice(0, 30).map((e) => ({
          exercise: String(e.exercise || '').slice(0, 100),
          sets: String(e.sets || '').slice(0, 12),
          reps: String(e.reps || '').slice(0, 20),
          rpe: String(e.rpe || '').slice(0, 12),
          notes: String(e.notes || '').slice(0, 200),
        })).filter((e) => e.exercise),
      })).filter((s) => s.exercises.length) : []
      if (!sessions.length) return handleCORS(NextResponse.json({ error: 'Add at least one session with exercises' }, { status: 400 }))
      // Default audience = all of this coach's assigned clients (+ specific ids if provided).
      let clientIds = Array.isArray(b.clientIds) ? b.clientIds.map(String) : []
      if (!clientIds.length) {
        const mine = await db.collection('users').find({ assignedTrainerId: user.id }, { projection: { _id: 0, id: 1 } }).toArray()
        clientIds = mine.map((m) => m.id)
      }
      const prog = { id: uuidv4(), trainerId: user.id, coach: user.username, name, blurb: String(b.blurb || '').slice(0, 300), length: String(b.length || 'Custom block').slice(0, 60), howTo: String(b.howTo || '').slice(0, 400), sessions, clientIds, active: true, createdAt: new Date() }
      await db.collection('trainer_programs').insertOne(prog)
      const { _id, ...clean } = prog
      return handleCORS(NextResponse.json({ ok: true, program: clean }))
    }
    if (route === '/trainer/programs' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      if (!user.isTrainer && user.role !== 'admin') return handleCORS(NextResponse.json({ error: 'Coaches only' }, { status: 403 }))
      const q = user.role === 'admin' ? {} : { trainerId: user.id }
      const list = await db.collection('trainer_programs').find(q, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(50).toArray()
      return handleCORS(NextResponse.json({ programs: list }))
    }
    if (route === '/trainer/programs' && method === 'DELETE') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      if (!user.isTrainer && user.role !== 'admin') return handleCORS(NextResponse.json({ error: 'Coaches only' }, { status: 403 }))
      const id = request.nextUrl.searchParams.get('id')
      const filter = user.role === 'admin' ? { id } : { id, trainerId: user.id }
      await db.collection('trainer_programs').deleteOne(filter)
      return handleCORS(NextResponse.json({ ok: true }))
    }
    // Member: programs assigned to me by my coach.
    if (route === '/member/programs' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      const list = await db.collection('trainer_programs').find({
        active: true,
        $or: [{ clientIds: user.id }, ...(user.assignedTrainerId ? [{ trainerId: user.assignedTrainerId }] : [])],
      }, { projection: { _id: 0, clientIds: 0, trainerId: 0 } }).sort({ createdAt: -1 }).limit(30).toArray()
      return handleCORS(NextResponse.json({ programs: list }))
    }
    // Award the one-off Program Finisher badge (once per program id).
    if (route === '/gamification/program-complete' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      const b = await request.json().catch(() => ({}))
      const pid = String(b.programId || '').slice(0, 80)
      if (!pid) return handleCORS(NextResponse.json({ error: 'programId required' }, { status: 400 }))
      const done = user.completedPrograms || []
      if (done.includes(pid)) return handleCORS(NextResponse.json({ ok: true, already: true, xp: xpSummary(user.xp) }))
      const earned = user.badges || []
      const bonus = 300
      const addBadge = earned.includes('program_finisher') ? [] : ['program_finisher']
      const newXp = (user.xp || 0) + bonus + badgeXp(addBadge)
      await db.collection('users').updateOne({ id: user.id }, {
        $set: { xp: newXp, completedPrograms: [pid, ...done].slice(0, 100), badges: [...earned, ...addBadge] },
      })
      return handleCORS(NextResponse.json({ ok: true, gained: bonus, newBadges: addBadge, xp: xpSummary(newXp) }))
    }

    // ---- Member: change password (email/password accounts only) ----
    if (route === '/account/password' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      if (!user.passwordHash) return handleCORS(NextResponse.json({ error: 'Your account uses Google sign-in, so there is no password to change.' }, { status: 400 }))
      const body = await request.json().catch(() => ({}))
      const current = String(body.currentPassword || '')
      const next = String(body.newPassword || '')
      if (next.length < 8) return handleCORS(NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 }))
      if (!(await bcrypt.compare(current, user.passwordHash))) {
        return handleCORS(NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 }))
      }
      const passwordHash = await bcrypt.hash(next, 10)
      await db.collection('users').updateOne({ id: user.id }, { $set: { passwordHash } })
      return handleCORS(NextResponse.json({ ok: true }))
    }

    // ---- Member: cancel their own subscription (at period end) ----
    if (route === '/subscription/cancel' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Not signed in' }, { status: 401 }))
      }
      if (!user.stripeSubscriptionId) {
        return handleCORS(NextResponse.json({ error: 'No active subscription found on your account.' }, { status: 400 }))
      }
      try {
        const params = new URLSearchParams()
        params.set('cancel_at_period_end', 'true')
        const r = await fetch(`${STRIPE_BASE}/subscriptions/${user.stripeSubscriptionId}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${STRIPE_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        })
        const data = await r.json()
        if (!r.ok) throw new Error(data?.error?.message || 'Stripe cancel failed')
        await db.collection('users').updateOne(
          { id: user.id },
          { $set: { subscriptionStatus: 'canceling', subscriptionCancelAt: data.cancel_at ? new Date(data.cancel_at * 1000) : null } }
        )
        return handleCORS(NextResponse.json({
          ok: true,
          cancelAtPeriodEnd: true,
          cancelAt: data.cancel_at ? new Date(data.cancel_at * 1000) : null,
        }))
      } catch (e) {
        return handleCORS(NextResponse.json({ error: e.message || 'Could not cancel subscription.' }, { status: 500 }))
      }
    }


    // ---- Member: pause / resume their subscription (Stripe pause_collection) ----
    if (route === '/payments/pause' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      if (!user.stripeSubscriptionId) {
        return handleCORS(NextResponse.json({ error: 'No active subscription found on your account.' }, { status: 400 }))
      }
      try {
        const params = new URLSearchParams()
        params.set('pause_collection[behavior]', 'void') // no invoices while paused
        const r = await fetch(`${STRIPE_BASE}/subscriptions/${user.stripeSubscriptionId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        })
        const data = await r.json()
        if (!r.ok) throw new Error(data?.error?.message || 'Stripe pause failed')
        await db.collection('users').updateOne({ id: user.id }, { $set: { subscriptionStatus: 'paused' } })
        return handleCORS(NextResponse.json({ ok: true, paused: true }))
      } catch (e) {
        return handleCORS(NextResponse.json({ error: e.message || 'Could not pause subscription.' }, { status: 500 }))
      }
    }
    if (route === '/payments/resume' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      if (!user.stripeSubscriptionId) {
        return handleCORS(NextResponse.json({ error: 'No subscription found on your account.' }, { status: 400 }))
      }
      try {
        const params = new URLSearchParams()
        params.set('pause_collection', '') // clearing it resumes billing
        const r = await fetch(`${STRIPE_BASE}/subscriptions/${user.stripeSubscriptionId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        })
        const data = await r.json()
        if (!r.ok) throw new Error(data?.error?.message || 'Stripe resume failed')
        await db.collection('users').updateOne({ id: user.id }, { $set: { subscriptionStatus: 'active' } })
        return handleCORS(NextResponse.json({ ok: true, paused: false }))
      } catch (e) {
        return handleCORS(NextResponse.json({ error: e.message || 'Could not resume subscription.' }, { status: 500 }))
      }
    }

    // ---- Monthly progress report PDF (member downloads own; coach downloads client's) ----
    if (route === '/progress/report' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || !user.portalAccess) return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      try {
        const bytes = await buildProgressReportPdf(db, user)
        const headers = new Headers()
        headers.set('Content-Type', 'application/pdf')
        headers.set('Content-Disposition', `inline; filename="Tensor-Strength-Progress-${(user.username || 'member').replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`)
        headers.set('Cache-Control', 'private, no-store')
        return new NextResponse(Buffer.from(bytes), { status: 200, headers })
      } catch (e) {
        console.error('Progress report error:', e)
        return handleCORS(NextResponse.json({ error: 'Unable to generate the report right now.' }, { status: 502 }))
      }
    }
    if (route === '/trainer/progress-report' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || (!user.isTrainer && user.role !== 'admin')) return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const clientId = request.nextUrl.searchParams.get('clientId')
      if (!clientId) return handleCORS(NextResponse.json({ error: 'clientId is required' }, { status: 400 }))
      const client = await db.collection('users').findOne({ id: clientId })
      if (!client || (user.role !== 'admin' && client.assignedTrainerId !== user.id)) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      try {
        const bytes = await buildProgressReportPdf(db, client)
        const headers = new Headers()
        headers.set('Content-Type', 'application/pdf')
        headers.set('Content-Disposition', `inline; filename="Tensor-Strength-Progress-${(client.username || 'member').replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`)
        headers.set('Cache-Control', 'private, no-store')
        return new NextResponse(Buffer.from(bytes), { status: 200, headers })
      } catch (e) {
        console.error('Progress report error:', e)
        return handleCORS(NextResponse.json({ error: 'Unable to generate the report right now.' }, { status: 502 }))
      }
    }

    // ---- Referrals (track in-app; credit applied manually by the coach) ----
    if (route === '/referrals/me' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      let code = user.referralCode
      if (!code) {
        code = 'TS' + Math.random().toString(36).slice(2, 8).toUpperCase()
        await db.collection('users').updateOne({ id: user.id }, { $set: { referralCode: code } })
      }
      const refs = await db.collection('referrals').find({ referrerId: user.id }).sort({ createdAt: -1 }).limit(500).toArray()
      return handleCORS(NextResponse.json({
        code,
        referredBy: user.referredBy || null,
        referrals: refs.map((r) => ({ refereeName: r.refereeName, status: r.status, createdAt: r.createdAt })),
        creditsEarned: refs.filter((r) => r.status === 'credited').length,
      }))
    }
    if (route === '/referrals/apply' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      if (user.referredBy) return handleCORS(NextResponse.json({ error: 'You have already used a referral code.' }, { status: 400 }))
      const body = await request.json().catch(() => ({}))
      const code = String(body.code || '').trim().toUpperCase()
      if (!code) return handleCORS(NextResponse.json({ error: 'Enter a referral code.' }, { status: 400 }))
      const referrer = await db.collection('users').findOne({ referralCode: code })
      if (!referrer) return handleCORS(NextResponse.json({ error: 'That code isn\'t valid.' }, { status: 400 }))
      if (referrer.id === user.id) return handleCORS(NextResponse.json({ error: 'You can\'t refer yourself.' }, { status: 400 }))
      await db.collection('users').updateOne({ id: user.id }, { $set: { referredBy: referrer.id } })
      await db.collection('referrals').insertOne({
        id: uuidv4(), referrerId: referrer.id, refereeId: user.id, refereeName: user.username, status: 'pending', createdAt: new Date(),
      })
      return handleCORS(NextResponse.json({ ok: true }))
    }
    if (route === '/admin/referrals' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || user.role !== 'admin') return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const refs = await db.collection('referrals').find({}).sort({ createdAt: -1 }).limit(2000).toArray()
      const ids = [...new Set(refs.map((r) => r.referrerId))]
      const referrers = await db.collection('users').find({ id: { $in: ids } }).toArray()
      const nameOf = Object.fromEntries(referrers.map((u) => [u.id, u.username]))
      return handleCORS(NextResponse.json({
        referrals: refs.map(({ _id, ...r }) => ({ ...r, referrerName: nameOf[r.referrerId] || 'Member' })),
      }))
    }
    if (route === '/admin/referrals' && method === 'PUT') {
      const user = await getCurrentUser(request, db)
      if (!user || user.role !== 'admin') return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const body = await request.json().catch(() => ({}))
      if (!body.id) return handleCORS(NextResponse.json({ error: 'id is required' }, { status: 400 }))
      const status = body.status === 'credited' ? 'credited' : 'pending'
      await db.collection('referrals').updateOne({ id: body.id }, { $set: { status, updatedAt: new Date() } })
      return handleCORS(NextResponse.json({ ok: true, status }))
    }

    // ---- Secure daily cron: remind clients whose free week ends within 24h ----
    // Point an external scheduler (cron-job.org / EasyCron) at this once a day with
    // ?secret=<CRON_SECRET> (or x-cron-secret header). Idempotent per user.
    if (route === '/cron/trial-reminders' && (method === 'POST' || method === 'GET')) {
      const secret = request.nextUrl.searchParams.get('secret') || request.headers.get('x-cron-secret')
      if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 401 }))
      }
      const now = Date.now()
      const soon = new Date(now + 24 * 3600 * 1000)
      const due = await db.collection('users').find({
        subscriptionStatus: 'trialing',
        trialReminderSent: { $ne: true },
        trialEndsAt: { $ne: null, $gte: new Date(now), $lte: soon },
      }).limit(500).toArray()
      let reminded = 0
      for (const u of due) {
        const when = u.trialEndsAt ? new Date(u.trialEndsAt).toLocaleDateString() : 'soon'
        await pushNotification(db, {
          recipientId: u.id, actorName: 'Tensor Strength', type: 'announcement', emoji: '🎁',
          snippet: `Your free week ends ${when}. Keep training — or cancel anytime before then and pay nothing.`,
        })
        if (u.email) {
          await sendEmail({
            to: u.email,
            subject: 'Your Tensor Strength free week is ending',
            text: `Hi ${u.username || 'there'} — your free week ends on ${when}. If coaching's a fit, do nothing and your plan continues. To cancel, open your account before then and you won't be charged.`,
          })
        }
        await db.collection('users').updateOne({ id: u.id }, { $set: { trialReminderSent: true } })
        reminded++
      }
      return handleCORS(NextResponse.json({
        ok: true, reminded, checked: due.length,
        emailConfigured: !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
      }))
    }


    // ---------------- HUTCH TOUCH — ATHLETE EDITION (admin/owner only) ----------------
    // The Performance Edition PDF is a public static file (/programs/...). The
    // Athlete Edition is Hutch's personal program and is served only to the
    // admin account from a non-public directory so it can't be linked publicly.
    if (route === '/hutch-touch/athlete-pdf' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user || user.role !== 'admin') {
        return handleCORS(NextResponse.json(
          { error: 'The Athlete Edition is private to Hutch.' },
          { status: 403 }
        ))
      }
      try {
        const filePath = nodePath.join(process.cwd(), 'private-assets', 'hutch-touch-athlete-edition.pdf')
        const bytes = await readFile(filePath)
        const headers = new Headers()
        headers.set('Content-Type', 'application/pdf')
        headers.set('Content-Disposition', 'inline; filename="Tensor-Strength-Hutch-Touch-Athlete-Edition.pdf"')
        headers.set('Cache-Control', 'private, no-store')
        return new NextResponse(Buffer.from(bytes), { status: 200, headers })
      } catch (e) {
        console.error('Athlete Edition file error:', e)
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
              currency: item?.price?.currency ?? 'cad',
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
      const returnUrl = `${getAppBaseUrl(request)}/clients`
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
            await ensureCoachAssigned(db, u.id)
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
          if (u && obj.status === 'trialing' && obj.trial_end) {
            await db.collection('users').updateOne({ id: u.id }, { $set: { trialEndsAt: new Date(obj.trial_end * 1000) } })
          } else if (u && obj.status === 'active') {
            await db.collection('users').updateOne({ id: u.id }, { $set: { trialEndsAt: null } })
          }
          // past_due: keep access (grace period) — do nothing.
          break
        }
        case 'customer.subscription.created': {
          const u = await findUser(obj)
          if (['active', 'trialing'].includes(obj.status)) await setAccess(u, true, obj.status)
          if (u && obj.status === 'trialing' && obj.trial_end) {
            await db.collection('users').updateOne({ id: u.id }, { $set: { trialEndsAt: new Date(obj.trial_end * 1000), trialReminderSent: false } })
          }
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
        // SVG can carry scripts — never accept it even though it is an image/* type.
        if (mime === 'image/svg+xml') {
          return handleCORS(NextResponse.json({ error: 'SVG images are not allowed.' }, { status: 400 }))
        }
        const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic', 'image/heif': 'heif', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' }
        const ext = extMap[mime]
        if (!ext) {
          return handleCORS(NextResponse.json({ error: 'Unsupported file type. Use JPG, PNG, WebP, GIF, HEIC or MP4/MOV/WebM.' }, { status: 400 }))
        }
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
      await notifyMentions(db, { text: post.title + ' ' + post.body, actor: user, postId: post.id, postTitle: post.title })
      // Coach Broadcast: a trainer/admin can notify all of their assigned clients
      // about this post in one tap.
      if (body.notifyClients && (user.isTrainer || user.role === 'admin')) {
        const clients = await db.collection('users')
          .find({ assignedTrainerId: user.id }, { projection: { id: 1 } })
          .limit(1000).toArray()
        for (const c of clients) {
          await pushNotification(db, {
            recipientId: c.id,
            actorId: user.id,
            actorName: user.username,
            type: 'announcement',
            postId: post.id,
            postTitle: post.title,
            snippet: post.body || post.title,
          })
        }
      }
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
      body.postId = typeof body.postId === 'string' ? body.postId : ''
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
      // Notify the original poster that someone replied, plus any @mentions.
      await pushNotification(db, {
        recipientId: post.userId,
        actorId: user.id,
        actorName: user.username,
        type: 'reply',
        postId: post.id,
        postTitle: post.title,
        replyId: reply.id,
        snippet: reply.body,
      })
      await notifyMentions(db, { text: reply.body, actor: user, postId: post.id, postTitle: post.title, replyId: reply.id })
      const { _id, ...clean } = reply
      return handleCORS(NextResponse.json({ reply: clean }))
    }

    if (route === '/forum/best-answer' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const body = await request.json()
      const postId = typeof body.postId === 'string' ? body.postId : ''
      const replyId = body.replyId === null ? null : (typeof body.replyId === 'string' ? body.replyId : '')
      const post = await db.collection('forum_posts').findOne({ id: postId })
      if (!post) return handleCORS(NextResponse.json({ error: 'Post not found' }, { status: 404 }))
      // Only the original poster, a trainer, or an admin may mark the best answer.
      if (post.userId !== user.id && !user.isTrainer && user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }
      await db.collection('forum_posts').updateOne({ id: postId }, { $set: { bestAnswerId: replyId || null } })
      // Notify the reply's author that their answer was marked as best.
      if (replyId) {
        const reply = await db.collection('forum_replies').findOne({ id: replyId })
        if (reply) {
          await pushNotification(db, {
            recipientId: reply.userId,
            actorId: user.id,
            actorName: user.username,
            type: 'best-answer',
            postId,
            postTitle: post.title,
            replyId,
            snippet: reply.body,
          })
        }
      }
      return handleCORS(NextResponse.json({ ok: true, bestAnswerId: replyId || null }))
    }

    if (route === '/forum/members' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const users = await db.collection('users').find({}, { projection: { username: 1, isTrainer: 1, role: 1 } }).limit(500).toArray()
      const members = users
        .filter((u) => u.username)
        .map((u) => ({ username: u.username, isCoach: !!u.isTrainer || u.role === 'admin' }))
      return handleCORS(NextResponse.json({ members }))
    }

    if (route === '/forum/notifications' && method === 'GET') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const items = await db.collection('forum_notifications')
        .find({ userId: user.id }).sort({ createdAt: -1 }).limit(50).toArray()
      const unread = items.filter((n) => !n.read).length
      return handleCORS(NextResponse.json({ notifications: items.map(({ _id, ...n }) => n), unread }))
    }

    if (route === '/forum/notifications/read' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const body = await request.json().catch(() => ({}))
      const filter = { userId: user.id }
      if (typeof body.id === 'string' && body.id) filter.id = body.id
      await db.collection('forum_notifications').updateMany(filter, { $set: { read: true } })
      return handleCORS(NextResponse.json({ ok: true }))
    }

    if (route === '/forum/react' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const body = await request.json()
      const targetType = body.targetType === 'reply' ? 'reply' : 'post'
      const targetId = typeof body.targetId === 'string' ? body.targetId : ''
      const emoji = typeof body.emoji === 'string' ? body.emoji : ''
      const collection = targetType === 'reply' ? 'forum_replies' : 'forum_posts'
      const reactions = await toggleReaction(db, collection, targetId, emoji, user.id)
      if (reactions === null) return handleCORS(NextResponse.json({ error: 'Invalid target or emoji' }, { status: 400 }))
      // Notify the target's author when a reaction is ADDED (not when removed).
      const added = Array.isArray(reactions[emoji]) && reactions[emoji].includes(user.id)
      if (added) {
        const target = await db.collection(collection).findOne({ id: targetId })
        if (target) {
          const postId = targetType === 'reply' ? target.postId : target.id
          const post = targetType === 'reply' ? await db.collection('forum_posts').findOne({ id: postId }) : target
          await pushNotification(db, {
            recipientId: target.userId,
            actorId: user.id,
            actorName: user.username,
            type: 'reaction',
            emoji,
            targetType,
            postId,
            postTitle: post?.title || '',
            replyId: targetType === 'reply' ? targetId : null,
            snippet: target.body || target.title || '',
          })
        }
      }
      return handleCORS(NextResponse.json({ reactions }))
    }

    if (route === '/forum/like' && method === 'POST') {
      const user = await getCurrentUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))
      const body = await request.json()
      body.postId = typeof body.postId === 'string' ? body.postId : ''
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
      body.id = typeof body.id === 'string' ? body.id : ''
      const post = await db.collection('forum_posts').findOne({ id: body.id })
      if (!post) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      if (post.userId !== user.id && user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'You can only delete your own posts.' }, { status: 403 }))
      }
      // Clean up any uploaded media on the post and its replies from R2.
      const replies = await db.collection('forum_replies').find({ postId: body.id }).toArray()
      await db.collection('forum_posts').deleteOne({ id: body.id })
      await db.collection('forum_replies').deleteMany({ postId: body.id })
      if (post.mediaUrl) await deleteUpload(db, post.mediaUrl)
      for (const r of replies) {
        if (r.mediaUrl) await deleteUpload(db, r.mediaUrl)
      }
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
