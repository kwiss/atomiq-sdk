
export const SmartChainAssets = {
    WBTC: {
        pricing: {
            binancePair: "WBTCBTC",
            okxPair: null,
            coinGeckoCoinId: "wrapped-bitcoin",
            coinPaprikaCoinId: "wbtc-wrapped-bitcoin",
            krakenPair: "WBTCXBT"
        },
        name: "Wrapped BTC (Wormhole)"
    },
    USDC: {
        pricing: {
            binancePair: "!BTCUSDC",
            okxPair: "!BTC-USDC",
            coinGeckoCoinId: "usd-coin",
            coinPaprikaCoinId: "usdc-usd-coin",
            krakenPair: "!XBTUSDC"
        },
        name: "USD Circle"
    },
    USDT: {
        pricing: {
            binancePair: "!BTCUSDT",
            okxPair: "!BTC-USDT",
            coinGeckoCoinId: "tether",
            coinPaprikaCoinId: "usdt-tether",
            krakenPair: "!XBTUSDT"
        },
        name: "Tether USD"
    },
    SOL: {
        pricing: {
            binancePair: "SOLBTC",
            okxPair: "SOL-BTC",
            coinGeckoCoinId: "solana",
            coinPaprikaCoinId: "sol-solana",
            krakenPair: "SOLXBT"
        },
        name: "Solana"
    },
    BONK: {
        pricing: {
            binancePair: "BONKUSDC;!BTCUSDC",
            okxPair: "BONK-USDT;!BTC-USDT",
            coinGeckoCoinId: "bonk",
            coinPaprikaCoinId: "bonk-bonk",
            krakenPair: "BONKUSD;!XXBTZUSD"
        },
        name: "Bonk"
    }
} as const;

export type SmartChainAssetTickers = keyof typeof SmartChainAssets;

export type AssetData = {
    [ticker in SmartChainAssetTickers]?: {
        address: string,
        decimals: number
    }
};
