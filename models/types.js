/**
 * @typedef {Object} TradingConfig
 * @property {number} budget - Trading budget in USD
 * @property {string} riskLevel - conservative | balanced | aggressive | degen
 * @property {string[]} selectedTokens - Token symbols to consider
 * @property {Holding[]} currentHoldings - Current token holdings
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
 * @property {TradeAction[]} actions
 */

/**
 * @typedef {Object} TradeAction
 * @property {string} action - BUY or SELL
 * @property {string} token
 * @property {number} amount
 * @property {number} confidence - 0.0 to 1.0
 * @property {string} reason
 */

export {};
