import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PUBLIC_ROUTES, SITE_URL } from "./seo-routes.mjs";

function buildSitemap(date) {
  const urls = PUBLIC_ROUTES.map((r) => {
    const loc = r.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${r.path}`;
    return [
      "  <url>",
      `    <loc>${loc}</loc>`,
      `    <lastmod>${date}</lastmod>`,
      `    <changefreq>${r.changefreq}</changefreq>`,
      `    <priority>${r.priority}</priority>`,
      "  </url>",
    ].join("\n");
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function buildRobots(isProduction) {
  if (!isProduction) {
    return "# Entorno de staging/preview - NO indexar\nUser-agent: *\nDisallow: /\n";
  }
  return [
    "# Holman Global Group - https://holmanglobalgroup.com",
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /admin/",
    "Disallow: /login",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Inyecta el <head> por ruta sobre el index.html ya compilado (sin tocar el body).
// Usa funciones de reemplazo para que caracteres como "$" del texto no se interpreten.
function routeHtml(template, route) {
  const loc = route.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${route.path}`;
  const t = esc(route.title);
  const d = esc(route.description);
  const set = (html, re, val) => html.replace(re, (_m, p1, p2) => `${p1}${val}${p2}`);
  let html = template.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${t}</title>`);
  html = set(html, /(<meta\s+name="description"\s+content=")[^"]*(")/, d);
  html = set(html, /(<meta\s+property="og:title"\s+content=")[^"]*(")/, t);
  html = set(html, /(<meta\s+property="og:description"\s+content=")[^"]*(")/, d);
  html = set(html, /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, t);
  html = set(html, /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, d);
  html = set(html, /(<link\s+rel="canonical"\s+href=")[^"]*(")/, loc);
  html = set(html, /(<meta\s+property="og:url"\s+content=")[^"]*(")/, loc);
  html = html.replace(
    /(<link\s+rel="alternate"\s+hreflang="[^"]*"\s+href=")[^"]*(")/g,
    (_m, p1, p2) => `${p1}${loc}${p2}`
  );
  return html;
}

/**
 * Genera, en cada build (local o Vercel CI, sin navegador):
 *  - robots.txt según entorno (VERCEL_ENV: producción = indexable; preview = Disallow /)
 *  - sitemap.xml con todas las rutas públicas
 *  - dist/<ruta>/index.html con el <head> (title/description/canonical/OG/hreflang)
 *    correcto por ruta, para que TODO rastreador (incl. redes sociales sin JS) reciba
 *    el meta adecuado en enlaces profundos. El body se sigue renderizando en cliente.
 */
export function seoFiles() {
  let outDir = "dist";
  let root = process.cwd();
  return {
    name: "hgg-seo-files",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir || "dist";
      root = config.root || process.cwd();
    },
    closeBundle() {
      const vercelEnv = process.env.VERCEL_ENV;
      const isProduction = vercelEnv ? vercelEnv === "production" : true;
      const date = new Date().toISOString().slice(0, 10);
      const dir = path.isAbsolute(outDir) ? outDir : path.join(root, outDir);

      writeFileSync(path.join(dir, "robots.txt"), buildRobots(isProduction), "utf8");
      writeFileSync(path.join(dir, "sitemap.xml"), buildSitemap(date), "utf8");

      let pages = 0;
      try {
        const template = readFileSync(path.join(dir, "index.html"), "utf8");
        for (const r of PUBLIC_ROUTES) {
          if (r.path === "/") continue; // index.html ya es el home
          const outFile = path.join(dir, r.path.replace(/^\//, ""), "index.html");
          mkdirSync(path.dirname(outFile), { recursive: true });
          writeFileSync(outFile, routeHtml(template, r), "utf8");
          pages++;
        }
      } catch (e) {
        console.warn("[hgg-seo-files] no se pudo generar el HTML por ruta:", e.message);
      }

      const tag = isProduction ? "produccion (indexable)" : "staging (Disallow: /)";
      console.log(
        `[hgg-seo-files] robots.txt -> ${tag} | sitemap.xml -> ${PUBLIC_ROUTES.length} URLs | HTML por ruta -> ${pages} paginas`
      );
    },
  };
}
