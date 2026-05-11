import { Fab } from "@/components/fab";
import { Footer } from "@/components/footer";
import { Grain } from "@/components/grain";
import { Nav } from "@/components/nav";

// Layout del sitio publico (home / historia / tienda).
// Renderiza Nav, Footer, Fab y Grain.
// El admin y /login NO usan este layout — solo el root layout, sin chrome.
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Grain />
      <Nav />
      <main>{children}</main>
      <Footer />
      <Fab />
    </>
  );
}
