
export const SmartChainAssets = {
    WBTC: {
        pricing: {
            binancePair: "WBTCBTC",
            okxPair: null,
            coinGeckoCoinId: "wrapped-bitcoin",
            coinPaprikaCoinId: "wbtc-wrapped-bitcoin"
        },
        name: "Wrapped BTC (Wormhole)"
    },
    USDC: {
        pricing: {
            binancePair: "!BTCUSDC",
            okxPair: "!BTC-USDC",
            coinGeckoCoinId: "usd-coin",
            coinPaprikaCoinId: "usdc-usd-coin"
        },
        name: "USD Circle"
    },
    USDT: {
        pricing: {
            binancePair: "!BTCUSDT",
            okxPair: "!BTC-USDT",
            coinGeckoCoinId: "tether",
            coinPaprikaCoinId: "usdt-tether"
        },
        name: "Tether USD"
    },
    SOL: {
        pricing: {
            binancePair: "SOLBTC",
            okxPair: "SOL-BTC",
            coinGeckoCoinId: "solana",
            coinPaprikaCoinId: "sol-solana"
        },
        name: "Solana"
    },
    BONK: {
        pricing: {
            binancePair: "BONKUSDC;!BTCUSDC",
            okxPair: null,
            coinGeckoCoinId: "bonk",
            coinPaprikaCoinId: "bonk-bonk"
        },
        name: "Bonk"
    },

    ETH: {
        pricing: {
            binancePair: "ETHBTC",
            okxPair: "ETH-BTC",
            coinGeckoCoinId: "ethereum",
            coinPaprikaCoinId: "eth-ethereum"
        },
        name: "Ethereum"
    },
    STRK: {
        pricing: {
            binancePair: "STRKUSDT;!BTCUSDT",
            okxPair: "STRK-USDT;!BTC-USDT",
            coinGeckoCoinId: "starknet",
            coinPaprikaCoinId: "strk-starknet"
        },
        name: "Starknet"
    }
} as const;

export type SmartChainAssetTickers = keyof typeof SmartChainAssets;
