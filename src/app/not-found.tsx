import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
      <h1 className="text-2xl font-medium text-white">Project not found</h1>
      <Link
        href="/"
        className="mt-6 text-sm text-zinc-500 transition-colors hover:text-white"
      >
        ← Back to Work
      </Link>
    </div>
  );
}
