"use client";

// Store del panel admin: ahora persiste en Supabase via API routes.
// Cada hook hace fetch al montar y expone {data, loading, error, create, remove, refresh}.
// Las mutaciones (create/remove) refrescan automaticamente.

import { useCallback, useEffect, useState } from "react";

export type ManualSale = {
  id: string;
  date: string;
  serviceId: string;
  serviceTitle: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  origin: string;
  notes?: string;
  amount: number;
  status: "Aprobado" | "Pendiente" | "Cancelado";
};

export type Expense = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "super" | "admin" | "vendor";
  password?: string;
  isOwner?: boolean;
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

// ============================================
// Hook generico
// ============================================
type UseListResult<T> = {
  data: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (item: Partial<T>) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  patch?: (id: string, payload: Partial<T>) => Promise<boolean>;
};

function useResource<T extends { id: string }>(
  endpoint: string,
  responseKey: string
): UseListResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const body = (await res.json()) as Record<string, T[]>;
      setData(body[responseKey] || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }, [endpoint, responseKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (item: Partial<T>) => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        await refresh();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error creando");
        return false;
      }
    },
    [endpoint, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        await refresh();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error eliminando");
        return false;
      }
    },
    [endpoint, refresh]
  );

  return { data, loading, error, refresh, create, remove };
}

// ============================================
// Hooks publicos
// ============================================
export function useManualSales() {
  return useResource<ManualSale>("/api/admin/sales", "sales");
}

export function useExpenses() {
  return useResource<Expense>("/api/admin/expenses", "expenses");
}

export function useVendors() {
  return useResource<Vendor>("/api/admin/vendors", "vendors");
}

export function useAdminUsers() {
  return useResource<AdminUser>("/api/admin/users", "users");
}

export function useRequests() {
  const base = useResource<ApprovalRequest>("/api/admin/requests", "requests");
  const patch = useCallback(
    async (id: string, payload: Partial<ApprovalRequest>) => {
      try {
        const res = await fetch(
          `/api/admin/requests?id=${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        await base.refresh();
        return true;
      } catch {
        return false;
      }
    },
    [base]
  );
  return { ...base, patch };
}

// ============================================
// Utilidades
// ============================================
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
  const d = new Date(dateISO + "T00:00:00");
  return Number.isFinite(d.getTime()) ? d.getMonth() : 0;
}

export function yearOf(dateISO: string): number {
  const d = new Date(dateISO + "T00:00:00");
  return Number.isFinite(d.getTime()) ? d.getFullYear() : new Date().getFullYear();
}
