import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getCurrentUser, getDb } from '../../ai/_lib/server'

const OWN_STRIPE_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_KEY = OWN_STRIPE_KEY || process.env.STRIPE_API_KEY
const STRIPE_BASE = OWN_STRIPE_KEY
  ? 'https://api.stripe.com/v1'
  : (process.env.INTEGRATION_PROXY_URL || 'https://integrations.emergentagent.com') + '/stripe/v1'

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
    legacyOnly: true,
  },
  tensor_ai_beta_12_99: {
    label: 'Tensor AI Beta',
    mode: 'subscription',
    amount: 1299,
    currency: 'cad',
    interval: 'month',
    accessType: 'tensor_ai_beta',
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

function json(data, status = 200) {
  return NextResponse.json(data, { status })
}

function getAppBaseUrl() {
  return String(process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '')
}

async function createStripeSession(pkg, { successUrl, cancelUrl, metadata, email, trialDays }) {
  const params = new URLSearchParams()
  params.set('mode', pkg.mode)
  params.set('success_url', successUrl)
  params.set('cancel_url', cancelUrl)
  params.set('allow_promotion_codes', 'true')
  if (email) {
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
    if (trialDays && Number(trialDays) > 0) {
      params.set('subscription_data[trial_period_days]', String(Math.min(365, Math.round(Number(trialDays)))))
    }
  }
  for (const [k, v] of Object.entries(metadata || {})) {
    params.set(`metadata[${k}]`, String(v))
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

export async function POST(request) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return json({ error: 'Authentication required' }, 401)
    }

    const body = await request.json().catch(() => ({}))
    const pkg = PACKAGES[body.packageId]
    if (!pkg || pkg.legacyOnly) {
      return json({ error: 'Invalid package' }, 400)
    }

    const base = getAppBaseUrl()
    if (!base) {
      return json({ error: 'NEXT_PUBLIC_BASE_URL is not configured' }, 503)
    }
    if (!STRIPE_KEY) {
      return json({ error: 'Payments are not configured' }, 503)
    }

    const db = await getDb()
    const txId = uuidv4()
    const successUrl = `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${base}/checkout?plan=${encodeURIComponent(body.packageId)}`

    let trialDays = 0
    if (body.packageId === 'remote_coaching_400') {
      const cfg = await db.collection('site_content').findOne({ key: 'trial_settings' })
      if (cfg?.enabled && Number(cfg.days) > 0) {
        const priorPaid = await db.collection('payment_transactions').findOne({
          userId: user.id,
          accessGranted: true,
        })
        const isNewClient = !user.portalAccess && !user.stripeSubscriptionId && !priorPaid
        if (isNewClient) trialDays = Math.min(365, Math.round(Number(cfg.days)))
      }
    }

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

    return json({ url: session.url, sessionId: session.id, trialDays })
  } catch (error) {
    console.error('Checkout error:', error?.message || error)
    return json({ error: 'Unable to start checkout' }, 500)
  }
}
