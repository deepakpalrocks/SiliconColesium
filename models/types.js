/**
 * @typedef {Object} TradingConfig
 * @property {number} budget - Available budget in USD
 * @property {string} riskLevel - conservative | balanced | aggressive | degen
 * @property {string[]} selectedTokens - Token symbols to consider
 * @property {Holding[]} currentHoldings - Current portfolio
 */

/**
 * @typedef {Object} Holding
 * @property {string} token
 * @property {number} amount
 * @property {number} avgBuyPrice
 */

/**
 * @typedef {Object} TradeDecision
 * @property {boolean} should_trade
 * @property {string} reasoning
 * @property {string} [market_analysis]
 * @property {TradeAction[]} actions
 */

/**
 * @typedef {Object} TradeAction
 * @property {string} action - BUY or SELL
 * @property {string} token
 * @property {number} amount_usd
 * @property {number} confidence - 0.0 to 1.0
 * @property {string} [urgency] - low | medium | high
 * @property {string} reason
 */

/**
 * @typedef {Object} TokenMarketData
 * @property {string} symbol
 * @property {string} name
 * @property {number} priceUsd
 * @property {number} priceChange5m
 * @property {number} priceChange1h
 * @property {number} priceChange6h
 * @property {number} priceChange24h
 * @property {number} volume24h
 * @property {number} liquidity - USD liquidity in pool
 * @property {number} marketCap
 * @property {string} dexId
 * @property {string} pairAddress
 */

/**
 * @typedef {Object} TokenSentiment
 * @property {string} token
 * @property {number} sentimentScore - -1.0 to 1.0
 * @property {string} sentiment - very_bearish | bearish | neutral | bullish | very_bullish
 * @property {number} buzzLevel - 0 to 10
 * @property {string[]} keyThemes
 * @property {string} summary
 */

export {};
