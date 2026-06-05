export const DOMAIN = process.env.DOMAIN || "localhost";
export const BASE_URL = `https://${DOMAIN}`;
export const getSubdomainUrl = (slug) => `https://${slug}.${DOMAIN}`;
