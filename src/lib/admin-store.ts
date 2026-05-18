// Store del panel admin que lee/escribe directamente a Supabase.
// La seguridad esta en las RLS policies de Supabase, NO en API routes.
// Solo admins autenticados (en la tabla `profiles`) pueden hacer estas operaciones.

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

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

export type Vendor = {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  phone: string;
  email?: string;
  active: boolean;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "super" | "admin" | "vendor";
  isOwner?: boolean;
};

export type ApprovalRequest = {
  id: string;
  type: "manual_sale" | "vendor" | "transaction";
  createdAt: string;
  payload: Record<string, unknown>;
  status: "pendiente" | "aprobado" | "rechazado";
};

// ============================================
// Helpers
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

// ============================================
// MANUAL SALES
// ============================================

export function useManualSales() {
  const [data, setData] = useState<ManualSale[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const sb = getSupabase();
    const { data: rows } = await sb
      .from("manual_sales")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    setData(
      (rows || []).map((r) => ({
        id: r.id,
        date: r.date,
        serviceId: r.service_id,
        serviceTitle: r.service_title,
        clientName: r.client_name,
        clientEmail: r.client_email,
        clientPhone: r.client_phone || "",
        origin: r.origin,
        notes: r.notes || "",
        amount: Number(r.amount),
        status: r.status,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (sale: ManualSale) => {
    const sb = getSupabase();
    const { error } = await sb.from("manual_sales").insert({
      id: sale.id,
      date: sale.date,
      service_id: sale.serviceId,
      service_title: sale.serviceTitle,
      client_name: sale.clientName,
      client_email: sale.clientEmail,
      client_phone: sale.clientPhone || null,
      origin: sale.origin,
      notes: sale.notes || null,
      amount: sale.amount,
      status: sale.status,
    });
    if (!error) await refresh();
    return { error: error?.message || null };
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const sb = getSupabase();
    const { error } = await sb.from("manual_sales").delete().eq("id", id);
    if (!error) await refresh();
    return { error: error?.message || null };
  }, [refresh]);

  return { data, loading, create, remove, refresh };
}

// ============================================
// EXPENSES
// ============================================

export function useExpenses() {
  const [data, setData] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const sb = getSupabase();
    const { data: rows } = await sb
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });
    setData(
      (rows || []).map((r) => ({
        id: r.id,
        date: r.date,
        description: r.description,
        amount: Number(r.amount),
        category: r.category || undefined,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (exp: Expense) => {
    const sb = getSupabase();
    const { error } = await sb.from("expenses").insert({
      id: exp.id,
      date: exp.date,
      description: exp.description,
      category: exp.category || null,
      amount: exp.amount,
    });
    if (!error) await refresh();
    return { error: error?.message || null };
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const sb = getSupabase();
    const { error } = await sb.from("expenses").delete().eq("id", id);
    if (!error) await refresh();
    return { error: error?.message || null };
  }, [refresh]);

  return { data, loading, create, remove, refresh };
}

// ============================================
// VENDORS
// ============================================

export function useVendors() {
  const [data, setData] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const sb = getSupabase();
    const { data: rows } = await sb
      .from("vendors")
      .select("*")
      .order("created_at", { ascending: false });
    setData((rows || []) as Vendor[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (v: Vendor) => {
    const sb = getSupabase();
    const { error } = await sb.from("vendors").insert(v);
    if (!error) await refresh();
    return { error: error?.message || null };
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const sb = getSupabase();
    const { error } = await sb.from("vendors").delete().eq("id", id);
    if (!error) await refresh();
    return { error: error?.message || null };
  }, [refresh]);

  return { data, loading, create, remove, refresh };
}

// ============================================
// REQUESTS
// ============================================

export function useRequests() {
  const [data, setData] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const sb = getSupabase();
    const { data: rows } = await sb
      .from("approval_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setData(
      (rows || []).map((r) => ({
        id: r.id,
        type: r.type,
        createdAt: r.created_at,
        payload: r.payload,
        status: r.status,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const patch = useCallback(
    async (id: string, changes: { status?: ApprovalRequest["status"] }) => {
      const sb = getSupabase();
      const { error } = await sb
        .from("approval_requests")
        .update(changes)
        .eq("id", id);
      if (!error) await refresh();
      return { error: error?.message || null };
    },
    [refresh]
  );

  return { data, loading, patch, refresh };
}

// ============================================
// ADMIN USERS (profiles table)
// ============================================

export function useAdminUsers() {
  const [data, setData] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const sb = getSupabase();
    const { data: rows } = await sb
      .from("profiles")
      .select("id, email, name, role")
      .order("created_at", { ascending: false });
    setData(
      (rows || []).map((r) => ({
        id: r.id,
        name: r.name || r.email,
        email: r.email,
        role: r.role,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
