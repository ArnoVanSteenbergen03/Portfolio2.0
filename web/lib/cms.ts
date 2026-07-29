import { cacheLife, cacheTag } from 'next/cache'

/**
 * Types mirroring the Payload collections in payload-cms/src/collections/.
 * Kept hand-written rather than imported from payload-types.ts because the web
 * app deploys separately from the CMS and shouldn't reach across into it.
 */
export type Project = {
  id: string
  name: string
  tagline: string
  stack?: { label?: string | null; id?: string | null }[] | null
  status?: 'live' | 'idle' | null
  year?: string | null
  createdAt: string
  updatedAt: string
}

export type Post = {
  id: string
  title: string
  tag?: string | null
  date?: string | null
  createdAt: string
  updatedAt: string
}

type PaginatedDocs<T> = {
  docs: T[]
  totalDocs: number
}

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL

/**
 * Fetches a collection from the Payload REST API, degrading to an empty list
 * when the CMS is unreachable — the portfolio still renders its hero and
 * contact details when the Pi is offline, rather than serving an error.
 *
 * The error is caught *inside* the `use cache` scope on purpose. An error that
 * escapes a cached scope fails the prerender and takes the whole build down
 * with it, even if a caller catches it, so a CMS that happens to be down at
 * build time would otherwise mean no deploy at all.
 *
 * The tradeoff is that a failed read gets cached. cacheLife('hours') keeps that
 * short: the entry goes stale after 5 minutes and is refreshed in the
 * background on the next visit, and Payload's afterChange hook can force it
 * immediately via /api/revalidate.
 */
async function fetchCollection<T>(slug: string, search: string): Promise<T[]> {
  'use cache'
  cacheLife('hours')
  cacheTag(slug)

  if (!CMS_URL) {
    console.error('[cms] NEXT_PUBLIC_CMS_URL is not set')
    return []
  }

  try {
    const res = await fetch(`${CMS_URL}/api/${slug}?${search}`)

    if (!res.ok) {
      console.error(`[cms] ${slug}: CMS responded ${res.status}`)
      return []
    }

    const { docs }: PaginatedDocs<T> = await res.json()
    return docs ?? []
  } catch (error) {
    console.error(`[cms] ${slug}: read failed, rendering without it —`, error)
    return []
  }
}

export async function getProjects(): Promise<Project[]> {
  return fetchCollection<Project>('projects', 'limit=24&sort=-year')
}

export async function getPosts(): Promise<Post[]> {
  return fetchCollection<Post>('posts', 'limit=6&sort=-date')
}

/** Flattens Payload's array-of-objects stack field into plain labels. */
export function stackLabels(project: Project): string[] {
  return (project.stack ?? [])
    .map((item) => item?.label)
    .filter((label): label is string => Boolean(label))
}
