import "./globals.css";
import "../components/guidance-assistant.css";
import "../components/beta-feedback.css";
import GuidanceAssistant from "../components/GuidanceAssistant";
import BetaFeedback from "../components/BetaFeedback";
import ProductAnalytics from "../components/ProductAnalytics";

export const metadata = {
  title: "Project Pilot | From Concept to Completion",
  description: "A plain-language project planning workspace for homeowners, contractors, property managers, developers, and investors.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ProductAnalytics />
        <BetaFeedback />
        <GuidanceAssistant />
      </body>
    </html>
  );
}
