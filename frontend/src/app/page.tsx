"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken")
        : null;

    if (token) {
      router.replace("/dashboard");
    } else {
      router.replace("/auth");
    }
  }, [router]);

  // Blank page while redirecting — avoids flash of wrong page
  return null;
}
