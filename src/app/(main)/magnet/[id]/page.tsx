type MagnetDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MagnetDetailPage({ params }: MagnetDetailPageProps) {
  const { id } = await params;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">マグネット詳細</h1>
      <div className="rounded-[24px] bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-600">ID: {id}</p>
      </div>
    </section>
  );
}
