"use client";

import React, { useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import {
  CreatePropertyPayload,
  UpdatePropertyPayload,
} from "@/types/property";

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface PropertyFormValues {
  name: string;
  address: string;
  description: string;
}

interface PropertyFormProps {
  initialValues?: PropertyFormValues;
  submitLabel: string;
  onSubmit: (data: CreatePropertyPayload | UpdatePropertyPayload) => Promise<void> | void;
  onCancel?: () => void;
}

const emptyValues: PropertyFormValues = { name: "", address: "", description: "" };

// ─── Component ─────────────────────────────────────────────────────────────────
export default function PropertyForm({
  initialValues = emptyValues,
  submitLabel,
  onSubmit,
  onCancel,
}: PropertyFormProps) {
  const [values, setValues] = useState<PropertyFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof PropertyFormValues, value: string) =>
    setValues((v) => ({ ...v, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.name.trim() || values.name.trim().length < 2) {
      setError("Tên khu trọ tối thiểu 2 ký tự");
      return;
    }
    if (!values.address.trim() || values.address.trim().length < 5) {
      setError("Địa chỉ tối thiểu 5 ký tự");
      return;
    }
    if (values.description.length > 1000) {
      setError("Mô tả tối đa 1000 ký tự");
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreatePropertyPayload | UpdatePropertyPayload = {
        name: values.name.trim(),
        address: values.address.trim(),
        description: values.description.trim() || undefined,
      };
      await onSubmit(payload);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {error && <div style={styles.errorBox}>⚠️ {error}</div>}

      <Field
        label="Tên khu trọ"
        required
        value={values.name}
        onChange={(v) => update("name", v)}
        placeholder="VD: Sunrise House"
        maxLength={255}
      />

      <Field
        label="Địa chỉ"
        required
        value={values.address}
        onChange={(v) => update("address", v)}
        placeholder="VD: 123 Nguyễn Văn Cừ, Long Biên, Hà Nội"
        maxLength={500}
      />

      <Field
        label="Mô tả"
        value={values.description}
        onChange={(v) => update("description", v)}
        placeholder="Mô tả ngắn về khu trọ (tiện ích, vị trí, ...)"
        multiline
        maxLength={1000}
        hint={`${values.description.length}/1000 ký tự`}
      />

      <div style={styles.actions}>
        {onCancel && (
          <button type="button" onClick={onCancel} style={styles.btnGhost} disabled={submitting}>
            Hủy
          </button>
        )}
        <button type="submit" style={styles.btnPrimary} disabled={submitting}>
          {submitting ? "Đang lưu..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── Field ─────────────────────────────────────────────────────────────────────
function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
  multiline,
  maxLength,
  hint,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  hint?: string;
}) {
  const id = `field-${label}`;
  return (
    <div style={styles.field}>
      <label htmlFor={id} style={styles.label}>
        {label}
        {required && <span style={styles.required}> *</span>}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={4}
          style={{ ...styles.input, ...styles.textarea }}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          style={styles.input}
        />
      )}
      {hint && <span style={styles.hint}>{hint}</span>}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 18 },
  errorBox: {
    padding: "10px 14px",
    backgroundColor: "var(--status-danger-soft)",
    color: "var(--status-danger)",
    borderRadius: 8,
    fontSize: 13,
    border: "1px solid var(--status-danger-border)",
  },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "var(--text-body)" },
  required: { color: "var(--status-danger)" },
  input: {
    padding: "10px 12px",
    border: "1px solid var(--border-default)",
    borderRadius: 8,
    fontSize: 14,
    color: "var(--text-heading)",
    backgroundColor: "var(--surface-card)",
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  textarea: {
    resize: "vertical",
    minHeight: 80,
    lineHeight: 1.5,
  },
  hint: { fontSize: 11, color: "var(--text-label)", alignSelf: "flex-end" },
  actions: { display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 },
  btnPrimary: {
    padding: "10px 22px",
    backgroundColor: "var(--brand-primary)",
    color: "var(--text-inverse)",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnGhost: {
    padding: "10px 18px",
    backgroundColor: "transparent",
    color: "var(--text-body)",
    border: "1px solid var(--border-default)",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};
