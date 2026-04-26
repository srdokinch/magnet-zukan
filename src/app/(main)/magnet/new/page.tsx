export default function NewMagnetPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">新規投稿</h1>
      <form className="space-y-4 rounded-[24px] bg-white p-5 shadow-sm">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-gray-700">名前</span>
          <input
            className="min-h-11 w-full rounded-2xl border border-orange-200 px-3 text-sm"
            placeholder="例：北海道ラベンダーマグネット"
            type="text"
          />
        </label>
        <button
          type="button"
          className="min-h-11 w-full rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white"
        >
          🧲 コレクションに追加
        </button>
      </form>
    </section>
  );
}
