/**
 * Contracts API — frontend client for /api/contracts/* endpoints.
 * Handles metadata fetch and binary download/upload for the contract file.
 */

import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-context";

// ─── Types (mirror backend contracts.types.ts) ────────────────────────────────

export interface ContractFileInfo {
  contractId: number;
  fileName: string;
  fileMimeType: string;
  fileSize: number;
  fileVersion: number;
  fileUploadedAt: string; // ISO string from JSON
  downloadUrl: string;
}

export interface MyActiveContract {
  id: number;
  startDate: string;
  endDate: string;
  rentPrice: number;
  deposit: number;
  billingDay: number;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "TERMINATED";
  terms: string | null;
  room: {
    id: number;
    roomNumber: string;
    floor: number | null;
    area: number | null;
    description: string | null;
    address: string;
    status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
  };
  tenant: {
    id: number;
    fullName: string;
    phone: string;
    email: string | null;
  };
  fileName: string | null;
  fileMimeType: string | null;
  fileSize: number | null;
  fileVersion: number;
  fileUploadedAt: string | null;
}

// ─── API base resolution (mirror api-client.ts pattern) ───────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

// ─── Client ───────────────────────────────────────────────────────────────────

export const contractsApi = {
  /**
   * GET /api/contracts/my-active
   * Used by tenant dashboard.
   */
  getMyActive: () => api.get<MyActiveContract | null>("/contracts/my-active"),

  /**
   * GET /api/contracts/:id/file
   * Returns file info, or null if no file has been uploaded yet.
   */
  getFileInfo: (contractId: number) =>
    api.get<ContractFileInfo | null>(`/contracts/${contractId}/file`),

  /**
   * POST /api/contracts/:id/file (landlord only)
   * Uploads a PDF; replaces any previous version.
   */
  uploadFile: async (contractId: number, file: File): Promise<ContractFileInfo> => {
    const token = getAccessToken();
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`${API_BASE}/contracts/${contractId}/file`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw Object.assign(
        new Error(json.error?.message ?? "Upload thất bại"),
        { response: json, status: res.status }
      );
    }
    return json.data as ContractFileInfo;
  },

  /**
   * GET /api/contracts/:id/file/download
   * Returns a direct download URL the browser can navigate to.
   * Auth is handled by including the bearer token in the URL — for the
   * simplest UX, we use a hidden <a download> with the token in a header.
   * Here we just return the URL and rely on cookies / auth-aware fetch.
   *
   * For <a href={...}> usage, use `getAuthenticatedDownloadUrl()` below.
   */
  downloadUrl: (contractId: number) =>
    `${API_BASE}/contracts/${contractId}/file/download`,
};

/**
 * Build a fully-qualified authenticated URL.
 * Browser sends the Authorization header separately via fetch + Blob.
 * For pure navigation downloads, the simplest path is to use
 * downloadAsBlob() below.
 */
export async function downloadContractFile(contractId: number): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(
    `${API_BASE}/contracts/${contractId}/file/download`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  if (!res.ok) {
    let msg = "Tải file thất bại";
    try {
      const j = await res.json();
      msg = j.error?.message ?? msg;
    } catch {}
    throw new Error(msg);
  }

  // Try to get a friendly filename from Content-Disposition
  const dispo = res.headers.get("Content-Disposition") ?? "";
  const match = /filename\*=UTF-8''([^;]+)/i.exec(dispo);
  const fallbackMatch = /filename="([^"]+)"/i.exec(dispo);
  let filename = "hop-dong.pdf";
  if (match) {
    try {
      filename = decodeURIComponent(match[1]);
    } catch {}
  } else if (fallbackMatch) {
    filename = fallbackMatch[1];
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick so download has time to start
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}