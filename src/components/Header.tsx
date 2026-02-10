import Link from "next/link";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="font-medium tracking-tight text-white">
          Ghostworks
        </Link>
        <nav className="flex items-center gap-8">
          <Link
            href="/"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Work
          </Link>
        </nav>
      </div>
    </header>
  );
}
