export default function FridgePage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">バーチャル冷蔵庫</h1>
        <p className="text-sm text-gray-600">D&D機能はPhase 2で実装します。</p>
      </header>
      <div className="h-[60vh] rounded-[24px] bg-gradient-to-b from-slate-100 to-slate-200 p-4 shadow-lg">
        <p className="rounded-2xl bg-white/80 px-3 py-2 text-sm font-medium text-gray-700">
          🧲 ここにマグネットが並びます
        </p>
      </div>
    </section>
  );
}
