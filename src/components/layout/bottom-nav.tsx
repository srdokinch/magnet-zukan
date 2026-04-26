"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const navItems: NavItem[] = [
  { href: "/fridge", label: "冷蔵庫", icon: "🧲" },
  { href: "/", label: "図鑑", icon: "📚" },
  { href: "/magnet/new", label: "投稿", icon: "＋" },
  { href: "/map", label: "マップ", icon: "🗾" },
  { href: "/stats", label: "統計", icon: "📊" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="ボトムナビゲーション"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-orange-100 bg-white/95 px-2 py-2 backdrop-blur"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const isPrimary = item.href === "/magnet/new";

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex min-h-11 min-w-11 flex-col items-center justify-center rounded-2xl px-1 py-1 text-xs font-semibold transition ${
                  isPrimary
                    ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                    : isActive
                      ? "bg-orange-100 text-orange-600"
                      : "text-gray-500"
                }`}
              >
                <span aria-hidden className="text-base leading-none">
                  {item.icon}
                </span>
                <span className="mt-1">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
