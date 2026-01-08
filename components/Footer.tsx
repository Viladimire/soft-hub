export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white/80 py-6 text-sm text-zinc-500 backdrop-blur dark:border-zinc-800 dark:bg-black/60 dark:text-zinc-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} SoftHub. All rights reserved.</p>
        <p className="text-xs">
          Built with Next.js and deployed to GitHub Pages via automated CI/CD.
        </p>
      </div>
    </footer>
  );
}
