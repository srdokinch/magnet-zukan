"use client";

import { KeyboardEvent, useCallback, useState } from "react";

type TagChipInputProps = {
  tags: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  hint?: string;
};

/** 先頭の # と前後空白を除いたタグ文字列 */
const normalizeTag = (raw: string) => raw.trim().replace(/^#+/u, "");

export function TagChipInput({
  tags,
  onChange,
  placeholder = "タグを入力して Enter",
  hint,
}: TagChipInputProps) {
  const [draft, setDraft] = useState("");

  const commitDraft = useCallback(() => {
    const parts = draft
      .split(",")
      .map((segment) => normalizeTag(segment))
      .filter((segment) => segment.length > 0);
    if (parts.length === 0) {
      setDraft("");
      return;
    }
    const next = [...tags];
    let changed = false;
    for (const part of parts) {
      if (!next.includes(part)) {
        next.push(part);
        changed = true;
      }
    }
    if (changed) {
      onChange(next);
    }
    setDraft("");
  }, [draft, onChange, tags]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
      return;
    }
    if (event.key === ",") {
      event.preventDefault();
      commitDraft();
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold tracking-wide text-gray-500">タグ</span>
      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="追加済みタグ">
          {tags.map((tag, index) => (
            <li key={`${tag}-${String(index)}`}>
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="inline-flex min-h-11 items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700"
                aria-label={`タグ ${tag} を削除`}
              >
                #{tag}
                <span className="text-orange-500" aria-hidden>
                  ×
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (draft.trim().length > 0) {
            commitDraft();
          }
        }}
        className="min-h-11 w-full rounded-3xl border-none bg-white px-6 text-sm shadow-sm ring-1 ring-orange-100 placeholder:text-gray-300 focus:ring-2 focus:ring-orange-300"
        placeholder={placeholder}
        aria-label="タグ"
      />
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}
