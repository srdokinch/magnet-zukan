import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { BottomNav } from "@/components/layout/bottom-nav";

type MainLayoutProps = {
  children: ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <AuthGuard>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#fff8f6]">
        <main className="flex-1 px-5 pb-24 pt-6">{children}</main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
