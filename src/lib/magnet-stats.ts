export type MagnetStatRow = {
  id: string;
  price: number | null;
  purchased_at: string | null;
  category: string | null;
  tags: string[] | null;
  place_name: string | null;
  created_at: string | null;
};

export type CategorySlice = { label: string; count: number };
export type MonthSlice = { monthKey: string; label: string; count: number };
export type TagSlice = { tag: string; count: number };

export type MagnetStats = {
  totalCount: number;
  sumPrice: number;
  pricedCount: number;
  avgPrice: number | null;
  byCategory: CategorySlice[];
  byMonth: MonthSlice[];
  topTags: TagSlice[];
  placesRecorded: number;
  fridgePlacedCount: number;
};

function monthKeyFromRow(row: MagnetStatRow): string | null {
  const primary = row.purchased_at ?? row.created_at;
  if (!primary) {
    return null;
  }
  const d = new Date(primary);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-");
  return `${y}年${Number(m)}月`;
}

export function aggregateMagnetStats(
  rows: MagnetStatRow[],
  fridgeMagnetIds: Set<string>,
): MagnetStats {
  const totalCount = rows.length;

  let sumPrice = 0;
  let pricedCount = 0;
  for (const row of rows) {
    if (row.price != null && Number.isFinite(row.price)) {
      sumPrice += row.price;
      pricedCount += 1;
    }
  }
  const avgPrice =
    pricedCount > 0 ? Math.round(sumPrice / pricedCount) : null;

  const categoryMap = new Map<string, number>();
  for (const row of rows) {
    const label = row.category?.trim() || "未分類";
    categoryMap.set(label, (categoryMap.get(label) ?? 0) + 1);
  }
  const byCategory = [...categoryMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const monthMap = new Map<string, number>();
  for (const row of rows) {
    const key = monthKeyFromRow(row);
    if (!key) {
      continue;
    }
    monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
  }
  const byMonth = [...monthMap.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([monthKey, count]) => ({
      monthKey,
      label: monthLabel(monthKey),
      count,
    }));

  const tagMap = new Map<string, number>();
  for (const row of rows) {
    if (!row.tags?.length) {
      continue;
    }
    for (const raw of row.tags) {
      const tag = raw.trim();
      if (!tag) {
        continue;
      }
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }
  const topTags = [...tagMap.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  let placesRecorded = 0;
  let fridgePlacedCount = 0;
  for (const row of rows) {
    if (row.place_name?.trim()) {
      placesRecorded += 1;
    }
    if (fridgeMagnetIds.has(row.id)) {
      fridgePlacedCount += 1;
    }
  }

  return {
    totalCount,
    sumPrice,
    pricedCount,
    avgPrice,
    byCategory,
    byMonth,
    topTags,
    placesRecorded,
    fridgePlacedCount,
  };
}
