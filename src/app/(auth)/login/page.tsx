export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <section className="w-full rounded-[24px] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">ログイン</h1>
        <p className="mt-2 text-sm text-gray-600">
          Googleログイン機能はPhase 1で接続します。
        </p>
        <button
          type="button"
          className="mt-6 min-h-11 w-full rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white"
        >
          Googleでログイン
        </button>
      </section>
    </main>
  );
}
