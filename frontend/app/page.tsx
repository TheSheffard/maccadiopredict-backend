"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) router.replace(user ? "/dashboard" : "/login");
  }, [loading, router, user]);

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-6">
      <div className="text-center">
        <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-2 border-line border-t-crimson" />
        <p className="text-[14px] text-muted">Preparing CardioPredict…</p>
      </div>
    </main>
  );
}
