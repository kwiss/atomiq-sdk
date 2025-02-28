"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwapperFactory = void 0;
const base_1 = require("@atomiqlabs/base");
const sdk_lib_1 = require("@atomiqlabs/sdk-lib");
const SmartChainAssets_1 = require("./SmartChainAssets");
class SwapperFactory {
    constructor(initializers) {
        this.initializers = initializers;
        this.Tokens = {
            BITCOIN: sdk_lib_1.BitcoinTokens
        };
        this.TokenResolver = {};
        this.initializers = initializers;
        initializers.forEach(initializer => {
            const addressMap = {};
            this.Tokens[initializer.chainId] = {};
            for (let ticker in initializer.tokens) {
                const assetData = initializer.tokens[ticker];
                this.Tokens[initializer.chainId][ticker] = addressMap[assetData.address] = {
                    chain: "SC",
                    chainId: initializer.chainId,
                    address: assetData.address,
                    name: SmartChainAssets_1.SmartChainAssets[ticker].name,
                    decimals: assetData.decimals,
                    displayDecimals: assetData.displayDecimals,
                    ticker
                };
            }
            this.TokenResolver[initializer.chainId] = {
                getToken: (address) => addressMap[address]
            };
        });
    }
    newSwapper(options) {
        options.bitcoinNetwork ?? (options.bitcoinNetwork = base_1.BitcoinNetwork.MAINNET);
        options.storagePrefix ?? (options.storagePrefix = "atomiqsdk-" + options.bitcoinNetwork);
        options.storageCtor ?? (options.storageCtor = (name) => new sdk_lib_1.IndexedDBStorageManager(name));
        options.defaultTrustedIntermediaryUrl ?? (options.defaultTrustedIntermediaryUrl = options.bitcoinNetwork === base_1.BitcoinNetwork.MAINNET ?
            "https://node3.gethopa.com:34100" :
            "https://node3.gethopa.com:24100");
        options.registryUrl ?? (options.registryUrl = options.bitcoinNetwork === base_1.BitcoinNetwork.MAINNET ?
            "https://api.github.com/repos/adambor/SolLightning-registry/contents/registry-mainnet.json?ref=main" :
            "https://api.github.com/repos/adambor/SolLightning-registry/contents/registry.json?ref=main");
        const mempoolApi = options.mempoolApi ?? new sdk_lib_1.MempoolApi(options.bitcoinNetwork === base_1.BitcoinNetwork.TESTNET ?
            [
                "https://mempool.space/testnet/api/",
                "https://mempool.fra.mempool.space/testnet/api/",
                "https://mempool.va1.mempool.space/testnet/api/",
                "https://mempool.tk7.mempool.space/testnet/api/"
            ] :
            [
                "https://mempool.space/api/",
                "https://mempool.fra.mempool.space/api/",
                "https://mempool.va1.mempool.space/api/",
                "https://mempool.tk7.mempool.space/api/"
            ]);
        const bitcoinRpc = new sdk_lib_1.MempoolBitcoinRpc(mempoolApi);
        const pricingAssets = [];
        Object.keys(SmartChainAssets_1.SmartChainAssets).forEach((ticker) => {
            const chains = {};
            for (let { tokens, chainId } of this.initializers) {
                if (tokens[ticker] != null)
                    chains[chainId] = tokens[ticker];
            }
            const assetData = SmartChainAssets_1.SmartChainAssets[ticker];
            pricingAssets.push({
                ...assetData.pricing,
                chains,
                ticker,
                name: assetData.name
            });
        });
        const chains = {};
        for (let { initializer, chainId } of this.initializers) {
            if (options.chains[chainId] == null)
                continue;
            chains[chainId] = initializer(options.chains[chainId], bitcoinRpc, options.bitcoinNetwork, options.storageCtor);
        }
        return new sdk_lib_1.Swapper(bitcoinRpc, chains, sdk_lib_1.RedundantSwapPrice.createFromTokenMap(options.pricingFeeDifferencePPM ?? 10000n, pricingAssets), pricingAssets, options);
    }
}
exports.SwapperFactory = SwapperFactory;
