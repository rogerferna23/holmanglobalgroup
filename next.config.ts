import type { NextConfig } from "next";

// ============================================
// Security headers
// ============================================
// CSP estricta pero pragmatica: permite inline scripts (Next.js + JSON-LD)
// y styles inline (componentes), bloquea cualquier dominio externo de scripts
// excepto los esenciales (Stripe, Supabase, Google Fonts).
//
// IMPORTANTE: si añades un script de un nuevo dominio (ej. analytics), debes
// añadirlo aqui o la pagina lo bloqueara silenciosamente.
const cspDirectives = [
  "default-src 'self'",
  // 'unsafe-inline' es necesario para los scripts de hidratacion de Next.js
  // y los JSON-LD inline. Stripe SDK se carga desde js.stripe.com.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.stripe.com",
  // Styles inline OK (Next.js inyecta criticos), fuentes de Google.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Imagenes: propias, data URIs, blob (para canvas/exports) y logos Stripe.
  "img-src 'self' data: blob: https://*.stripe.com https://*.stripe.network",
  // XHR/fetch: propias rutas, Supabase, Stripe API.
  "connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.stripe.com https://*.stripe.network",
  // iframes: Stripe Checkout / Elements usan iframes para PCI compliance.
  "frame-src https://js.stripe.com https://*.stripe.com https://hooks.stripe.com",
  // No permitir que NADIE incruste el sitio en un iframe (anti-clickjacking
  // adicional al X-Frame-Options).
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Bloquea Flash, ActiveX, etc.
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  // Anti-clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // No permitir sniffing de tipos MIME
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No filtrar la URL completa como referrer a terceros
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Bloquear geolocalizacion, camara, microfono por defecto
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://js.stripe.com\")",
  },
  // Forzar HTTPS por 2 anos + subdominios (HSTS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // CSP
  { key: "Content-Security-Policy", value: cspDirectives },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: [],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
