"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      await supabase.auth.signOut();
      router.push("/login");
    };
    run();
  }, [router]);

  return (
    <main className="min-h-screen p-8">
      <p>Wylogowuję…</p>
    </main>
  );
}
