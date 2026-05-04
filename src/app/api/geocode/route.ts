import { NextRequest, NextResponse } from "next/server";

/**
 * 場所名から緯度経度を取得（OpenStreetMap Nominatim）。
 * 利用ポリシー: https://operations.osmfoundation.org/policies/nominatim/
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length > 200) {
    return NextResponse.json({ error: "invalid q" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "magnet-zukan/1.0 (+https://github.com/srdokinch/magnet-zukan)",
        Accept: "application/json",
        "Accept-Language": "ja,en",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ lat: null, lng: null });
    }

    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ lat: null, lng: null });
    }

    const first = data[0] as { lat?: string; lon?: string };
    const lat = first.lat != null ? Number.parseFloat(first.lat) : NaN;
    const lng = first.lon != null ? Number.parseFloat(first.lon) : NaN;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ lat: null, lng: null });
    }

    return NextResponse.json({ lat, lng });
  } catch {
    return NextResponse.json({ lat: null, lng: null });
  }
}
