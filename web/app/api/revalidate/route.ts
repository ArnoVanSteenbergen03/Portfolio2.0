import { revalidateTag } from 'next/cache'
import { timingSafeEqual } from 'node:crypto'

/**
 * On-demand revalidation endpoint for the CMS.
 *
 * A Payload `afterChange` hook on the projects/posts collections POSTs here on
 * save so edits go live immediately, rather than waiting out the cache window
 * set by cacheLife('hours') in lib/cms.ts.
 *
 *   curl -X POST https://avsworks.be/api/revalidate \
 *     -H "content-type: application/json" \
 *     -H "x-revalidate-secret: $REVALIDATE_SECRET" \
 *     -d '{"collection":"projects"}'
 */

const REVALIDATABLE = new Set(['projects', 'posts'])

function secretMatches(provided: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET

  if (!expected || !provided) return false

  const a = Buffer.from(provided)
  const b = Buffer.from(expected)

  // timingSafeEqual throws on length mismatch, so guard first. The length of
  // the secret is not itself sensitive.
  if (a.length !== b.length) return false

  return timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get('x-revalidate-secret'))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  let collection: unknown

  try {
    ;({ collection } = await request.json())
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  if (typeof collection !== 'string' || !REVALIDATABLE.has(collection)) {
    return Response.json(
      { error: `collection must be one of: ${[...REVALIDATABLE].join(', ')}` },
      { status: 400 },
    )
  }

  // 'max' gives stale-while-revalidate: visitors keep getting the cached page
  // instantly while the fresh copy is fetched in the background.
  revalidateTag(collection, 'max')

  return Response.json({ revalidated: collection })
}
