import { DOMAIN } from "../config/domain.js";

export function subdomainResolver(req, res, next) {
  const host = req.hostname || req.headers.host || "";
  const hostWithoutPort = host.split(":")[0];

  if (hostWithoutPort === DOMAIN || hostWithoutPort === `www.${DOMAIN}`) {
    req.isMainDomain = true;
    req.subdomain = null;
    return next();
  }

  if (hostWithoutPort.endsWith(`.${DOMAIN}`)) {
    const sub = hostWithoutPort.slice(0, -(DOMAIN.length + 1));
    if (sub && !sub.includes(".")) {
      req.isMainDomain = false;
      req.subdomain = sub;
      return next();
    }
  }

  req.isMainDomain = true;
  req.subdomain = null;
  next();
}
