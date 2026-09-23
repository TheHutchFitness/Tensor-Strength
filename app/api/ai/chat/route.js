import {
  buildTensorMemberContext,
  enforceTensorAiLimits,
  errorResponse,
  finishTensorAiUsage,
  getCurrentUser,
  getDb,
  isTensorAiEntitled,
  makeConversationId,
  makeMessageId,
  runTensorAi,
} from '../_lib/server'

export async function POST(request) {
  let usageId = null
  let db = null

  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 })
    }

    if (!isTensorAiEntitled(user)) {
      return Response.json(
        {
          error: 'Tensor AI is available on the Tensor AI Beta plan.',
          upgrade: true,
          upgradePlan: 'tensor_ai_beta_12_99',
        },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const message = String(body.message || '').trim().slice(0, 4000)
    const requestedConversationId = String(body.conversationId || '').trim().slice(0, 80)
    const mode = body.mode === 'deep' ? 'deep' : 'standard'

    if (!message) {
      return Response.json({ error: 'A message is required.' }, { status: 400 })
    }

    db = await getDb()

    let conversation = requestedConversationId
      ? await db.collection('aiConversations').findOne({
          id: requestedConversationId,
          userId: user.id,
        })
      : null

    let conversationId = conversation?.id || ''

    if (!conversation) {
      conversationId = makeConversationId()
      conversation = {
        id: conversationId,
        userId: user.id,
        title: message.slice(0, 72),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await db.collection('aiConversations').insertOne(conversation)
    }

    const recentDescending = await db.collection('aiMessages')
      .find(
        { conversationId, userId: user.id },
        { projection: { _id: 0, role: 1, content: 1, createdAt: 1 } },
      )
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray()

    const prior = recentDescending.reverse()
    const context = await buildTensorMemberContext(db, user)

    usageId = await enforceTensorAiLimits(db, user.id)

    const result = await runTensorAi({
      systemContext: context,
      messages: [...prior, { role: 'user', content: message }],
      mode,
    })

    const now = new Date()
    const userMessage = {
      id: makeMessageId(),
      conversationId,
      userId: user.id,
      role: 'user',
      content: message,
      createdAt: now,
    }
    const assistantMessage = {
      id: makeMessageId(),
      conversationId,
      userId: user.id,
      role: 'assistant',
      content: result.text,
      provider: result.provider,
      model: result.model,
      createdAt: new Date(),
    }

    await db.collection('aiMessages').insertMany([
      userMessage,
      assistantMessage,
    ])

    await db.collection('aiConversations').updateOne(
      { id: conversationId, userId: user.id },
      { $set: { updatedAt: new Date() } },
    )

    await finishTensorAiUsage(db, usageId, result)

    return Response.json({
      conversationId,
      reply: result.text,
      messageId: assistantMessage.id,
      mode,
    })
  } catch (error) {
    if (db && usageId) {
      await finishTensorAiUsage(db, usageId, null, 'failed')
    }
    console.error('Tensor AI chat error:', error?.message || error)
    return errorResponse(error)
  }
}
