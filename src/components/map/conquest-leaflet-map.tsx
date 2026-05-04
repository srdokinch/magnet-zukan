"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

export type ConquestMarker = {
  id: string;
  title: string;
  placeLabel: string | null;
  photoUrl: string | null;
  lat: number;
  lng: number;
  source: "db" | "geocoded";
};

type ConquestLeafletMapProps = {
  markers: ConquestMarker[];
};

const DEFAULT_CENTER: [number, number] = [36.5, 138.25];
const DEFAULT_ZOOM = 5;

export function ConquestLeafletMap({ markers }: ConquestLeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !containerRef.current) {
        return;
      }

      const proto = L.Icon.Default.prototype as unknown as {
        _getIconUrl?: string;
      };
      delete proto._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(container).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      if (cancelled) {
        map.remove();
        return;
      }
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const markerLayer = L.layerGroup().addTo(map);

      for (const m of markers) {
        const marker = L.marker([m.lat, m.lng]).addTo(markerLayer);
        const place =
          m.placeLabel?.trim() ||
          (m.source === "db" ? "座標登録" : "場所名から推定");
        const img =
          m.photoUrl &&
          `<img src="${escapeAttr(m.photoUrl)}" alt="" class="mb-2 h-16 w-full rounded-lg object-cover" />`;
        marker.bindPopup(
          `<div class="min-w-[200px] max-w-[240px] font-sans text-sm">
            ${img ?? ""}
            <p class="font-bold text-gray-900">${escapeHtml(m.title)}</p>
            <p class="mt-1 text-gray-600">${escapeHtml(place)}</p>
            <p class="mt-2"><a href="/magnet/${escapeAttr(m.id)}" class="text-orange-600 underline">詳細を見る</a></p>
          </div>`,
        );
      }

      if (markers.length === 1) {
        map.setView([markers[0].lat, markers[0].lng], 10);
      } else if (markers.length > 1) {
        const bounds = L.latLngBounds(
          markers.map((m) => [m.lat, m.lng] as [number, number]),
        );
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [markers]);

  return <div ref={containerRef} className="h-[min(55vh,420px)] w-full rounded-2xl" />;
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replaceAll("'", "&#39;");
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
