export function PublicBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute top-1/4 left-0 w-80 h-80 bg-primary/[0.04] rounded-full blur-3xl -translate-x-1/2 will-change-auto" />
      <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-accent/[0.04] rounded-full blur-3xl translate-x-1/2" />
    </div>
  )
}
