// Placeholder home page. The real home screen replaces this in a later step.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center gap-3 px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-center">
      <h1 className="text-[40px] font-bold leading-tight">Vital</h1>
      <p className="text-[17px] leading-snug text-ink-2">App shell is ready. Screens come next.</p>
    </main>
  );
}
