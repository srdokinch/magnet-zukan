"use client";

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { toast } from "sonner";
import type { Magnet } from "@/lib/magnets";
import { supabase } from "@/lib/supabase";

const MAGNET_WIDTH = 112;
const MAGNET_HEIGHT = 72;
const GRID_GAP = 12;
const LONG_PRESS_MS = 450;

const isAuthSessionMissingError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AuthSessionMissingError" ||
    error.message.includes("Auth session missing"));

type Position = { x: number; y: number };
type MagnetPositionRow = {
  magnet_id: string;
  x: number;
  y: number;
  rotation: number | null;
};
type FridgeTheme = "white" | "black" | "retro" | "pastel_pink" | "pastel_blue";
type FridgeSize = "small" | "medium" | "large";
type FridgeLayout = {
  theme: FridgeTheme;
  size: FridgeSize;
};

const defaultLayout: FridgeLayout = { theme: "white", size: "medium" };
const sizeClassMap: Record<FridgeSize, string> = {
  small: "h-[52vh] max-h-[460px] aspect-[3/5]",
  medium: "h-[62vh] max-h-[620px] aspect-[3/5]",
  large: "h-[72vh] max-h-[740px] aspect-[3/5]",
};
const themeClassMap: Record<FridgeTheme, string> = {
  white: "from-zinc-100 to-zinc-200 border-white/60",
  black: "from-zinc-700 to-zinc-900 border-zinc-500/60",
  retro: "from-teal-100 to-emerald-200 border-teal-200/80",
  pastel_pink: "from-pink-100 to-rose-200 border-pink-200/80",
  pastel_blue: "from-sky-100 to-cyan-200 border-sky-200/80",
};
const themeButtonClassMap: Record<FridgeTheme, string> = {
  white: "bg-zinc-100",
  black: "bg-zinc-800",
  retro: "bg-teal-100",
  pastel_pink: "bg-pink-100",
  pastel_blue: "bg-cyan-100",
};

const getDefaultPosition = (index: number): Position => {
  const columns = 2;
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: 16 + column * (MAGNET_WIDTH + GRID_GAP),
    y: 16 + row * (MAGNET_HEIGHT + GRID_GAP),
  };
};

const clampPosition = (position: Position, width: number, height: number): Position => ({
  x: Math.min(Math.max(position.x, 0), Math.max(width - MAGNET_WIDTH, 0)),
  y: Math.min(Math.max(position.y, 0), Math.max(height - MAGNET_HEIGHT, 0)),
});

const DraggableMagnet = ({
  magnet,
  position,
  rotation,
  isDragging,
  onTap,
  onLongPress,
}: {
  magnet: Magnet;
  position: Position;
  rotation: number;
  isDragging: boolean;
  onTap: () => void;
  onLongPress: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: magnet.id,
  });
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  return (
    <button
      type="button"
      ref={setNodeRef}
      {...attributes}
      onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
        listeners?.onPointerDown?.(event);
        longPressTriggeredRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
          longPressTriggeredRef.current = true;
          onLongPress();
        }, LONG_PRESS_MS);
      }}
      onPointerUp={(event: PointerEvent<HTMLButtonElement>) => {
        listeners?.onPointerUp?.(event);
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }}
      onPointerLeave={() => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }}
      onClick={() => {
        if (!longPressTriggeredRef.current) {
          onTap();
        }
      }}
      className="absolute h-[72px] w-[112px] cursor-grab overflow-hidden rounded-2xl border border-orange-200 bg-white shadow"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `${transform ? CSS.Translate.toString(transform) : ""} rotate(${rotation}deg)`,
        zIndex: isDragging ? 20 : 10,
      }}
    >
      <Image
        src={magnet.photo_url}
        alt={magnet.name ?? "マグネット画像"}
        className="h-full w-full object-cover"
        width={112}
        height={72}
        unoptimized
      />
      <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-left text-[11px] font-semibold text-white">
        {magnet.name ?? "名前未設定"}
      </span>
    </button>
  );
};

export default function FridgePage() {
  const [magnets, setMagnets] = useState<Magnet[]>([]);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [rotations, setRotations] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [layout, setLayout] = useState<FridgeLayout>(defaultLayout);
  const [activeMagnetId, setActiveMagnetId] = useState<string | null>(null);
  const [draggingMagnetId, setDraggingMagnetId] = useState<string | null>(null);
  const [detailMagnetId, setDetailMagnetId] = useState<string | null>(null);
  const [actionMenuMagnetId, setActionMenuMagnetId] = useState<string | null>(null);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [isSizeMenuOpen, setIsSizeMenuOpen] = useState(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const startDragPositionRef = useRef<Position | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 6 },
    }),
  );

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const selectedMagnet = useMemo(
    () => magnets.find((magnet) => magnet.id === detailMagnetId) ?? null,
    [detailMagnetId, magnets],
  );
  const completionPercent = Math.min(Math.round((magnets.length / 25) * 100), 100);
  const remainingCount = Math.max(25 - magnets.length, 0);

  const savePosition = async (
    magnetId: string,
    position: Position,
    rotation: number,
  ) => {
    const userId = currentUserIdRef.current;
    if (!userId) {
      return;
    }

    const { error } = await supabase.from("magnet_positions").upsert(
      {
        user_id: userId,
        magnet_id: magnetId,
        x: position.x,
        y: position.y,
        rotation,
      },
      { onConflict: "user_id,magnet_id" },
    );

    if (error) {
      throw error;
    }
  };

  const saveLayout = async (nextLayout: FridgeLayout) => {
    const userId = currentUserIdRef.current;
    if (!userId) {
      return;
    }
    setIsSavingLayout(true);
    const { error } = await supabase.from("fridge_layouts").upsert(
      {
        user_id: userId,
        theme: nextLayout.theme,
        size: nextLayout.size,
      },
      { onConflict: "user_id" },
    );
    setIsSavingLayout(false);
    if (error) {
      throw error;
    }
  };

  const updateLayout = (patch: Partial<FridgeLayout>) => {
    setLayout((prev) => {
      const next = { ...prev, ...patch };
      void saveLayout(next).catch((error: unknown) => {
        toast.error("冷蔵庫レイアウトの保存に失敗しました。");
        console.error(error);
      });
      return next;
    });
  };

  const handleDeleteMagnet = async (magnetId: string) => {
    const userId = currentUserIdRef.current;
    if (!userId) {
      return;
    }
    const { error } = await supabase
      .from("magnets")
      .delete()
      .eq("id", magnetId)
      .eq("user_id", userId);
    if (error) {
      throw error;
    }
    setMagnets((prev) => prev.filter((magnet) => magnet.id !== magnetId));
    setPositions((prev) => {
      const next = { ...prev };
      delete next[magnetId];
      return next;
    });
    setRotations((prev) => {
      const next = { ...prev };
      delete next[magnetId];
      return next;
    });
  };

  useEffect(() => {
    const fetchFridgeData = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError && !isAuthSessionMissingError(userError)) {
          throw userError;
        }

        let currentUser = user;
        if (!currentUser) {
          const { data: anonymousData, error: anonymousError } =
            await supabase.auth.signInAnonymously();
          if (anonymousError) {
            throw anonymousError;
          }
          currentUser = anonymousData.user;
        }

        if (!currentUser) {
          setMagnets([]);
          return;
        }

        setCurrentUserId(currentUser.id);

        const { data: magnetData, error: magnetError } = await supabase
          .from("magnets")
          .select("id,name,photo_url,category,tags,comment,place_name,created_at")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false });

        if (magnetError) {
          throw magnetError;
        }

        const fetchedMagnets = magnetData ?? [];
        setMagnets(fetchedMagnets);

        if (fetchedMagnets.length === 0) {
          setPositions({});
          setRotations({});
          return;
        }

        const ids = fetchedMagnets.map((magnet) => magnet.id);
        const { data: positionData, error: positionError } = await supabase
          .from("magnet_positions")
          .select("magnet_id,x,y,rotation")
          .eq("user_id", currentUser.id)
          .in("magnet_id", ids);

        if (positionError) {
          throw positionError;
        }

        const fromDb: Record<string, Position> = {};
        const rotationFromDb: Record<string, number> = {};
        (positionData as MagnetPositionRow[] | null)?.forEach((row) => {
          fromDb[row.magnet_id] = { x: row.x, y: row.y };
          rotationFromDb[row.magnet_id] = row.rotation ?? 0;
        });

        const withDefaults: Record<string, Position> = {};
        const rotationDefaults: Record<string, number> = {};
        fetchedMagnets.forEach((magnet, index) => {
          withDefaults[magnet.id] = fromDb[magnet.id] ?? getDefaultPosition(index);
          rotationDefaults[magnet.id] = rotationFromDb[magnet.id] ?? 0;
        });
        setPositions(withDefaults);
        setRotations(rotationDefaults);

        const { data: layoutData, error: layoutError } = await supabase
          .from("fridge_layouts")
          .select("theme,size")
          .eq("user_id", currentUser.id)
          .maybeSingle();
        if (layoutError) {
          throw layoutError;
        }
        if (layoutData?.theme && layoutData?.size) {
          setLayout({
            theme: layoutData.theme as FridgeTheme,
            size: layoutData.size as FridgeSize,
          });
        }
      } catch (error: unknown) {
        toast.error("冷蔵庫データの取得に失敗しました。");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchFridgeData();
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const magnetId = String(event.active.id);
    const currentPosition = positions[magnetId];
    if (!currentPosition) {
      return;
    }
    startDragPositionRef.current = currentPosition;
    setActiveMagnetId(magnetId);
    setDraggingMagnetId(magnetId);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    if (!activeMagnetId || !startDragPositionRef.current) {
      return;
    }
    const board = boardRef.current;
    if (!board) {
      return;
    }
    const rect = board.getBoundingClientRect();
    const nextPosition = clampPosition(
      {
        x: startDragPositionRef.current.x + event.delta.x,
        y: startDragPositionRef.current.y + event.delta.y,
      },
      rect.width,
      rect.height,
    );

    setPositions((prev) => ({
      ...prev,
      [activeMagnetId]: nextPosition,
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const magnetId = String(event.active.id);
    const position = positions[magnetId];
    const rotation = rotations[magnetId] ?? 0;
    setActiveMagnetId(null);
    setDraggingMagnetId(null);
    startDragPositionRef.current = null;
    if (!position) {
      return;
    }
    void savePosition(magnetId, position, rotation).catch((error: unknown) => {
      toast.error("配置の保存に失敗しました。");
      console.error(error);
    });
  };

  const rotateMagnet = (delta: number) => {
    if (!actionMenuMagnetId) {
      return;
    }
    setRotations((prev) => {
      const nextRotation = ((prev[actionMenuMagnetId] ?? 0) + delta + 360) % 360;
      const next = { ...prev, [actionMenuMagnetId]: nextRotation };
      const currentPosition = positions[actionMenuMagnetId];
      if (currentPosition) {
        void savePosition(actionMenuMagnetId, currentPosition, nextRotation).catch((error) => {
          toast.error("回転の保存に失敗しました。");
          console.error(error);
        });
      }
      return next;
    });
  };

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-[32px] font-extrabold tracking-tight text-[#251913]">
          バーチャル冷蔵庫
        </h1>
      </header>

      <div className="rounded-3xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between border-b border-[#f6ded3] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-orange-500">🧲</span>
            <p className="text-xl font-extrabold tracking-tight text-[#f97316]">MagnetCollector</p>
          </div>
            <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-orange-100">
            <div className="h-full w-full bg-linear-to-br from-zinc-400 to-zinc-700" />
          </div>
        </div>

        {isLoading ? (
          <div className="p-5">
            <div className="rounded-3xl border border-[#e0c0b1] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
              <p className="text-sm text-[#584237]">読み込み中...</p>
            </div>
          </div>
        ) : magnets.length === 0 ? (
          <div className="p-5">
            <div className="rounded-3xl border border-[#e0c0b1] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
              <p className="text-sm text-[#584237]">
                まだ投稿がありません。先にマグネットを登録してください。
              </p>
              <Link
                href="/magnet/new"
                className="mt-3 inline-flex min-h-11 items-center rounded-2xl bg-orange-100 px-4 text-sm font-semibold text-orange-700"
              >
                新規投稿へ
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-4 pt-5">
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
              onDragCancel={() => {
                setActiveMagnetId(null);
                setDraggingMagnetId(null);
                startDragPositionRef.current = null;
              }}
            >
              <div
                ref={boardRef}
                className={`relative mx-auto overflow-hidden rounded-[2.5rem] border-4 bg-linear-to-br px-5 py-6 shadow-2xl ${sizeClassMap[layout.size]} ${themeClassMap[layout.theme]}`}
              >
                <div className="absolute bottom-24 right-4 h-24 w-2 rounded-full bg-zinc-300/60" />
                {magnets.map((magnet) => {
                  const position = positions[magnet.id] ?? { x: 0, y: 0 };
                  const rotation = rotations[magnet.id] ?? 0;
                  return (
                    <DraggableMagnet
                      key={magnet.id}
                      magnet={magnet}
                      position={position}
                      rotation={rotation}
                      isDragging={draggingMagnetId === magnet.id}
                      onTap={() => {
                        setDetailMagnetId(magnet.id);
                      }}
                      onLongPress={() => {
                        setActionMenuMagnetId(magnet.id);
                      }}
                    />
                  );
                })}
                <div className="absolute inset-x-0 bottom-4 flex justify-center">
                  <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-2 shadow-lg backdrop-blur">
                    {(Object.keys(themeButtonClassMap) as FridgeTheme[]).map((themeKey) => (
                      <button
                        key={themeKey}
                        type="button"
                        onClick={() => {
                          updateLayout({ theme: themeKey });
                        }}
                        aria-label={`テーマ ${themeKey}`}
                        className={`h-7 w-7 rounded-full border-2 transition ${themeButtonClassMap[themeKey]} ${
                          layout.theme === themeKey
                            ? "border-orange-500"
                            : "border-transparent hover:border-zinc-300"
                        }`}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSizeMenuOpen((prev) => !prev);
                      }}
                      className="ml-1 rounded-full p-1 text-zinc-500 hover:bg-zinc-100"
                      aria-label="サイズ設定"
                    >
                      ⚙️
                    </button>
                  </div>
                </div>
              </div>
            </DndContext>
          </div>
        )}
      </div>

      {isSizeMenuOpen ? (
        <section className="rounded-3xl border border-[#e0c0b1] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <p className="mb-2 text-sm font-semibold text-[#584237]">冷蔵庫サイズ</p>
          <div className="grid grid-cols-3 gap-2">
            {(["small", "medium", "large"] as FridgeSize[]).map((sizeKey) => (
              <button
                key={sizeKey}
                type="button"
                onClick={() => {
                  updateLayout({ size: sizeKey });
                  setIsSizeMenuOpen(false);
                }}
                className={`min-h-11 rounded-2xl text-sm font-semibold ${
                  layout.size === sizeKey
                    ? "bg-orange-500 text-white"
                    : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {sizeKey === "small" ? "小" : sizeKey === "medium" ? "中" : "大"}
              </button>
            ))}
          </div>
          {isSavingLayout ? (
            <p className="mt-2 text-xs text-[#584237]">レイアウト保存中...</p>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-3xl border border-[#e9e4e1] bg-[#f2f2f2] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-3xl font-bold tracking-tight text-[#251913]">コレクションの達成度</p>
            <p className="text-sm text-[#77706b]">あと{remainingCount}個で新しい冷蔵庫が解放！</p>
          </div>
          <span className="rounded-full bg-[#ffd6bf] px-3 py-1 text-sm font-bold text-[#f97316]">
            {completionPercent}%
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-[#ddd9d6]">
          <div
            className="h-full rounded-full bg-[#f97316]"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </section>

      <div className="flex justify-center pb-2">
        <Link
          href="/magnet/new"
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#f97316] px-8 text-base font-bold text-white shadow-[0_10px_24px_rgba(249,115,22,0.35)]"
        >
          📸 マグネットを追加する
        </Link>
      </div>

      {selectedMagnet ? (
        <div className="fixed inset-0 z-40 flex items-end bg-black/45 p-4 sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
            <p className="text-lg font-bold text-[#251913]">
              {selectedMagnet.name ?? "名前未設定のマグネット"}
            </p>
            <p className="mt-1 text-sm text-[#584237]">
              {selectedMagnet.place_name ?? "購入場所未設定"}
              {selectedMagnet.category ? ` / ${selectedMagnet.category}` : ""}
            </p>
            <div className="mt-3 overflow-hidden rounded-2xl">
              <Image
                src={selectedMagnet.photo_url}
                alt={selectedMagnet.name ?? "マグネット画像"}
                width={480}
                height={320}
                className="h-48 w-full object-cover"
                unoptimized
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href={`/magnet/${selectedMagnet.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-orange-100 px-4 text-sm font-semibold text-orange-700"
              >
                詳細を見る
              </Link>
              <button
                type="button"
                onClick={() => {
                  setDetailMagnetId(null);
                }}
                className="min-h-11 rounded-2xl bg-zinc-100 px-4 text-sm font-semibold text-zinc-700"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {actionMenuMagnetId ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-4 sm:items-center sm:justify-center">
          <div className="w-full max-w-sm space-y-2 rounded-3xl bg-white p-4 shadow-xl">
            <button
              type="button"
              onClick={() => {
                rotateMagnet(-15);
              }}
              className="w-full rounded-2xl bg-zinc-100 px-4 py-3 text-left text-sm font-semibold text-zinc-800"
            >
              左に15°回転
            </button>
            <button
              type="button"
              onClick={() => {
                rotateMagnet(15);
              }}
              className="w-full rounded-2xl bg-zinc-100 px-4 py-3 text-left text-sm font-semibold text-zinc-800"
            >
              右に15°回転
            </button>
            <Link
              href={`/magnet/${actionMenuMagnetId}/edit`}
              className="block w-full rounded-2xl bg-orange-100 px-4 py-3 text-left text-sm font-semibold text-orange-700"
            >
              編集する
            </Link>
            <button
              type="button"
              onClick={() => {
                void handleDeleteMagnet(actionMenuMagnetId)
                  .then(() => {
                    toast.success("マグネットを削除しました。");
                  })
                  .catch((error: unknown) => {
                    toast.error("マグネットの削除に失敗しました。");
                    console.error(error);
                  })
                  .finally(() => {
                    setActionMenuMagnetId(null);
                  });
              }}
              className="w-full rounded-2xl bg-red-500 px-4 py-3 text-left text-sm font-semibold text-white"
            >
              削除する
            </button>
            <button
              type="button"
              onClick={() => {
                setActionMenuMagnetId(null);
              }}
              className="w-full rounded-2xl bg-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
