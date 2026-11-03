import Link from "next/link";

export default function DeclinedPage() {
  return (
    <div className="min-h-full bg-zinc-100 dark:bg-zinc-950">
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-zinc-900">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Thank you for your response.
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Your decline has been recorded. We hope to see you at future
            DOST-MIRDC events.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
