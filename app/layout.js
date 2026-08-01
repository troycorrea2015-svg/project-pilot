import "./globals.css";
import "./brand.css";
import "../components/guidance-assistant.css";
import "../components/beta-feedback.css";
import GuidanceAssistant from "../components/GuidanceAssistant";
import FeedbackCenter from "../components/BetaFeedback";
import ProductAnalytics from "../components/ProductAnalytics";

export const metadata = {
  title: "Project Pilot | AI Guidance. Real Results.",
  description: "Plan smarter with AI-powered guidance for permits, budgets, project visualization, DIY decisions, and trusted professionals.",
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
