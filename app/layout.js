import "./globals.css";
import "./brand.css";
import "../components/guidance-assistant.css";
import "../components/beta-feedback.css";
import GuidanceAssistant from "../components/GuidanceAssistant";
import FeedbackCenter from "../components/BetaFeedback";
import ProductAnalytics from "../components/ProductAnalytics";

export const metadata = {
  title: "Project Pilot | From Concept to Completion",
  description: "AI-guided project planning, permit preparation, cost estimates, documents, and trusted professional connections.",
  icons: { icon: "/favicon.svg" },
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
