import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Projects } from './collections/Projects'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Accept either spelling. The Payload template reads DATABASE_URL, but
// DATABASE_URI is what most Payload docs and compose examples use — having only
// one work means a silent empty connection string and a container that
// crash-loops on boot with a confusing error.
const databaseURL = process.env.DATABASE_URL || process.env.DATABASE_URI

if (!databaseURL) {
  throw new Error('Set DATABASE_URL (or DATABASE_URI) to your Postgres connection string')
}

if (!process.env.PAYLOAD_SECRET) {
  throw new Error('Set PAYLOAD_SECRET — generate one with: openssl rand -base64 32')
}

/*
 * Origins allowed to talk to the API from a browser.
 *
 * ADMIN_ORIGIN matters more than it looks: the admin panel is reached over
 * Tailscale (http://the-adinator:3005), which is a *different origin* from
 * serverURL (https://cms.avsworks.be). Payload checks the Origin header against
 * the csrf list when setting the auth cookie, so leaving the Tailscale origin
 * out makes admin logins fail with no useful error.
 */
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_ORIGIN,
  process.env.PAYLOAD_PUBLIC_SERVER_URL,
  'http://localhost:3000',
].filter((origin): origin is string => Boolean(origin))

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL,
  cors: allowedOrigins,
  csrf: allowedOrigins,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Projects, Posts],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: databaseURL,
    },
  }),
  sharp,
  plugins: [],
})
