import { stackLabels, type Project } from '@/lib/cms'

export function ProjectCard({
  project,
  index,
}: {
  project: Project
  index: number
}) {
  const stack = stackLabels(project)
  const isLive = project.status !== 'idle'

  return (
    <article
      className="rise-in group relative flex flex-col rounded-lg border border-edge bg-surface/70 p-6 backdrop-blur-sm transition-colors duration-300 hover:border-edge-bright"
      style={{ '--delay': `${0.05 * index}s` } as React.CSSProperties}
    >
      {/* Corner tick, like a component outline silkscreen on a board. */}
      <span className="absolute left-0 top-0 h-3 w-3 rounded-tl-lg border-l border-t border-violet/40 transition-colors duration-300 group-hover:border-violet-bright" />

      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-medium text-ink">{project.name}</h3>
        {project.year && (
          <span className="shrink-0 font-mono text-xs text-ink-faint">
            {project.year}
          </span>
        )}
      </div>

      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-dim">
        {project.tagline}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider ${
            isLive ? 'text-arduino-bright' : 'text-ink-faint'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isLive ? 'bg-arduino-bright' : 'bg-ink-faint'
            }`}
          />
          {isLive ? 'live' : 'idle'}
        </span>

        {stack.map((label) => (
          <span
            key={label}
            className="rounded border border-edge px-2 py-0.5 font-mono text-[11px] text-ink-dim"
          >
            {label}
          </span>
        ))}
      </div>
    </article>
  )
}
