import "./globals.css";
import "./brand-system.css";
import "../components/guidance-assistant.css";
import "../components/beta-feedback.css";
import GuidanceAssistant from "../components/GuidanceAssistant";
import FeedbackCenter from "../components/BetaFeedback";
import ProductAnalytics from "../components/ProductAnalytics";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.projectpiloting.com";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Project Pilot | Guided from Start to Finish", template: "%s | Project Pilot" },
  description: "AI-powered home project guidance for permits, planning, budgets, contractors, and the next step.",
  applicationName: "Project Pilot",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Project Pilot | Guided from Start to Finish",
    description: "Plan, visualize, prepare permits, and move your home project forward in one workspace.",
    url: siteUrl,
    siteName: "Project Pilot",
    type: "website",
  },
  twitter: { card: "summary", title: "Project Pilot", description: "Your project. Guided from start to finish." },
  icons: { icon: "/project-pilot-mark.svg", shortcut: "/project-pilot-mark.svg", apple: "/project-pilot-mark.svg" },
};

export const viewport = { themeColor: "#07172f", colorScheme: "light" };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}<ProductAnalytics /><FeedbackCenter /><GuidanceAssistant /></body></html>;
}
