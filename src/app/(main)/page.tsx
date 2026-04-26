export default function DictionaryPage() {
  return (
    <section className="space-y-4">
      <header className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-orange-600">全0個</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">マグネット図鑑</h1>
      </header>

      <div className="rounded-3xl border border-dashed border-orange-200 bg-white p-6 text-center text-gray-500">
        まだ投稿がありません。<br />
        下の「投稿」から最初のマグネットを追加しましょう。
      </div>
    </section>
  );
}
