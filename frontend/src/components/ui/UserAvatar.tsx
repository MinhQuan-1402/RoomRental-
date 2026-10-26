"use client";

import { useState } from "react";

export default function UserAvatar({ name, src, className }: { name?: string; src?: string | null; className?: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.[0] ?? "U";
  return <span className={className} style={{ position: "relative", overflow: "hidden", flexShrink: 0 }} aria-hidden="true">
    {initials.toUpperCase()}
    {src && src !== failedSource && <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailedSource(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}/>}
  </span>;
}
