import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";

type MainLayoutProps = {
  children: ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-orange-50">
      <main className="flex-1 px-4 pb-24 pt-6">{children}</main>
      <BottomNav />
    </div>
  );
}
