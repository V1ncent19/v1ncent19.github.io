import Link from "next/link";

export default function NotFound() {
  return (
    <section className="shell flex min-h-[62svh] flex-col items-start justify-center py-16">
      <p className="ui-text text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        404
      </p>
      <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-[var(--measure)] text-muted">
        Sorry, we&rsquo;ve misplaced that URL or it&rsquo;s pointing to
        something that doesn&rsquo;t exist.
      </p>
      <Link
        href="/"
        className="ui-text mt-8 inline-flex items-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-white no-underline transition-colors hover:bg-brand-strong hover:no-underline"
      >
        ← Back home
      </Link>
    </section>
  );
}
