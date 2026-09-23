import {
  errorResponse,
  getCurrentUser,
  getDb,
} from '../_lib/server'

export async function GET(request) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 })
    }

    const db = await getDb()
    const id = request.nextUrl.searchParams.get('id')

    if (id) {
      const conversation = await db.collection('aiConversations').findOne(
        { id, userId: user.id },
        { projection: { _id: 0 } },
      )

      if (!conversation) {
        return Response.json({ error: 'Conversation not found.' }, { status: 404 })
      }

      const messages = await db.collection('aiMessages')
        .find(
          { conversationId: id, userId: user.id },
          { projection: { _id: 0 } },
        )
        .sort({ createdAt: 1 })
        .limit(200)
        .toArray()

      return Response.json({ conversation, messages })
    }

    const conversations = await db.collection('aiConversations')
      .find(
        { userId: user.id },
        { projection: { _id: 0 } },
      )
      .sort({ updatedAt: -1 })
      .limit(50)
      .toArray()

    return Response.json({ conversations })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(request) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 })
    }

    const id = String(request.nextUrl.searchParams.get('id') || '').slice(0, 80)
    if (!id) {
      return Response.json({ error: 'Conversation id is required.' }, { status: 400 })
    }

    const db = await getDb()
    const conversation = await db.collection('aiConversations').findOne({
      id,
      userId: user.id,
    })

    if (!conversation) {
      return Response.json({ error: 'Conversation not found.' }, { status: 404 })
    }

    await Promise.all([
      db.collection('aiConversations').deleteOne({ id, userId: user.id }),
      db.collection('aiMessages').deleteMany({ conversationId: id, userId: user.id }),
      db.collection('aiFeedback').deleteMany({ conversationId: id, userId: user.id }),
    ])

    return Response.json({ ok: true })
  } catch (error) {
    return errorResponse(error)
  }
}
