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
  title: { default: "Project Pilot | From Vision to Approval", template: "%s | Project Pilot" },
  description: "Plan, visualize, prepare permits, organize documents, and manage home projects with Project Pilot and Su.",
  applicationName: "Project Pilot",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Project Pilot | From Vision to Approval",
    description: "A homeowner-controlled workspace for planning, visualization, permits, documents, and next steps.",
    url: siteUrl,
    siteName: "Project Pilot",
    type: "website",
  },
  twitter: { card: "summary", title: "Project Pilot", description: "From vision to approval." },
  icons: { icon: "/project-pilot-mark.svg", shortcut: "/project-pilot-mark.svg", apple: "/project-pilot-mark.svg" },
};

export const viewport = { themeColor: "#07172f", colorScheme: "light" };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}<ProductAnalytics /><FeedbackCenter /><GuidanceAssistant /></body></html>;
}
