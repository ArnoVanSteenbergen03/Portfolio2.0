import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  Payload,
} from 'payload'

/**
 * Pushes content changes to the separately-deployed Next.js frontend.
 *
 * The Payload docs' revalidation pattern uses `revalidatePath` from next/cache,
 * which only works when the frontend lives in the same Next.js app. Ours is a
 * standalone app (../web) deployed apart from the CMS, so we POST to its
 * /api/revalidate route handler instead, which calls revalidateTag there.
 */

const FRONTEND_URL = process.env.FRONTEND_URL
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET

async function pingFrontend(collection: string, payload: Payload): Promise<void> {
  if (!FRONTEND_URL || !REVALIDATE_SECRET) {
    payload.logger.warn(
      `[revalidate] FRONTEND_URL or REVALIDATE_SECRET unset — skipping ${collection}`,
    )
    return
  }

  try {
    const res = await fetch(`${FRONTEND_URL}/api/revalidate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-revalidate-secret': REVALIDATE_SECRET,
      },
      body: JSON.stringify({ collection }),
      // Don't let a slow or hanging frontend stall the editor's save.
      signal: AbortSignal.timeout(5000),
    })

    if (res.ok) {
      payload.logger.info(`[revalidate] frontend refreshed ${collection}`)
    } else {
      payload.logger.error(
        `[revalidate] frontend returned ${res.status} for ${collection}`,
      )
    }
  } catch (error) {
    // Deliberately swallowed. If the frontend is down or redeploying, the
    // content edit has already been saved and must still succeed — the page
    // will pick the change up when its cache goes stale instead.
    payload.logger.error(`[revalidate] failed to reach frontend: ${error}`)
  }
}

export function revalidateOnChange(collection: string): CollectionAfterChangeHook {
  return async ({ doc, req: { payload, context } }) => {
    // Lets bulk imports/seeds opt out via context: { disableRevalidate: true }
    if (!context.disableRevalidate) {
      await pingFrontend(collection, payload)
    }
    return doc
  }
}

export function revalidateOnDelete(collection: string): CollectionAfterDeleteHook {
  return async ({ doc, req: { payload, context } }) => {
    if (!context.disableRevalidate) {
      await pingFrontend(collection, payload)
    }
    return doc
  }
}
