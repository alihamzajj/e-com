import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/config/public";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/checkout", "/cart", "/api", "/auth"] }],
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
  };
}
