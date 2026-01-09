"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PoolPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main vocab page with pool tab
    router.replace("/app/vocab?tab=pool");
  }, [router]);

  return <div className="text-white/70">Przekierowuję do Całej puli…</div>;
}
