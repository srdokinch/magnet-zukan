"use client";

import { ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type AuthGuardProps = {
  children: ReactNode;
};

const isAuthSessionMissingError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AuthSessionMissingError" ||
    error.message.includes("Auth session missing"));

export function AuthGuard({ children }: AuthGuardProps) {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const ensureSession = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error && !isAuthSessionMissingError(error)) {
        toast.error("認証状態の確認に失敗しました。");
        console.error(error);
      }

      if (!user) {
        const { error: anonymousError } = await supabase.auth.signInAnonymously();

        if (anonymousError) {
          toast.error("利用開始に失敗しました。時間をおいて再実行してください。");
          console.error(anonymousError);
          if (isMounted) {
            setIsChecking(false);
          }
          return;
        }
      }

      if (isMounted) {
        setIsChecking(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        void supabase.auth.signInAnonymously();
      }
    });

    void ensureSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-sm text-gray-600">
        認証状態を確認しています...
      </div>
    );
  }

  return <>{children}</>;
}
