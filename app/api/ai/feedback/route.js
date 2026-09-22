import {
  errorResponse,
  getCurrentUser,
  getDb,
} from '../_lib/server'

export async function POST(request) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const messageId = String(body.messageId || '').slice(0, 80)
    const rating =
      body.rating === 'up' || body.rating === 'down'
        ? body.rating
        : null
    const note = String(body.note || '').slice(0, 500)

    if (!messageId || !rating) {
      return Response.json(
        { error: 'messageId and rating (up|down) are required.' },
        { status: 400 },
      )
    }

    const db = await getDb()

    const message = await db.collection('aiMessages').findOne({
      id: messageId,
      userId: user.id,
      role: 'assistant',
    })

    if (!message) {
      return Response.json({ error: 'AI message not found.' }, { status: 404 })
    }

    await db.collection('aiFeedback').updateOne(
      { messageId, userId: user.id },
      {
        $set: {
          messageId,
          conversationId: message.conversationId,
          userId: user.id,
          rating,
          note,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    )

    return Response.json({ ok: true })
  } catch (error) {
    return errorResponse(error)
  }
}
