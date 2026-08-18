export default function sitemap() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.projectpiloting.com").replace(/\/$/, "");
  return ["", "/launch", "/contractors", "/terms", "/privacy", "/support"].map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: path === "" ? "weekly" : "monthly", priority: path === "" ? 1 : 0.7 }));
}
