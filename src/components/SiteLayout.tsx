import { Outlet } from "react-router-dom";
import { AnalyticsTracker } from "./analytics-tracker";
import { CookieBanner } from "./cookie-banner";
import { Fab } from "./fab";
import { Footer } from "./footer";
import { Grain } from "./grain";
import { MusicalNotes } from "./musical-notes";
import { Nav } from "./nav";
import { ScrollToTop } from "./scroll-to-top";

export default function SiteLayout() {
  return (
    <>
      <ScrollToTop />
      <AnalyticsTracker />
      <MusicalNotes />
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
