import {
  getCurrentUser,
  isTensorAiEntitled,
  tensorAiTier,
} from '../_lib/server'

export async function GET(request) {
  const user = await getCurrentUser(request)

  if (!user) {
    return Response.json({
      signedIn: false,
      entitled: false,
      tier: 'none',
    })
  }

  return Response.json({
    signedIn: true,
    entitled: isTensorAiEntitled(user),
    tier: tensorAiTier(user),
    accessType: user.accessType || null,
  })
}
