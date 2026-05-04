"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Magnet } from "@/lib/magnets";
import { supabase } from "@/lib/supabase";

const MAGNET_WIDTH = 112;
const MAGNET_HEIGHT = 72;
const GRID_GAP = 12;

const isAuthSessionMissingError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AuthSessionMissingError" ||
    error.message.includes("Auth session missing"));

type Position = { x: number; y: number };

type DragState = {
  magnetId: string;
  startClientX: number;
  startClientY: number;
  originX: number;
  originY: number;
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

export default function FridgePage() {
  const [magnets, setMagnets] = useState<Magnet[]>([]);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const positionsRef = useRef<Record<string, Position>>({});
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const savePosition = async (magnetId: string, position: Position) => {
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
      },
      { onConflict: "user_id,magnet_id" },
    );

    if (error) {
      throw error;
    }
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
          .select("id,name,photo_url,category,comment,place_name,created_at")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false });

        if (magnetError) {
          throw magnetError;
        }

        const fetchedMagnets = magnetData ?? [];
        setMagnets(fetchedMagnets);

        if (fetchedMagnets.length === 0) {
          setPositions({});
          return;
        }

        const ids = fetchedMagnets.map((magnet) => magnet.id);
        const { data: positionData, error: positionError } = await supabase
          .from("magnet_positions")
          .select("magnet_id,x,y")
          .eq("user_id", currentUser.id)
          .in("magnet_id", ids);

        if (positionError) {
          throw positionError;
        }

        const fromDb: Record<string, Position> = {};
        (positionData ?? []).forEach((row) => {
          fromDb[row.magnet_id] = { x: row.x, y: row.y };
        });

        const withDefaults: Record<string, Position> = {};
        fetchedMagnets.forEach((magnet, index) => {
          withDefaults[magnet.id] = fromDb[magnet.id] ?? getDefaultPosition(index);
        });
        setPositions(withDefaults);
      } catch (error: unknown) {
        toast.error("冷蔵庫データの取得に失敗しました。");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchFridgeData();
  }, []);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const board = boardRef.current;
      if (!board) {
        return;
      }
      const rect = board.getBoundingClientRect();
      const nextPosition = clampPosition(
        {
          x: dragState.originX + (event.clientX - dragState.startClientX),
          y: dragState.originY + (event.clientY - dragState.startClientY),
        },
        rect.width,
        rect.height,
      );

      setPositions((prev) => ({
        ...prev,
        [dragState.magnetId]: nextPosition,
      }));
    };

    const handlePointerUp = () => {
      const magnetId = dragState.magnetId;
      const position = positionsRef.current[magnetId];
      setDragState(null);

      if (!position) {
        return;
      }

      void savePosition(magnetId, position).catch((error: unknown) => {
        toast.error("配置の保存に失敗しました。");
        console.error(error);
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState]);

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">バーチャル冷蔵庫</h1>
        <p className="text-sm text-gray-600">
          マグネットをドラッグ&ドロップして、好きな位置に配置できます。
        </p>
      </header>

      {isLoading ? (
        <div className="rounded-[24px] bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600">読み込み中...</p>
        </div>
      ) : magnets.length === 0 ? (
        <div className="rounded-[24px] bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600">
            まだ投稿がありません。先にマグネットを登録してください。
          </p>
          <Link
            href="/magnet/new"
            className="mt-3 inline-flex min-h-11 items-center rounded-2xl bg-orange-100 px-4 text-sm font-semibold text-orange-700"
          >
            新規投稿へ
          </Link>
        </div>
      ) : (
        <div
          ref={boardRef}
          className="relative h-[60vh] overflow-hidden rounded-[24px] bg-linear-to-b from-slate-100 to-slate-200 p-4 shadow-lg"
        >
          {magnets.map((magnet) => {
            const position = positions[magnet.id] ?? { x: 0, y: 0 };
            const isDragging = dragState?.magnetId === magnet.id;

            return (
              <button
                key={magnet.id}
                type="button"
                onPointerDown={(event) => {
                  if (event.button !== 0) {
                    return;
                  }
                  event.preventDefault();
                  setDragState({
                    magnetId: magnet.id,
                    startClientX: event.clientX,
                    startClientY: event.clientY,
                    originX: position.x,
                    originY: position.y,
                  });
                }}
                className="absolute h-[72px] w-[112px] cursor-grab overflow-hidden rounded-2xl border border-orange-200 bg-white shadow"
                style={{
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  zIndex: isDragging ? 20 : 10,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={magnet.photo_url}
                  alt={magnet.name ?? "マグネット画像"}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-left text-[11px] font-semibold text-white">
                  {magnet.name ?? "名前未設定"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
