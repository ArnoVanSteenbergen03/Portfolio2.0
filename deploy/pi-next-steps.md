# Pi ← → CMS ← → frontend: what to do next

Continues `backoffice-setup-plan.md`. Steps 2–3 (scaffold, collections) are done.
This covers getting Payload actually serving, reachable, and wired to the site.

Run everything here **on the Pi** unless marked otherwise.

---

## 1. Settle why Payload isn't answering

From my machine over Tailscale, ports 80, 3001 (Uptime Kuma), 19999 (Netdata)
and 9443 (Portainer) answer; nothing answers on a Payload port. You suspect the
firewall. Maybe — but note Uptime Kuma is *also* a container and it answers
fine, and Docker's published ports insert iptables rules ahead of ufw, so ufw
usually does not hide a published container port.

This one command tells us which it is, because it never touches the firewall:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3005/api/projects
```

- **Returns 200** → app is fine, it's purely a firewall/port-publishing issue → go to step 4.
- **Connection refused** → the app is not running. Firewall is a red herring. Continue below.

Then gather the facts:

```bash
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker logs payload-cms --tail 100
sudo ss -tlnp | grep -E '3000|3001|3005'
sudo ufw status numbered
```

`docker ps -a` is the important one — a `Restarting (1) 8 seconds ago` status
confirms a crash loop.

**My prediction:** the logs show a Postgres connection error, because the compose
file sets `DATABASE_URI` while the app read `DATABASE_URL`. That yields an empty
connection string, Payload dies on boot, and nothing ever listens. I've since
made `payload.config.ts` accept either name and throw a readable error instead
of failing silently, so after step 2 this can't recur.

---

## 2. Fix the compose file

Use `deploy/docker-compose.payload.yml` from the repo. Changes from your current
version, and why each matters:

| Change | Reason |
| --- | --- |
| `DATABASE_URI` → `DATABASE_URL` | The name the app actually reads. Root-cause candidate for step 1. |
| Host port `3001` → `3005` | **3001 is already Uptime Kuma.** Publishing there fails with "port is already allocated". |
| Postgres `healthcheck` + `condition: service_healthy` | Plain `depends_on` waits for the container to start, not for Postgres to accept connections. Payload otherwise races it on cold boot. |
| `mem_limit` 384m → 640m | A Next.js server idles ~200–300MB and spikes on first request. 384m invites the OOM killer, which shows up as random 502s through the tunnel. |
| Added `FRONTEND_URL`, `REVALIDATE_SECRET`, `ADMIN_ORIGIN` | Needed for instant content updates and for admin login to work (see step 5). |

Create a `.env` next to your compose file — the new file reads secrets from it
rather than hardcoding them:

```bash
cat >> .env <<'EOF'
PAYLOAD_DB_PASSWORD=<new strong password>
PAYLOAD_SECRET=<openssl rand -base64 32>
REVALIDATE_SECRET=<openssl rand -base64 32>
FRONTEND_URL=https://avsworks.be
ADMIN_ORIGIN=http://the-adinator:3005
EOF
chmod 600 .env
```

> **Rotate the database password.** The one currently in the file was visible in
> the screenshot you shared, so treat it as public. It's also short enough to
> brute-force. Changing it now is one line; changing it later means a dump and
> restore.

If you change the password on an existing `./payload-db-data` volume, note that
Postgres only applies `POSTGRES_PASSWORD` on *first* initialisation. Either set
it before the first `up`, or change it in-place afterwards:

```bash
docker exec -it payload-db psql -U payload -c "ALTER USER payload WITH PASSWORD '<new>';"
```

---

## 3. Get the source onto the Pi, then build

`~/docker/compose/` contains only `docker-compose.yml` — the Payload source
isn't on the Pi at all, so there is nothing for `build:` to build. Clone it:

```bash
git clone https://github.com/ArnoVanSteenbergen03/Portfolio2.0.git ~/Portfolio2.0
```

This requires the repo to actually be pushed first — right now `payload-cms/`
is untracked locally and `origin` only has the initial commit. Commit and push
from your PC before cloning. `.env` files are gitignored, so no secrets travel;
you create those on the Pi in step 2.

Building Next.js on a Pi is the heaviest moment in this whole setup.

**The heap ceiling is already fixed in the repo** — `package.json` now sets
`--max-old-space-size=4096` instead of 8000, so Node can't balloon past physical
RAM and get OOM-killed mid-build.

(Correction to what I said earlier: a `--build-arg NODE_OPTIONS=...` would *not*
have worked. The build script uses `cross-env NODE_OPTIONS="..."`, which sets
the variable explicitly and overrides anything from the environment. It had to
change in `package.json`.)

Check swap before building — 2GB helps a lot:

```bash
free -h
```

If the Pi has 4GB or less, don't build on it. Use the buildx route in the
compose file's comments instead.

**Alternative — build on your PC and push.** Faster, but the Pi is arm64 and
your PC is amd64, so a plain `docker build` produces an image that will not run:

```bash
docker buildx build --platform linux/arm64 \
  -t <registry>/avsworks-cms:latest --push ./payload-cms
```

Then bring it up:

```bash
docker compose up -d payload-db payload-cms
docker compose logs -f payload-cms
```

Wait for the "Payload Admin URL" line, then create the first admin user at
`http://the-adinator:3005/admin`.

---

## 4. Firewall and access

Decide deliberately who can reach what:

- `/admin` — **Tailscale only**, never public.
- `/api/*` — public, through the Cloudflare tunnel.

Because Docker bypasses ufw, the reliable way to scope this is to control what
the container publishes rather than to write ufw rules. Bind the published port
to loopback:

```yaml
ports:
  - '127.0.0.1:3005:3000'
```

`cloudflared` runs on the host, so it still reaches `localhost:3005` fine. Then
expose the admin panel to your tailnet only:

```bash
sudo tailscale serve --bg 3005
```

That gives you an HTTPS URL on your tailnet with no firewall holes and nothing
on the LAN. Update `ADMIN_ORIGIN` in `.env` to whatever hostname it prints.

If you'd rather keep it simple, leave `3005:3000` published and allow the
tailnet interface instead — less tidy, since the port is then also on your LAN:

```bash
sudo ufw allow in on tailscale0 to any port 3005
```

---

## 5. The tunnel

Your original step 5, with the port corrected to **3005**. In
`~/.cloudflared/config.yml`:

```yaml
ingress:
  - hostname: cms.avsworks.be
    path: /api/*
    service: http://localhost:3005
  - hostname: cms.avsworks.be
    path: /graphql
    service: http://localhost:3005
  - hostname: cms.avsworks.be
    service: http_status:404
```

Then verify the security property that matters most — do this before anything
else goes live:

```bash
# From a machine NOT on your tailnet, or via your phone on mobile data:
curl -s -o /dev/null -w "%{http_code}\n" https://cms.avsworks.be/admin      # want 404
curl -s -o /dev/null -w "%{http_code}\n" https://cms.avsworks.be/api/projects  # want 200
```

Media uploads are served under `/api/media/...`, so they're covered by the
existing `/api/*` rule — no extra ingress needed.

---

## 6. Connect the frontend

**Local development against the real CMS** (no tunnel needed — Tailscale is enough):

```bash
# web/.env.local
NEXT_PUBLIC_CMS_URL=http://the-adinator:3005
REVALIDATE_SECRET=<same value as the Pi's .env>
```

**Production** — set on Vercel/EasyHost:

```
NEXT_PUBLIC_CMS_URL=https://cms.avsworks.be
REVALIDATE_SECRET=<same value as the Pi's .env>
```

**Test instant updates end-to-end.** The `afterChange` hooks in
`payload-cms/src/hooks/revalidateFrontend.ts` POST to the frontend on every
save:

1. Edit a project in `/admin` and save.
2. `docker logs payload-cms --tail 20` → expect `[revalidate] frontend refreshed projects`.
3. Reload the site; the change should be there without waiting out the cache.

If you see `[revalidate] failed to reach frontend`, the Pi can't reach
`FRONTEND_URL`. That's non-fatal by design — the save still succeeds and the
page updates when its cache goes stale (~5 min).

During local dev, point `FRONTEND_URL` at your PC's tailnet address
(`http://<your-pc>:3000`) so the hook can reach your dev server.

---

## 7. Backups

Once data exists, add to the existing cron routine:

```bash
docker exec payload-db pg_dump -U payload payload > /mnt/backup-usb/payload-$(date +%F).sql
```

Verify a restore once. An untested backup isn't a backup.

---

## 8. Content model gaps (before you write real content)

Worth fixing now, because changing them after you've written posts means a
migration:

- **No `slug` field** on Projects or Posts → no clean URLs like
  `/blog/how-i-built-my-homelab`. Payload has a `slugField()` helper that
  auto-generates from the title.
- **No image field** → projects can't have screenshots. Needs an `upload`
  field pointing at the `media` collection.
- **No draft/publish state** → everything you save is instantly public, with no
  way to write a post over several sittings. Fixed with
  `versions: { drafts: true }`.
- **`payload-types.ts` is stale** — generated before Projects/Posts existed. Run
  `pnpm generate:types`.

---

## Order to actually do this in

1. Step 1 — one curl tells us app-down vs firewall
2. Step 2 — fix compose, rotate the DB password, create `.env`
3. Step 3 — build (watch the heap ceiling) and create the admin user
4. Step 5 — tunnel, and **verify `/admin` returns 404 publicly**
5. Step 6 — point the frontend at it, test the revalidate round-trip
6. Steps 7–8 — backups, then content model

## What to send me

To unblock the parts I can't see:

```bash
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker logs payload-cms --tail 100
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3005/api/projects
```
