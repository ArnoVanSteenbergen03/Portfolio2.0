import { CircuitBackground } from '@/components/circuit-background'
import { ProjectCard } from '@/components/project-card'
import { getProjects } from '@/lib/cms'

// TODO(arno): confirm these — GitHub handle is guessed from your git config.
const LINKS = [
  { label: 'GitHub', href: 'https://github.com/ArnoVanSteenbergen03' },
  { label: 'Email', href: 'mailto:arno.van.steenbergen1@gmail.com' },
]

// Evaluated once at module load rather than during render: reading the clock
// mid-render would opt the page out of prerendering under Cache Components.
const CURRENT_YEAR = new Date().getFullYear()

export default async function HomePage() {
  const projects = await getProjects()

  return (
    <>
      <CircuitBackground />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 sm:px-8">
        {/* Hero */}
        <section className="flex min-h-[78svh] flex-col justify-center py-24">
          <p
            className="rise-in font-mono text-xs uppercase tracking-[0.2em] text-arduino-bright"
            style={{ '--delay': '0s' } as React.CSSProperties}
          >
            Arno Van Steenbergen
          </p>

          <h1
            className="rise-in mt-6 text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl"
            style={{ '--delay': '0.1s' } as React.CSSProperties}
          >
            I build for the browser
            <br />
            and the{' '}
            <span className="bg-gradient-to-r from-violet-bright to-arduino-bright bg-clip-text text-transparent">
              bare metal
            </span>
            .
          </h1>

          <p
            className="rise-in mt-6 max-w-xl text-pretty text-base leading-relaxed text-ink-dim sm:text-lg"
            style={{ '--delay': '0.2s' } as React.CSSProperties}
          >
            Web developer with a soldering iron on the desk. I write Next.js
            front ends, run my own infrastructure on a Raspberry Pi, and wire up
            Arduino hardware when software alone won&apos;t do.
          </p>

          <div
            className="rise-in mt-10 flex flex-wrap gap-3"
            style={{ '--delay': '0.3s' } as React.CSSProperties}
          >
            <a
              href="#work"
              className="rounded-md bg-violet-deep px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-violet"
            >
              See my work
            </a>
            {LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-md border border-edge px-5 py-2.5 text-sm font-medium text-ink-dim transition-colors duration-200 hover:border-edge-bright hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </div>
        </section>

        {/* Work */}
        <section id="work" className="scroll-mt-16 border-t border-edge py-20">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">Work</h2>
            {projects.length > 0 && (
              <span className="font-mono text-xs text-ink-faint">
                {projects.length} project{projects.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {projects.length > 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {projects.map((project, i) => (
                <ProjectCard key={project.id} project={project} index={i} />
              ))}
            </div>
          ) : (
            /* Shown when the CMS has no projects yet, or the Pi is unreachable.
               Deliberately understated — a visitor shouldn't see an error. */
            <p className="mt-8 rounded-lg border border-dashed border-edge px-6 py-10 text-center text-sm text-ink-faint">
              Projects are loading from the CMS. Check back shortly.
            </p>
          )}
        </section>
      </main>

      <footer className="border-t border-edge">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-8 sm:px-8">
          <p className="font-mono text-xs text-ink-faint">
            © {CURRENT_YEAR} Arno Van Steenbergen
          </p>
          <div className="flex gap-5">
            {LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-mono text-xs text-ink-faint transition-colors duration-200 hover:text-arduino-bright"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </>
  )
}
