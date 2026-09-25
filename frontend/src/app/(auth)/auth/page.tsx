"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LoginForm {
  email: string;
  password: string;
  remember: boolean;
}

interface RegisterForm {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: "LANDLORD" | "TENANT";
  agreeTerms: boolean;
}

type Tab = "login" | "register";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  primary: "#0F766E",
  primaryHover: "#115E59",
  primarySoft: "#CCFBF1",
  primarySofter: "#F0FDFA",
  canvas: "#F8FAFC",
  card: "#FFFFFF",
  cardMuted: "#F1F5F9",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  textHead: "#0F172A",
  textBody: "#334155",
  textMuted: "#64748B",
  textInverse: "#FFFFFF",
  success: "#059669",
  successSoft: "#D1FAE5",
  successBorder: "#A7F3D0",
  danger: "#DC2626",
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FECACA",
  shadowSm: "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
  shadowMd: "0 4px 6px rgba(15,23,42,0.06), 0 2px 4px rgba(15,23,42,0.04)",
  shadowFocus: "0 0 0 3px rgba(15,118,110,0.18)",
};

// ─── Validation helpers ───────────────────────────────────────────────────────
function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "" : "Email không hợp lệ";
}
function validatePassword(p: string) {
  if (p.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự";
  if (!/[A-Z]/.test(p)) return "Mật khẩu phải chứa ít nhất 1 chữ hoa";
  if (!/[0-9]/.test(p)) return "Mật khẩu phải chứa ít nhất 1 số";
  return "";
}
function validatePhone(phone: string) {
  return /^0[0-9]{9}$/.test(phone) ? "" : "Số điện thoại phải gồm 10 số bắt đầu bằng 0";
}

// ─── API helpers ─────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

async function apiLogin(data: LoginForm) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: data.email, password: data.password }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Đăng nhập thất bại");
  return json;
}

async function apiRegister(data: Omit<RegisterForm, "confirmPassword" | "agreeTerms">) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Đăng ký thất bại");
  return json;
}

async function apiGoogleLogin(idToken: string, role?: "LANDLORD" | "TENANT") {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(role ? { idToken, role } : { idToken }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Đăng nhập Google thất bại");
  return json;
}

// ─── Google Identity Services loader ──────────────────────────────────────────
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

let scriptLoaded = false;
let scriptLoading: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise((resolve, reject) => {
    if (typeof window === "undefined") { reject(new Error("window is not available")); return; }
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => { scriptLoaded = true; resolve(); });
      existing.addEventListener("error", () => reject(new Error("Không thể tải Google Identity Services")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => { scriptLoaded = true; resolve(); };
    script.onerror = () => reject(new Error("Không thể tải Google Identity Services"));
    document.head.appendChild(script);
  });
  return scriptLoading;
}

// ─── Icons ──────────────────────────────────────────────────────────────────────
const IconMail = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></svg>;
const IconLock = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
const IconUser = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const IconPhone = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
const IconEye = ({ open }: { open: boolean }) => open ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
const IconGoogle = () => <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" /><path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" /><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" /><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" /></svg>;
const IconCheck = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;

const Logo = ({ size = 36 }: { size?: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="9" fill={T.primary} />
      <path d="M8 24V16L18 9L28 16V24H22V19H14V24H8Z" fill="white" />
    </svg>
    <span style={{ fontSize: 20, fontWeight: 700, color: T.textHead, letterSpacing: "-0.4px" }}>RoomRental</span>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function AuthPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // ── State (Hooks phải đứng trên cùng, không sau early return) ────────────
  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [loginData, setLoginData] = useState<LoginForm>({ email: "", password: "", remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState<Partial<Record<keyof LoginForm, string>>>({});

  const [registerData, setRegisterData] = useState<RegisterForm>({
    fullName: "", email: "", phone: "", password: "", confirmPassword: "", role: "TENANT", agreeTerms: false,
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [registerErrors, setRegisterErrors] = useState<Partial<Record<keyof RegisterForm, string>>>({});

  // ── Redirect if already logged in ─────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  // ── Early returns (sau khi đã gọi tất cả hooks) ──────────────────────────
  if (isLoading) return null;
  if (isAuthenticated) return null;

  // ── Login ────────────────────────────────────────────────────────────────
  function handleLoginChange(field: keyof LoginForm, value: string | boolean) {
    setLoginData((prev) => ({ ...prev, [field]: value }));
    if (loginErrors[field]) setLoginErrors((prev) => ({ ...prev, [field]: "" }));
    setErrorMsg("");
  }

  function validateLogin() {
    const errs: Partial<Record<keyof LoginForm, string>> = {};
    if (!loginData.email) errs.email = "Email không được để trống";
    else if (validateEmail(loginData.email)) errs.email = validateEmail(loginData.email);
    if (!loginData.password) errs.password = "Mật khẩu không được để trống";
    setLoginErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!validateLogin()) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await apiLogin(loginData);
      login(res.data, loginData.remember);
      setSuccessMsg("Đăng nhập thành công! Đang chuyển hướng...");
      setTimeout(() => (window.location.href = "/dashboard"), 1200);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  // ── Register ──────────────────────────────────────────────────────────────
  function handleRegisterChange(field: keyof RegisterForm, value: string | boolean) {
    setRegisterData((prev) => ({ ...prev, [field]: value }));
    if (registerErrors[field]) setRegisterErrors((prev) => ({ ...prev, [field]: "" }));
    setErrorMsg("");
  }

  function validateRegister() {
    const errs: Partial<Record<keyof RegisterForm, string>> = {};
    if (!registerData.fullName.trim()) errs.fullName = "Họ tên không được để trống";
    if (!registerData.email) errs.email = "Email không được để trống";
    else if (validateEmail(registerData.email)) errs.email = validateEmail(registerData.email);
    if (!registerData.phone) errs.phone = "Số điện thoại không được để trống";
    else if (validatePhone(registerData.phone)) errs.phone = validatePhone(registerData.phone);
    if (!registerData.password) errs.password = "Mật khẩu không được để trống";
    else if (validatePassword(registerData.password)) errs.password = validatePassword(registerData.password);
    if (!registerData.confirmPassword) errs.confirmPassword = "Vui lòng xác nhận mật khẩu";
    else if (registerData.password !== registerData.confirmPassword) errs.confirmPassword = "Mật khẩu xác nhận không khớp";
    if (!registerData.agreeTerms) errs.agreeTerms = "Bạn phải đồng ý với điều khoản sử dụng";
    setRegisterErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!validateRegister()) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const { confirmPassword, agreeTerms, ...payload } = registerData;
      await apiRegister(payload);
      setSuccessMsg("Đăng ký thành công! Đang chuyển đến đăng nhập...");
      setTimeout(() => {
        setSuccessMsg("");
        setTab("login");
        setLoginData((prev) => ({ ...prev, email: registerData.email }));
      }, 1500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────
  async function handleGoogleCredential(credential: string, role?: "LANDLORD" | "TENANT") {
    try {
      const res = await apiGoogleLogin(credential, role);
      login(res.data, false);
      setSuccessMsg("Đăng nhập bằng Google thành công! Đang chuyển hướng...");
      setTimeout(() => (window.location.href = "/dashboard"), 1200);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Đăng nhập Google thất bại");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    if (!GOOGLE_CLIENT_ID) { setErrorMsg("Chưa cấu hình Google OAuth. Vui lòng đặt NEXT_PUBLIC_GOOGLE_CLIENT_ID."); return; }
    setErrorMsg(""); setSuccessMsg(""); setLoading(true);
    loadGoogleScript()
      .then(() => {
        if (!window.google?.accounts?.id) throw new Error("Google Identity Services chưa sẵn sàng");
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => { handleGoogleCredential(response.credential, "TENANT"); },
        });
        window.google.accounts.id.prompt();
      })
      .catch((err) => { setErrorMsg(err instanceof Error ? err.message : "Lỗi Google OAuth"); setLoading(false); });
  }

  function handleGoogleRegister() {
    if (!GOOGLE_CLIENT_ID) { setErrorMsg("Chưa cấu hình Google OAuth."); return; }
    setErrorMsg(""); setSuccessMsg(""); setLoading(true);
    loadGoogleScript()
      .then(() => {
        if (!window.google?.accounts?.id) throw new Error("Google Identity Services chưa sẵn sàng");
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => { handleGoogleCredential(response.credential, registerData.role); },
        });
        window.google.accounts.id.prompt();
      })
      .catch((err) => { setErrorMsg(err instanceof Error ? err.message : "Lỗi Google OAuth"); setLoading(false); });
  }

  // ── Shared styles ────────────────────────────────────────────────────────────
  const inputWrapBase: React.CSSProperties = {
    position: "relative", display: "flex", alignItems: "center",
    backgroundColor: T.card,
    borderWidth: 1, borderStyle: "solid", borderColor: T.border,
    borderRadius: 10,
    transition: "border-color 0.2s, box-shadow 0.2s",
  };
  const inputWrapError: React.CSSProperties = { borderColor: T.danger };
  const inputWrapFocused: React.CSSProperties = { borderColor: T.primary, boxShadow: T.shadowFocus };
  const inputIconBase: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "0 12px", color: T.textMuted, flexShrink: 0,
  };

  return (
    <div style={styles.root}>
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <div style={styles.container}>
        <div style={styles.brandWrap}><Logo /></div>

        <div style={styles.heading}>
          <h1 style={styles.title}>{tab === "login" ? "Chào mừng bạn quay lại" : "Tạo tài khoản mới"}</h1>
          <p style={styles.subtitle}>{tab === "login" ? "Đăng nhập để tiếp tục quản lý phòng trọ" : "Bắt đầu hành trình thuê và cho thuê phòng trọ"}</p>
        </div>

        <div style={styles.card}>
          {/* Tab switcher */}
          <div style={styles.tabGroup}>
            <button type="button" onClick={() => { setTab("login"); setErrorMsg(""); setSuccessMsg(""); }}
              style={{ ...styles.tabBtn, ...(tab === "login" ? { backgroundColor: T.primary, color: T.textInverse, boxShadow: T.shadowSm } : { backgroundColor: "transparent", color: T.textMuted }) }}>
              Đăng nhập
            </button>
            <button type="button" onClick={() => { setTab("register"); setErrorMsg(""); setSuccessMsg(""); }}
              style={{ ...styles.tabBtn, ...(tab === "register" ? { backgroundColor: T.primary, color: T.textInverse, boxShadow: T.shadowSm } : { backgroundColor: "transparent", color: T.textMuted }) }}>
              Đăng ký
            </button>
          </div>

          {/* ── Login Form ─────────────────────────────────────────────── */}
          {tab === "login" && (
            <form style={styles.form} onSubmit={handleLogin} noValidate>
              {/* Email */}
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Email</label>
                <div style={{ ...inputWrapBase, ...(loginErrors.email ? inputWrapError : {}) }}>
                  <span style={inputIconBase}><IconMail /></span>
                  <input type="email" placeholder="email@example.com" value={loginData.email}
                    onChange={(e) => handleLoginChange("email", e.target.value)} style={styles.input} autoComplete="email" />
                </div>
                {loginErrors.email && <span style={styles.fieldError}>{loginErrors.email}</span>}
              </div>

              {/* Password */}
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Mật khẩu</label>
                <div style={{ ...inputWrapBase, ...(loginErrors.password ? inputWrapError : {}) }}>
                  <span style={inputIconBase}><IconLock /></span>
                  <input type={showPassword ? "text" : "password"} placeholder="Nhập mật khẩu" value={loginData.password}
                    onChange={(e) => handleLoginChange("password", e.target.value)}
                    style={{ ...styles.input, paddingRight: 44 }} autoComplete="current-password" />
                  <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword((v) => !v)} tabIndex={-1}><IconEye open={showPassword} /></button>
                </div>
                {loginErrors.password && <span style={styles.fieldError}>{loginErrors.password}</span>}
              </div>

              {/* Remember + Forgot */}
              <div style={styles.rowBetween}>
                <label style={styles.checkLabel}>
                  <input type="checkbox" checked={loginData.remember} onChange={(e) => handleLoginChange("remember", e.target.checked)} style={styles.checkbox} />
                  <span style={styles.checkText}>Ghi nhớ đăng nhập</span>
                </label>
              </div>

              {/* Messages */}
              {errorMsg && <div style={{ ...styles.alert, backgroundColor: T.dangerSoft, borderColor: T.dangerBorder, color: T.danger }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <span>{errorMsg}</span>
              </div>}
              {successMsg && <div style={{ ...styles.alert, backgroundColor: T.successSoft, borderColor: T.successBorder, color: T.success }}><IconCheck /><span>{successMsg}</span></div>}

              {/* Submit */}
              <button type="submit" style={{ ...styles.primaryBtn, backgroundColor: loading ? T.primaryHover : T.primary, cursor: loading ? "not-allowed" : "pointer" }} disabled={loading}>
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>

              {/* Divider */}
              <div style={styles.divider}>
                <div style={{ ...styles.dividerLine, backgroundColor: T.border }} />
                <span style={{ ...styles.dividerText, color: T.textMuted }}>Hoặc tiếp tục với</span>
                <div style={{ ...styles.dividerLine, backgroundColor: T.border }} />
              </div>

              {/* Google */}
              <button type="button" style={styles.socialBtn} onClick={handleGoogleLogin} disabled={loading}>
                <IconGoogle /><span>Đăng nhập với Google</span>
              </button>
            </form>
          )}

          {/* ── Register Form ───────────────────────────────────────────── */}
          {tab === "register" && (
            <form style={styles.form} onSubmit={handleRegister} noValidate>
              {/* Full Name */}
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Họ và tên</label>
                <div style={{ ...inputWrapBase, ...(registerErrors.fullName ? inputWrapError : {}) }}>
                  <span style={inputIconBase}><IconUser /></span>
                  <input type="text" placeholder="Nguyễn Văn A" value={registerData.fullName}
                    onChange={(e) => handleRegisterChange("fullName", e.target.value)} style={styles.input} autoComplete="name" />
                </div>
                {registerErrors.fullName && <span style={styles.fieldError}>{registerErrors.fullName}</span>}
              </div>

              {/* Email */}
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Email</label>
                <div style={{ ...inputWrapBase, ...(registerErrors.email ? inputWrapError : {}) }}>
                  <span style={inputIconBase}><IconMail /></span>
                  <input type="email" placeholder="email@example.com" value={registerData.email}
                    onChange={(e) => handleRegisterChange("email", e.target.value)} style={styles.input} autoComplete="email" />
                </div>
                {registerErrors.email && <span style={styles.fieldError}>{registerErrors.email}</span>}
              </div>

              {/* Phone */}
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Số điện thoại</label>
                <div style={{ ...inputWrapBase, ...(registerErrors.phone ? inputWrapError : {}) }}>
                  <span style={inputIconBase}><IconPhone /></span>
                  <input type="tel" placeholder="0912345678" value={registerData.phone}
                    onChange={(e) => handleRegisterChange("phone", e.target.value)} style={styles.input} autoComplete="tel" />
                </div>
                {registerErrors.phone && <span style={styles.fieldError}>{registerErrors.phone}</span>}
              </div>

              {/* Password */}
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Mật khẩu</label>
                <div style={{ ...inputWrapBase, ...(registerErrors.password ? inputWrapError : {}) }}>
                  <span style={inputIconBase}><IconLock /></span>
                  <input type={showRegPassword ? "text" : "password"} placeholder="Ít nhất 8 ký tự, 1 chữ hoa, 1 số" value={registerData.password}
                    onChange={(e) => handleRegisterChange("password", e.target.value)}
                    style={{ ...styles.input, paddingRight: 44 }} autoComplete="new-password" />
                  <button type="button" style={styles.eyeBtn} onClick={() => setShowRegPassword((v) => !v)} tabIndex={-1}><IconEye open={showRegPassword} /></button>
                </div>
                {registerErrors.password && <span style={styles.fieldError}>{registerErrors.password}</span>}
              </div>

              {/* Confirm Password */}
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Xác nhận mật khẩu</label>
                <div style={{ ...inputWrapBase, ...(registerErrors.confirmPassword ? inputWrapError : {}) }}>
                  <span style={inputIconBase}><IconLock /></span>
                  <input type={showRegConfirm ? "text" : "password"} placeholder="Nhập lại mật khẩu" value={registerData.confirmPassword}
                    onChange={(e) => handleRegisterChange("confirmPassword", e.target.value)}
                    style={{ ...styles.input, paddingRight: 44 }} autoComplete="new-password" />
                  <button type="button" style={styles.eyeBtn} onClick={() => setShowRegConfirm((v) => !v)} tabIndex={-1}><IconEye open={showRegConfirm} /></button>
                </div>
                {registerErrors.confirmPassword && <span style={styles.fieldError}>{registerErrors.confirmPassword}</span>}
              </div>

              {/* Role */}
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Bạn là</label>
                <div style={styles.radioGroup}>
                  <label style={{ ...styles.radioLabel, ...(registerData.role === "TENANT" ? { borderColor: T.primary, backgroundColor: T.primarySoft } : {}) }}>
                    <input type="radio" name="role" value="TENANT" checked={registerData.role === "TENANT"} onChange={() => handleRegisterChange("role", "TENANT")} style={styles.radioInput} />
                    <span style={{ ...styles.radioText, color: registerData.role === "TENANT" ? T.primary : T.textBody }}>Người thuê nhà</span>
                  </label>
                  <label style={{ ...styles.radioLabel, ...(registerData.role === "LANDLORD" ? { borderColor: T.primary, backgroundColor: T.primarySoft } : {}) }}>
                    <input type="radio" name="role" value="LANDLORD" checked={registerData.role === "LANDLORD"} onChange={() => handleRegisterChange("role", "LANDLORD")} style={styles.radioInput} />
                    <span style={{ ...styles.radioText, color: registerData.role === "LANDLORD" ? T.primary : T.textBody }}>Chủ nhà / Cho thuê</span>
                  </label>
                </div>
              </div>

              {/* Terms */}
              <div style={styles.fieldWrap}>
                <label style={{ ...styles.checkLabel, cursor: "pointer" }}>
                  <input type="checkbox" checked={registerData.agreeTerms} onChange={(e) => handleRegisterChange("agreeTerms", e.target.checked)} style={styles.checkbox} />
                  <span style={{ ...styles.checkText, color: registerErrors.agreeTerms ? T.danger : T.textMuted }}>
                    Tôi đồng ý với <span style={{ color: T.primary, textDecoration: "underline", fontWeight: 500 }}>Điều khoản dịch vụ</span> và <span style={{ color: T.primary, textDecoration: "underline", fontWeight: 500 }}>Chính sách bảo mật</span>
                  </span>
                </label>
                {registerErrors.agreeTerms && <span style={styles.fieldError}>{registerErrors.agreeTerms}</span>}
              </div>

              {/* Messages */}
              {errorMsg && <div style={{ ...styles.alert, backgroundColor: T.dangerSoft, borderColor: T.dangerBorder, color: T.danger }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <span>{errorMsg}</span>
              </div>}
              {successMsg && <div style={{ ...styles.alert, backgroundColor: T.successSoft, borderColor: T.successBorder, color: T.success }}><IconCheck /><span>{successMsg}</span></div>}

              {/* Submit */}
              <button type="submit" style={{ ...styles.primaryBtn, backgroundColor: loading ? T.primaryHover : T.primary, cursor: loading ? "not-allowed" : "pointer" }} disabled={loading}>
                {loading ? "Đang đăng ký..." : "Tạo tài khoản"}
              </button>

              {/* Divider */}
              <div style={styles.divider}>
                <div style={{ ...styles.dividerLine, backgroundColor: T.border }} />
                <span style={{ ...styles.dividerText, color: T.textMuted }}>Hoặc đăng ký với</span>
                <div style={{ ...styles.dividerLine, backgroundColor: T.border }} />
              </div>

              <button type="button" style={styles.socialBtn} onClick={handleGoogleRegister} disabled={loading}>
                <IconGoogle /><span>Đăng ký với Google</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p style={styles.footer}>
          {tab === "login" ? (
            <>Chưa có tài khoản? <button type="button" style={{ ...styles.footerLink, color: T.primary }} onClick={() => setTab("register")}>Đăng ký ngay</button></>
          ) : (
            <>Đã có tài khoản? <button type="button" style={{ ...styles.footerLink, color: T.primary }} onClick={() => setTab("login")}>Đăng nhập</button></>
          )}
        </p>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", backgroundColor: T.canvas, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px", boxSizing: "border-box", position: "relative", overflow: "hidden" },
  blob1: { position: "absolute", top: "-15%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${T.primarySoft} 0%, transparent 70%)`, pointerEvents: "none", opacity: 0.6 },
  blob2: { position: "absolute", bottom: "-20%", left: "-15%", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${T.primarySofter} 0%, transparent 70%)`, pointerEvents: "none", opacity: 0.5 },
  container: { width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1 },
  brandWrap: { marginBottom: 28 },
  heading: { textAlign: "center", marginBottom: 24, width: "100%" },
  title: { fontSize: 26, fontWeight: 700, color: T.textHead, margin: 0, marginBottom: 8, lineHeight: 1.2, letterSpacing: "-0.5px" },
  subtitle: { fontSize: 14, color: T.textMuted, margin: 0, lineHeight: 1.5 },
  card: { width: "100%", backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28, boxShadow: T.shadowMd, boxSizing: "border-box" },
  tabGroup: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 4, backgroundColor: T.canvas, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 24 },
  tabBtn: { padding: "10px 14px", border: "none", borderRadius: 7, fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "all 0.2s ease", fontFamily: "inherit" },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  fieldWrap: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: T.textBody },
  input: { flex: 1, border: "none", outline: "none", background: "transparent", padding: "12px 14px", fontSize: 14, color: T.textHead, fontFamily: "inherit", boxSizing: "border-box", minWidth: 0 },
  eyeBtn: { background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: "0 12px", display: "flex", alignItems: "center" },
  fieldError: { fontSize: 12, color: T.danger },
  rowBetween: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  checkLabel: { display: "flex", alignItems: "flex-start", gap: 8 },
  checkbox: { width: 16, height: 16, accentColor: T.primary, cursor: "pointer", flexShrink: 0, marginTop: 1 },
  checkText: { fontSize: 13, userSelect: "none", lineHeight: 1.4 },
  alert: { padding: "10px 14px", borderRadius: 8, border: "1px solid", fontSize: 13, display: "flex", alignItems: "center", gap: 8 },
  radioGroup: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  radioLabel: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 12px", borderWidth: 1, borderStyle: "solid", borderColor: T.border, borderRadius: 10, cursor: "pointer", backgroundColor: T.card, transition: "all 0.2s", userSelect: "none" },
  radioInput: { display: "none" },
  radioText: { fontSize: 13, fontWeight: 500 },
  primaryBtn: { width: "100%", padding: "12px 20px", color: T.textInverse, border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "background-color 0.2s, transform 0.05s", marginTop: 4, fontFamily: "inherit" },
  divider: { display: "flex", alignItems: "center", gap: 12, margin: "4px 0" },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: 500 },
  socialBtn: { width: "100%", padding: "11px 16px", backgroundColor: T.card, color: T.textHead, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "background-color 0.2s, border-color 0.2s", fontFamily: "inherit" },
  footer: { fontSize: 13, color: T.textMuted, margin: 0, marginTop: 20, textAlign: "center" },
  footerLink: { background: "none", border: "none", fontSize: 13, cursor: "pointer", fontWeight: 600, padding: 0, fontFamily: "inherit", textDecoration: "none" },
};
