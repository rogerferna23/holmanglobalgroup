"use client";

// Store local del panel admin basado en localStorage.
// IMPORTANTE: estos datos viven en el navegador del usuario. Para multi-dispositivo
// y persistencia real, conectar una base de datos (Vercel KV / Supabase / Postgres).

import { useEffect, useState } from "react";

export type ManualSale = {
  id: string;
  date: string; // YYYY-MM-DD
  serviceId: string;
  serviceTitle: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  origin: string; // "Directo" | "Instagram" | etc.
  notes?: string;
  amount: number; // USD
  status: "Aprobado" | "Pendiente" | "Cancelado";
};

export type Expense = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // USD
  category?: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "super" | "admin" | "vendor";
  // password se guarda solo client-side por ahora — en produccion va hasheada en BD.
  password?: string;
  isOwner?: boolean; // true para el admin creado via env vars
};

export type Vendor = {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  phone: string;
  email?: string;
  active: boolean;
};

export type ApprovalRequest = {
  id: string;
  type: "manual_sale" | "vendor" | "transaction";
  createdAt: string;
  payload: Record<string, unknown>;
  status: "pendiente" | "aprobado" | "rechazado";
};

const KEYS = {
  sales: "hgg_admin_manual_sales",
  expenses: "hgg_admin_expenses",
  admins: "hgg_admin_users",
  vendors: "hgg_admin_vendors",
  requests: "hgg_admin_requests",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Notificar a otros hooks suscritos al mismo key.
    window.dispatchEvent(new CustomEvent("hgg-store-change", { detail: { key } }));
  } catch {
    // ignore (storage lleno / private mode)
  }
}

function useStoredList<T>(key: string): [T[], (next: T[]) => void] {
  const [list, setList] = useState<T[]>(() => read<T[]>(key, []));

  useEffect(() => {
    const onChange = (e: Event) => {
      const ev = e as CustomEvent<{ key: string }>;
      if (ev.detail?.key === key) setList(read<T[]>(key, []));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setList(read<T[]>(key, []));
    };
    window.addEventListener("hgg-store-change", onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("hgg-store-change", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [key]);

  const update = (next: T[]) => {
    setList(next);
    write(key, next);
  };
  return [list, update];
}

// Hooks publicos
export function useManualSales() {
  return useStoredList<ManualSale>(KEYS.sales);
}
export function useExpenses() {
  return useStoredList<Expense>(KEYS.expenses);
}
export function useVendors() {
  return useStoredList<Vendor>(KEYS.vendors);
}
export function useRequests() {
  return useStoredList<ApprovalRequest>(KEYS.requests);
}
export function useAdminUsers() {
  return useStoredList<AdminUser>(KEYS.admins);
}

// Utilidades
export function newId(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function formatMoneyUSD(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function monthIndex(dateISO: string): number {
  // 0..11
  const d = new Date(dateISO + "T00:00:00");
  return Number.isFinite(d.getTime()) ? d.getMonth() : 0;
}

export function yearOf(dateISO: string): number {
  const d = new Date(dateISO + "T00:00:00");
  return Number.isFinite(d.getTime()) ? d.getFullYear() : new Date().getFullYear();
}
