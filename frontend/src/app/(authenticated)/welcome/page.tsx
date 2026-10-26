"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Preserve the previous account link for existing bookmarks.
export default function WelcomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/profile");
  }, [router]);

  return null;
}
