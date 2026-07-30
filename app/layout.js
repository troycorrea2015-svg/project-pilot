import "./globals.css";
import "../components/guidance-assistant.css";
import "../components/beta-feedback.css";
import GuidanceAssistant from "../components/GuidanceAssistant";
import FeedbackCenter from "../components/BetaFeedback";
import ProductAnalytics from "../components/ProductAnalytics";

export const metadata = {
  title: "Project Pilot | From Concept to Completion",
  description: "Plan projects, understand permits and costs, and connect with unbiased Best Match contractors.",
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
