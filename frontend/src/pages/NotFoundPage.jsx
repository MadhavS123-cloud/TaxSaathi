import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-start justify-center bg-[#0C0C0C] px-8 text-[#F3EDE2]">
      <p className="font-sans text-xs uppercase tracking-[0.22em] text-[#C9A96E]">TaxSaathi</p>
      <h1 className="mt-4 font-serif text-4xl font-light">This page is not on the desk.</h1>
      <p className="mt-3 max-w-md font-sans text-sm text-[#B7AFA3]">
        The address does not match a case, a document, or a public page.
      </p>
      <Link
        to="/"
        className="mt-8 border border-[#C9A96E] px-4 py-2 font-sans text-sm text-[#F3EDE2]"
      >
        Back to the desk
      </Link>
    </main>
  );
}

export function DeskNotFound() {
  return (
    <div className="max-w-xl">
      <p className="font-sans text-xs uppercase tracking-[0.22em] text-brass">Missing page</p>
      <h1 className="mt-3 font-serif text-3xl font-light text-ink">This section is not on the desk.</h1>
      <p className="mt-3 font-sans text-sm text-ink-muted">
        Choose a section from the side, or return to the case dashboard.
      </p>
      <Link to="/app/dashboard" className="mt-6 inline-block border border-brass px-4 py-2 font-sans text-sm text-ink">
        Case dashboard
      </Link>
    </div>
  );
}
