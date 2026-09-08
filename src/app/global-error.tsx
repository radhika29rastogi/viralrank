"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-full flex-col items-center justify-center bg-cream px-4 py-20 font-sans">
        <h1 className="text-3xl font-extrabold text-black">Something broke</h1>
        <p className="mt-3 font-bold text-neutral-500">ViralRank hit an unexpected error.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 h-11 rounded-xl border-[3px] border-black bg-hot-pink px-4 text-sm font-extrabold text-black shadow-[4px_4px_0_#000]"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
