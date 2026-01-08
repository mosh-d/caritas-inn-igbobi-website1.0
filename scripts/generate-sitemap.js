import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pages = [
  { url: "/", changefreq: "daily", priority: 1.0 },
  { url: "/about", changefreq: "weekly", priority: 0.8 },
  { url: "/rooms", changefreq: "weekly", priority: 0.9 },
  { url: "/gallery", changefreq: "weekly", priority: 0.7 },
  { url: "/contact", changefreq: "monthly", priority: 0.6 },
  { url: "/booking", changefreq: "daily", priority: 0.9 },
  { url: "/privacy-policy", changefreq: "monthly", priority: 0.3 },
  { url: "/terms-of-service", changefreq: "monthly", priority: 0.3 },
];

const baseUrl = "https://caritasinnigbobi.fivecloverhotels.com";

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages
    .map(
      (page) => `
    <url>
      <loc>${baseUrl}${page.url}</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>${page.changefreq}</changefreq>
      <priority>${page.priority}</priority>
    </url>
  `
    )
    .join("")}
</urlset>`;

// Ensure public directory exists
const publicDir = join(process.cwd(), "public");
try {
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(join(publicDir, "sitemap.xml"), sitemap);
  console.log("Sitemap generated successfully!");
} catch (err) {
  console.error("Error generating sitemap:", err);
  process.exit(1);
}
