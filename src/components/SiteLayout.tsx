import { Outlet } from "react-router-dom";
import { CookieBanner } from "./cookie-banner";
import { Fab } from "./fab";
import { Footer } from "./footer";
import { Grain } from "./grain";
import { Nav } from "./nav";

export default function SiteLayout() {
  return (
    <>
      <Grain />
      <Nav />
      <main>
        <Outlet />
      </main>
      <Footer />
      <Fab />
      <CookieBanner />
    </>
  );
}
