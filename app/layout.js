import "./globals.css";
import "./brand-system.css";
import "../components/guidance-assistant.css";
import "../components/beta-feedback.css";
import GuidanceAssistant from "../components/GuidanceAssistant";
import FeedbackCenter from "../components/BetaFeedback";
import ProductAnalytics from "../components/ProductAnalytics";

export const metadata = {
  title: "Project Pilot | From Vision to Approval",
  description: "Visualize, plan, permit, and manage home projects with Project Pilot and Su.",
  icons: {
    icon: "/project-pilot-mark.svg",
    shortcut: "/project-pilot-mark.svg",
    apple: "/project-pilot-mark.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ProductAnalytics />
        <FeedbackCenter />
        <GuidanceAssistant />
      </body>
    </html>
  );
}
