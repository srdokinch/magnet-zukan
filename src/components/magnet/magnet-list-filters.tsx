"use client";

import { useMemo } from "react";
import type { Magnet } from "@/lib/magnets";

export type MagnetListFiltersProps = {
  magnets: Magnet[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  selectedCategory: string | null;
  onSelectedCategoryChange: (value: string | null) => void;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
};

const chipBase =
  "min-h-11 rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400";

export function MagnetListFilters({
  magnets,
  searchQuery,
  onSearchQueryChange,
  selectedCategory,
  onSelectedCategoryChange,
  selectedTags,
  onToggleTag,
}: MagnetListFiltersProps) {
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of magnets) {
      const c = m.category?.trim();
      if (c) {
        set.add(c);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ja"));
  }, [magnets]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of magnets) {
      for (const t of m.tags ?? []) {
        const x = t.trim();
        if (x) {
          set.add(x);
        }
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ja"));
  }, [magnets]);

  return (
    <div className="space-y-4 rounded-3xl bg-white p-4 shadow-sm">
      <label className="block space-y-2">
        <span className="text-xs font-semibold text-gray-700">キーワード</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          className="min-h-11 w-full rounded-2xl border border-orange-200 px-3 text-sm text-gray-900 placeholder:text-gray-400"
          placeholder="名前・場所・メモで検索"
          aria-label="キーワード検索"
        />
      </label>

      {categoryOptions.length > 0 ? (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-gray-700">カテゴリ</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`${chipBase} ${
                selectedCategory === null
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              aria-pressed={selectedCategory === null}
              onClick={() => onSelectedCategoryChange(null)}
            >
              全て
            </button>
            {categoryOptions.map((c) => {
              const active = selectedCategory === c;
              return (
                <button
                  key={c}
                  type="button"
                  className={`${chipBase} ${
                    active
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  aria-pressed={active}
                  onClick={() => onSelectedCategoryChange(c)}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {tagOptions.length > 0 ? (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-gray-700">タグ</span>
          <div className="flex flex-wrap gap-2">
            {tagOptions.map((tag) => {
              const pressed = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={pressed}
                  aria-label={`タグ ${tag} で絞り込み`}
                  className={`${chipBase} ${
                    pressed
                      ? "bg-sky-600 text-white"
                      : "border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
                  }`}
                  onClick={() => onToggleTag(tag)}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
