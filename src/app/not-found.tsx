import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">404</p>
      <h1 className="font-display text-4xl md:text-5xl mb-4">Page not found</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        The page you are looking for has moved or no longer exists.
      </p>
      <div className="flex gap-3">
        <Link href="/" className="bg-primary text-primary-foreground hover:bg-primary/85 px-6 py-3 text-sm uppercase tracking-widest">
          Home
        </Link>
        <Link href="/shop" className="border border-foreground/30 hover:border-foreground px-6 py-3 text-sm uppercase tracking-widest">
          Shop
        </Link>
      </div>
    </main>
  );
}
