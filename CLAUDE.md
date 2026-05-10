# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

## Descripción General del Proyecto

**HGG (Holman Global Group)** es una landing page premium para una consultoría de coaching, branding y sistemas digitales. El sitio enfatiza el diseño visual y las interacciones suaves basadas en scroll.

- **Idioma Principal**: Español
- **Stack**: Next.js 15 (App Router + Turbopack), React 19, TypeScript 5 (strict)
- **Estilos**: CSS puro con tokens de diseño en `:root` (sin frameworks de utilidades)
- **Deploy**: Sitio completamente estático (pre-renderizado a HTML)

## Comandos

```bash
npm run dev         # Inicia servidor de desarrollo (Turbopack) en localhost:3000
npm run build       # Build de producción (pre-renderizado estático)
npm run start       # Sirve el build de producción localmente
npm run typecheck   # Valida TypeScript (sin build, sin emit)
npm run lint        # Ejecuta ESLint
```

## Arquitectura y Organización del Código

### Estructura de Directorios

```
app/
  layout.tsx        # Layout raíz: fuentes, metadata, SEO, viewport
  page.tsx          # Home (composición de secciones)
  globals.css       # Sistema de diseño: tokens (colores, tipografía, breakpoints)

components/
  nav.tsx           # Barra de navegación con efecto blur al scroll
  hero.tsx          # Sección hero con parallax y contadores animados
  personas.tsx      # 3 arquetipos de clientes (etapas de engagement)
  process.tsx       # Sección proceso con línea dorada animada
  corazon.tsx       # Sección "Corazón de Elefante" (pilar de marca)
  services.tsx      # Grid de servicios con efecto spotlight
  products.tsx      # Sección de productos/ofertas
  testimonials.tsx  # Testimonial destacado + 4 testimoniales adicionales
  cta-final.tsx     # CTA final centrado
  footer.tsx        # Footer con enlaces de redes sociales
  fab.tsx           # Botón flotante de WhatsApp
  grain.tsx         # Overlay de grano de película (efecto visual)
  reveal.tsx        # Componente wrapper para animaciones de reveal-on-scroll
  icons.tsx         # Librería de iconos SVG (todos inline, sin iconos externos)

lib/
  config.ts         # Metadata centralizada (objeto SITE): nombre, tagline, email, teléfono, redes sociales, URLs
  use-in-view.ts    # Hook React personalizado que envuelve IntersectionObserver para triggers de scroll
```

### Patrones Arquitectónicos Clave

**Tokens de Diseño**: Todos los colores, tipografía, espaciado y breakpoints están definidos como custom properties de CSS (variables) en la parte superior de `app/globals.css` bajo `:root`. Actualiza los tokens ahí, no en estilos inline.

**Animaciones de Scroll**: Hook `use-in-view` personalizado (sin librerías de animación externas) que observa la visibilidad de elementos y dispara animaciones. La mayoría de componentes usan el wrapper `<Reveal>` para comportamiento consistente de reveal-on-scroll.

**Fuentes**: Questrial (display) y Manrope (body) se cargan vía Next.js `next/font` e inyectan como variables CSS (`--font-questrial`, `--font-manrope`) en el layout raíz.

**Metadata**: Toda la metadata del sitio (título, descripción, redes, info de contacto) vive en `lib/config.ts`. Actualiza ahí para consistencia en tags SEO y textos de componentes.

**Sin Frameworks**: Los estilos son CSS vanilla. Sin Tailwind, sin CSS-in-JS. Todos los breakpoints responsivos y efectos están escritos directamente en `app/globals.css`.

## Sistema de Diseño

El diseño proviene de un handoff de claude.ai/design (ver `.design_package/hgg/chats/` para contexto). Características visuales clave:

- **Paleta de Colores**: Tema oscuro con colores acentos definidos como variables CSS
- **Tipografía**: Questrial para encabezados (display), Manrope para cuerpo (pesos múltiples: 200, 300, 400, 500, 600)
- **Animaciones**: Parallax al scroll, animaciones de contadores, reveals escalonados vía IntersectionObserver
- **Efectos**: Overlay de grano de película, efectos blur, estados spotlight al hover

Los tokens CSS y la estructura deben permanecer estables; los componentes se construyen sobre ellos, no los reemplazan.

## Notas de Desarrollo

**Agregar Nuevas Secciones**: 
1. Crea un nuevo componente en `components/`
2. Importalo y agrega a `app/page.tsx`
3. Envuelve animaciones en `<Reveal>` para consistencia
4. Usa tokens de diseño de `app/globals.css` (custom properties CSS)

**Actualizar Info del Sitio**: Edita `lib/config.ts` (nombre, email, teléfono, redes sociales, descripción). Esto alimenta metadata y footer.

**Personalizar Servicios/Testimonios/Personas**: Edita los archivos de componentes respectivos directamente. Los datos están hardcodeados; sin base de datos.

**Modificaciones de CSS**: Todos los estilos viven en `app/globals.css`. Agrega nuevas utilidades o estilos a nivel de componente ahí. Prefiere CSS custom properties para colores o espaciado nuevos.

**Seguridad de Tipos**: `tsconfig.json` enforza `strict: true`. Todos los componentes deben estar correctamente tipados. Usa `React.ReactNode` o interfaces de props específicas.

## Deploy

El sitio es **100% estático** — todas las rutas se pre-renderizan a HTML en tiempo de build. Compatible con cualquier host estático:
- **Vercel**: `vercel --prod` o push a main
- **Netlify/Cloudflare**: Deploy de la carpeta `out` (si usas `next build` con output export)
- **Node Estándar**: `npm run build && npm run start`

El sitio está listo para ser bilingüe pero es primariamente español. Sin librería i18n en uso actualmente.
