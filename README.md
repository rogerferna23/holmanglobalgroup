# HGG · Holman Global Group

Landing profesional para Holman Global Group — coaching, branding y sistemas digitales con corazón de elefante.

## Stack

- **Next.js 15** (App Router, Turbopack, prerender estático)
- **React 19** + **TypeScript 5** estricto
- **CSS nativo** (sin frameworks de utilidades — el sistema de diseño vive en `app/globals.css`)
- **next/font** para Questrial + Manrope (auto-hospedados, sin layout shift)
- Animaciones con `IntersectionObserver` + `requestAnimationFrame` (sin librerías)

## Estructura

```
app/
  layout.tsx          # Fuentes, metadata SEO, viewport
  page.tsx            # Composición de la home
  globals.css         # Sistema de diseño completo
components/
  nav.tsx             # Navbar con blur on scroll
  hero.tsx            # Hero con parallax + counters animados
  personas.tsx        # 3 perfiles ("No importa en qué punto estés")
  process.tsx         # Línea dorada que se dibuja al hacer scroll
  corazon.tsx         # Sección Corazón de Elefante
  services.tsx        # Grid de servicios con spotlight
  testimonials.tsx    # Testimonios (1 destacado + 4)
  cta-final.tsx       # CTA final centrado
  footer.tsx          # Footer con redes sociales
  fab.tsx             # Botón flotante de WhatsApp
  grain.tsx           # Capa de grano fílmico
  reveal.tsx          # Wrapper para reveal-on-scroll
  icons.tsx           # Iconos SVG inline
lib/
  config.ts           # Datos del sitio (teléfono, email, redes)
  use-in-view.ts      # Hook para IntersectionObserver
```

## Comandos

```bash
npm install          # Instalar dependencias
npm run dev          # Servidor de desarrollo (Turbopack) en localhost:3000
npm run build        # Build de producción
npm run start        # Servir el build
npm run typecheck    # Verificar tipos
```

## Personalización

- **Datos del sitio** (teléfono, email, redes): `lib/config.ts`
- **Servicios y precios**: `components/services.tsx`
- **Testimonios**: `components/testimonials.tsx`
- **Personas / etapas**: `components/personas.tsx`
- **Tokens de color y tipografía**: variables CSS en `:root` (top de `app/globals.css`)

## Deploy

El proyecto es 100% estático en producción (todas las rutas pre-renderizadas). Compatible con Vercel, Netlify, Cloudflare Pages o cualquier hosting que ejecute `next build`.

```bash
# Vercel: vercel --prod
# Build estándar:
npm run build && npm run start
```

## Origen del diseño

El diseño viene del bundle `claude.ai/design` (extraído en `.design_package/`, gitignorado). El CSS de `app/globals.css` está portado verbatim desde el prototipo, las animaciones traducidas a hooks de React.
