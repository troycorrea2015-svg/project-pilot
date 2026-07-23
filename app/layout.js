import "./globals.css";

export const metadata = {
  title: "Project Pilot | From Concept to Completion",
  description: "A guided project workspace for homeowners, contractors, property managers, developers, and investors.",
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
