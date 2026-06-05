import { PLANS } from "../config/constants.js";
import { logger } from "../utils/logger.js";

let cachedRate = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getSolPriceUsd() {
  const now = Date.now();
  if (cachedRate && now - cacheTime < CACHE_TTL_MS) return cachedRate;

  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    const price = data?.solana?.usd;
    if (price && price > 0) {
      cachedRate = price;
      cacheTime = now;
      return price;
    }
  } catch (err) {
    logger.warn("sol_price_fetch_failed", { err: err.message });
  }

  if (cachedRate) return cachedRate;
  return 150;
}

export async function getUsdToSol(usd) {
  const solPrice = await getSolPriceUsd();
  return parseFloat((usd / solPrice).toFixed(6));
}

export async function getPlanWithSol(planId) {
  const plan = PLANS[planId];
  if (!plan) throw new Error("Invalid plan");
  const solAmount = await getUsdToSol(plan.usd);
  return { ...plan, planId, solAmount };
}
