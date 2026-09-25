"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect /welcome → /dashboard
export default function WelcomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return null;
}
