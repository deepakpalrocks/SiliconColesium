/**
 * Market data service - fetches live price, volume, liquidity from DexScreener.
 */

const DEXSCREENER_SEARCH = "https://api.dexscreener.com/latest/dex/search";

export async function fetchTokenMarketData(symbol) {
  try {
    const res = await fetch(
      `${DEXSCREENER_SEARCH}?q=${encodeURIComponent(symbol)}`
    );
    if (!res.ok) throw new Error(`DexScreener ${res.status}`);

    const data = await res.json();
    if (!data.pairs?.length) return null;

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

export async function fetchMultipleTokens(symbols) {
  const results = new Map();
  const promises = symbols.map((sym, i) =>
    new Promise((resolve) => setTimeout(resolve, i * 200)).then(async () => {
      const data = await fetchTokenMarketData(sym);
      if (data) results.set(sym.toUpperCase(), data);
    })
  );
  await Promise.all(promises);
  return results;
}
