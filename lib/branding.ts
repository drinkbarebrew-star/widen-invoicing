// Whitelabel branding. Every value can be overridden with a NEXT_PUBLIC_ env var.
export const branding = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "AI Invoicing",
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "WIDEN",
  sub: process.env.NEXT_PUBLIC_BRAND_SUB || "CHIMNEY & VENT",
  website: process.env.NEXT_PUBLIC_BRAND_WEBSITE || "WidenChicago.com",
  address: process.env.NEXT_PUBLIC_BRAND_ADDRESS || "1500 Old Deerfield Rd, Highland Park, IL",
  phone: process.env.NEXT_PUBLIC_BRAND_PHONE || "224 343 1991",
  docTitle: process.env.NEXT_PUBLIC_DOC_TITLE || "CHIMNEY REPAIR ESTIMATE",
  accent: process.env.NEXT_PUBLIC_BRAND_ACCENT || "#b35a33",
  trade: process.env.NEXT_PUBLIC_BRAND_TRADE || "chimney and venting",
};

export type Branding = typeof branding;
