// Audit log: registra cada accion sensible en la tabla audit_log.
// Forense post-incidente + cumplimiento legal (GDPR / LOPD requieren trazabilidad).
//
// Llamar fire-and-forget desde API routes:
//   void audit({ action: "sale.create", resource: "sale", resourceId: id, session, status: "success" });
//
// NUNCA bloquees la response esperando al audit. Usamos `void` y manejamos
// errores silenciosamente para que un fallo de logging no rompa el flujo.

import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export type AuditAction =
  // Auth
  | "login"
  | "login_failed"
  | "logout"
  | "session_revoked"
  // Ventas
  | "sale.create"
  | "sale.delete"
  | "sale.update"
  // Gastos
  | "expense.create"
  | "expense.delete"
  // Vendedores
  | "vendor.create"
  | "vendor.delete"
  | "vendor.update"
  // Usuarios admin
  | "user.create"
  | "user.delete"
  | "user.update"
  // Solicitudes
  | "request.create"
  | "request.approve"
  | "request.reject"
  | "request.delete"
  // PayPal
  | "paypal.create_order"
  | "paypal.capture"
  | "paypal.capture_failed"
  // Demo / sistema
  | "demo.load"
  | "demo.clear";

export type AuditEntry = {
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  userId?: string;
  userEmail?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  status?: "success" | "failure";
};

/**
 * Loguea una accion en audit_log. Fire-and-forget — no bloquea la response.
 * Si el contexto (IP, UA) no se pasa, intentamos leerlo de los headers.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    let ip = entry.ip;
    let userAgent = entry.userAgent;
    if (!ip || !userAgent) {
      try {
        const h = await headers();
        if (!ip) {
          const xff = h.get("x-forwarded-for");
          ip = xff
            ? xff.split(",")[0].trim()
            : h.get("x-real-ip")?.trim() || "unknown";
        }
        if (!userAgent) {
          userAgent = (h.get("user-agent") || "").slice(0, 500);
        }
      } catch {
        // headers() solo funciona en contextos de request; ignorar fuera.
      }
    }

    const row = {
      action: entry.action,
      resource: entry.resource || null,
      resource_id: entry.resourceId || null,
      user_id: entry.userId || null,
      user_email: entry.userEmail || null,
      ip: ip || null,
      user_agent: userAgent || null,
      metadata: entry.metadata || null,
      status: entry.status || "success",
    };

    const sb = getSupabaseAdmin();
    const { error } = await sb.from("audit_log").insert(row);
    if (error) {
      // No tirar al cliente — solo logueamos local. El audit es best-effort.
      logger.warn("[audit] insert failed", { error: error.message, action: entry.action });
    }
  } catch (err) {
    logger.warn("[audit] unexpected", { err: String(err) });
  }
}
