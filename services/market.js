/**
 * Market data service - fetches live price, volume, liquidity from DexScreener
 * Free API, no key required.
 */

const DEXSCREENER_SEARCH = "https://api.dexscreener.com/latest/dex/search";

/**
 * Fetch market data for a single token from DexScreener.
 * Picks the highest-liquidity pair matching the symbol.
 * @param {string} symbol - e.g. "PEPE"
 * @returns {Promise<import('../models/types.js').TokenMarketData|null>}
 */
export async function fetchTokenMarketData(symbol) {
  try {
    const res = await fetch(
      `${DEXSCREENER_SEARCH}?q=${encodeURIComponent(symbol)}`
    );
    if (!res.ok) throw new Error(`DexScreener ${res.status}`);

    const data = await res.json();
    if (!data.pairs?.length) return null;

    // Best match: same symbol, highest liquidity
    const pair = data.pairs
      .filter(
        (p) => p.baseToken.symbol.toUpperCase() === symbol.toUpperCase()
      )
      .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];

    if (!pair) return null;

    return {
      symbol: pair.baseToken.symbol,
      name: pair.baseToken.name,
      priceUsd: parseFloat(pair.priceUsd) || 0,
      priceChange5m: pair.priceChange?.m5 || 0,
      priceChange1h: pair.priceChange?.h1 || 0,
      priceChange6h: pair.priceChange?.h6 || 0,
      priceChange24h: pair.priceChange?.h24 || 0,
      volume24h: pair.volume?.h24 || 0,
      liquidity: pair.liquidity?.usd || 0,
      marketCap: pair.marketCap || 0,
      dexId: pair.dexId,
      pairAddress: pair.pairAddress,
    };
  } catch (err) {
    console.warn(`  [!] Market data for ${symbol}: ${err.message}`);
    return null;
  }
}

/**
 * Fetch market data for multiple tokens in parallel.
 * @param {string[]} symbols
 * @returns {Promise<Map<string, import('../models/types.js').TokenMarketData>>}
 */
export async function fetchMultipleTokens(symbols) {
  const results = new Map();
  // Small delay between requests to avoid rate limiting
  const promises = symbols.map((sym, i) =>
    new Promise((resolve) => setTimeout(resolve, i * 200)).then(async () => {
      const data = await fetchTokenMarketData(sym);
      if (data) results.set(sym.toUpperCase(), data);
    })
  );
  await Promise.all(promises);
  return results;
}
