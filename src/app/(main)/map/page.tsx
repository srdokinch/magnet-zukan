"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ConquestMarker } from "@/components/map/conquest-leaflet-map";
import { supabase } from "@/lib/supabase";

const isAuthSessionMissingError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AuthSessionMissingError" ||
    error.message.includes("Auth session missing"));

const ConquestLeafletMap = dynamic(
  () =>
    import("@/components/map/conquest-leaflet-map").then(
      (m) => m.ConquestLeafletMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(55vh,420px)] items-center justify-center rounded-2xl bg-orange-50 text-sm text-gray-600">
        地図を読み込み中...
      </div>
    ),
  },
);

type MagnetMapRow = {
  id: string;
  name: string | null;
  place_name: string | null;
  photo_url: string;
  latitude: number | null;
  longitude: number | null;
};

const MAX_NOMINATIM_REQUESTS = 15;
const NOMINATIM_DELAY_MS = 1100;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export default function MapPage() {
  const [rows, setRows] = useState<MagnetMapRow[]>([]);
  const [geocodeByPlace, setGeocodeByPlace] = useState<
    Record<string, { lat: number; lng: number }>
  >({});
  const [isLoadingMagnets, setIsLoadingMagnets] = useState(true);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState(false);
  const [skippedPlaces, setSkippedPlaces] = useState<Set<string>>(
    () => new Set(),
  );

  const runGeocode = useCallback(
    async (uniquePlaces: string[], signal: AbortSignal) => {
      if (uniquePlaces.length === 0) {
        setSkippedPlaces(new Set());
        setGeocodeByPlace({});
        return;
      }
      setIsGeocoding(true);
      setGeocodeError(false);
      const next: Record<string, { lat: number; lng: number }> = {};
      const sorted = [...uniquePlaces].sort();
      const limited = sorted.slice(0, MAX_NOMINATIM_REQUESTS);
      if (!signal.aborted) {
        setSkippedPlaces(new Set(sorted.slice(MAX_NOMINATIM_REQUESTS)));
      }

      try {
        for (let i = 0; i < limited.length; i += 1) {
          if (signal.aborted) {
            return;
          }
          if (i > 0) {
            await sleep(NOMINATIM_DELAY_MS);
          }
          const place = limited[i];
          const res = await fetch(
            `/api/geocode?q=${encodeURIComponent(place)}`,
            { signal },
          );
          if (!res.ok) {
            setGeocodeError(true);
            continue;
          }
          const data = (await res.json()) as {
            lat: number | null;
            lng: number | null;
          };
          if (data.lat != null && data.lng != null) {
            next[place] = { lat: data.lat, lng: data.lng };
          }
        }
        if (!signal.aborted) {
          setGeocodeByPlace(next);
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        setGeocodeError(true);
        console.error(e);
      } finally {
        if (!signal.aborted) {
          setIsGeocoding(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const ac = new AbortController();

    const load = async () => {
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
          setRows([]);
          return;
        }

        const { data, error } = await supabase
          .from("magnets")
          .select("id,name,place_name,photo_url,latitude,longitude")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        const list = (data ?? []) as MagnetMapRow[];
        setRows(list);

        const needGeocode = new Set<string>();
        for (const r of list) {
          const hasDb =
            r.latitude != null &&
            r.longitude != null &&
            Number.isFinite(r.latitude) &&
            Number.isFinite(r.longitude);
          if (hasDb) {
            continue;
          }
          const p = r.place_name?.trim();
          if (p) {
            needGeocode.add(p);
          }
        }
        await runGeocode([...needGeocode], ac.signal);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        toast.error("マグネット情報の取得に失敗しました。");
        console.error(error);
        setRows([]);
      } finally {
        if (!ac.signal.aborted) {
          setIsLoadingMagnets(false);
        }
      }
    };

    void load();
    return () => ac.abort();
  }, [runGeocode]);

  const { markers, notOnMap } = useMemo(() => {
    const markersOut: ConquestMarker[] = [];
    const notOnMapOut: { id: string; name: string; reason: string }[] = [];

    for (const r of rows) {
      const title = r.name?.trim() || "名前未設定のマグネット";
      const hasDb =
        r.latitude != null &&
        r.longitude != null &&
        Number.isFinite(r.latitude) &&
        Number.isFinite(r.longitude);

      if (hasDb) {
        markersOut.push({
          id: r.id,
          title,
          placeLabel: r.place_name,
          photoUrl: r.photo_url,
          lat: r.latitude as number,
          lng: r.longitude as number,
          source: "db",
        });
        continue;
      }

      const place = r.place_name?.trim();
      if (place && geocodeByPlace[place]) {
        const g = geocodeByPlace[place];
        markersOut.push({
          id: r.id,
          title,
          placeLabel: r.place_name,
          photoUrl: r.photo_url,
          lat: g.lat,
          lng: g.lng,
          source: "geocoded",
        });
        continue;
      }

      if (!place) {
        notOnMapOut.push({
          id: r.id,
          name: title,
          reason: "購入場所が未入力です",
        });
      } else if (skippedPlaces.has(place)) {
        notOnMapOut.push({
          id: r.id,
          name: title,
          reason: `推定できる場所は最大${MAX_NOMINATIM_REQUESTS}件までのため、今回は地図に含めていません`,
        });
      } else if (!geocodeByPlace[place] && isGeocoding) {
        /* 推定待ち: 一覧には出さない */
      } else if (!geocodeByPlace[place]) {
        notOnMapOut.push({
          id: r.id,
          name: title,
          reason:
            geocodeError && Object.keys(geocodeByPlace).length === 0
              ? "位置の検索に失敗しました"
              : "地図に表示できる位置が見つかりませんでした",
        });
      }
    }

    return { markers: markersOut, notOnMap: notOnMapOut };
  }, [
    rows,
    geocodeByPlace,
    isGeocoding,
    geocodeError,
    skippedPlaces,
  ]);

  const showGeocodeWaitList =
    isGeocoding &&
    rows.some((r) => {
      const hasDb =
        r.latitude != null &&
        r.longitude != null &&
        Number.isFinite(r.latitude) &&
        Number.isFinite(r.longitude);
      return !hasDb && Boolean(r.place_name?.trim());
    });

  return (
    <section className="space-y-4">
      <header className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-orange-600">あなたの制覇記録</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">制覇マップ</h1>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          緯度・経度が保存されているマグネットはその位置にピンを表示します。
          購入場所の名前のみの場合は、サーバー経由で位置を推定します（
          <a
            href="https://nominatim.openstreetmap.org/"
            className="text-orange-600 underline"
            target="_blank"
            rel="noreferrer"
          >
            Nominatim
          </a>
          ／利用間隔の都合上、同一セッションで推定する場所は最大
          {MAX_NOMINATIM_REQUESTS}件まで）。
        </p>
      </header>

      {isLoadingMagnets ? (
        <div className="rounded-[24px] bg-white p-6 text-center text-gray-500 shadow-sm">
          読み込み中...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-orange-200 bg-white p-6 text-center text-gray-500">
          まだマグネットがありません。
          <br />
          投稿で場所やメモを残すと、ここに反映されます。
        </div>
      ) : (
        <>
          {showGeocodeWaitList ? (
            <p className="rounded-2xl bg-orange-100 px-4 py-3 text-center text-sm text-orange-900">
              場所名から位置を検索しています…（少し時間がかかることがあります）
            </p>
          ) : null}

          <div className="overflow-hidden rounded-[24px] bg-white p-3 shadow-sm ring-1 ring-orange-100">
            <ConquestLeafletMap markers={markers} />
          </div>

          {markers.length === 0 && !showGeocodeWaitList ? (
            <p className="text-center text-sm text-gray-600">
              地図に表示できるマグネットがありません。投稿で「購入場所」を入力するか、後から緯度経度の保存に対応したときにピンが立ちます。
            </p>
          ) : null}

          {notOnMap.length > 0 && !showGeocodeWaitList ? (
            <div className="rounded-[24px] bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-gray-900">
                地図に出ていないマグネット（{notOnMap.length}件）
              </h2>
              <ul className="mt-3 space-y-2">
                {notOnMap.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-1 rounded-2xl bg-orange-50/80 px-4 py-3 text-sm"
                  >
                    <Link
                      href={`/magnet/${item.id}`}
                      className="font-semibold text-orange-700 underline-offset-2 hover:underline"
                    >
                      {item.name}
                    </Link>
                    <span className="text-gray-600">{item.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
