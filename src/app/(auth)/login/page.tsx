import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <section className="w-full rounded-[24px] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">通常利用モード</h1>
        <p className="mt-2 text-sm text-gray-600">
          このアプリは匿名セッションで利用できます。ログインは一旦停止中です。
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white"
        >
          図鑑を開く
        </Link>
      </section>
    </main>
  );
}
