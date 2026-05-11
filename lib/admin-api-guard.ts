import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

// Devuelve null si la sesion es valida, o NextResponse 401 si no.
// Usar al inicio de cada handler protegido:
//   const guard = await requireAdminApi();
//   if (guard) return guard;
export async function requireAdminApi(): Promise<NextResponse | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}
