export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.projectpiloting.com";
  return {
    rules: [{ userAgent: "*", allow: ["/", "/launch", "/contractors", "/terms", "/privacy", "/support"], disallow: ["/admin", "/dashboard", "/project", "/api"] }],
    sitemap: `${base.replace(/\/$/, "")}/sitemap.xml`,
  };
}
