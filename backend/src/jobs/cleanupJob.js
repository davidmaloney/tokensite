export const PLANS = {
  "1month": { usd: 4.99, days: 30 },
  "12months": { usd: 39, days: 365 },
};

export const SOFT_DELETE_AFTER_EXPIRY_DAYS = 30;
export const HARD_DELETE_AFTER_SOFT_DELETE_DAYS = 30;
export const UNPAID_PAGE_CLEANUP_HOURS = 1;

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT_MAX = 100;
export const PAGE_CREATE_LIMIT_PER_WALLET_PER_HOUR = 5;

export const RPC_RETRY_ATTEMPTS = 4;
export const RPC_RETRY_DELAY_MS = 1500;

export const EXPIRY_JOB_INTERVAL_MINUTES = 30;
export const CLEANUP_JOB_INTERVAL_HOURS = 6;

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const BANNER_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_OUTPUT_SIZE = 400;
export const BANNER_OUTPUT_WIDTH = 1200;
export const BANNER_OUTPUT_HEIGHT = 300;

export const RESERVED_SLUGS = new Set([
  "api","admin","dashboard","app","mail","email","ftp","ssh","sftp","cdn",
  "assets","static","media","files","uploads","img","images","video","videos",
  "dev","development","test","testing","stage","staging","prod","production",
  "internal","intranet","vpn","support","help","status","health","auth",
  "login","logout","billing","payment","payments","checkout","docs",
  "documentation","backend","frontend","proxy","router","gateway","tokensite",
  "www","http","https","buy","create","contact","about","home","index",
  "null","undefined","root","system","server","host","localhost",
]);
