import {
    ChainData,
    BitcoinNetwork,
    BitcoinRpc,
    BaseTokenType,
    ChainType,
    StorageObject,
    IStorageManager
} from "@atomiqlabs/base";
import * as BN from "bn.js";
import {
    BitcoinTokens,
    BtcToken,
    IndexedDBStorageManager,
    MempoolApi,
    MempoolBitcoinRpc, RedundantSwapPrice,
    RedundantSwapPriceAssets, SCToken, Swapper,
    SwapperOptions
} from "@atomiqlabs/sdk-lib";
import {SmartChainAssets} from "./SmartChainAssets";

type ChainInitializer<O, C extends ChainType, T extends BaseTokenType> = {
    chainId: ChainType["ChainId"],
    chainType: ChainType,
    initializer: (
        options: O,
        bitcoinRelay: BitcoinRpc<any>,
        network: BitcoinNetwork,
        storageCtor: <T extends StorageObject>(name: string) => IStorageManager<T>
    ) => ChainData<C>,
    tokens: T,
    options: O
}

type TokensDict<T extends ChainInitializer<any, any, any>> = {
    [K in T["chainId"]]: {
        [val in keyof T["tokens"]]: SCToken<K>
    }
};
type GetAllTokens<T extends readonly ChainInitializer<any, any, any>[]> =
    (T extends readonly [infer First extends ChainInitializer<any, any, any>, ...infer Rest extends ChainInitializer<any, any, any>[]]
        ? TokensDict<First> & GetAllTokens<Rest>
        : unknown);

export type TokenResolverDict<T extends ChainInitializer<any, any, any>> = {[K in T["chainId"]]: {
    getToken: (address: string) => SCToken<K>
}};
type GetAllTokenResolvers<T extends readonly ChainInitializer<any, any, any>[]> =
    (T extends readonly [infer First extends ChainInitializer<any, any, any>, ...infer Rest extends ChainInitializer<any, any, any>[]]
        ? TokenResolverDict<First> & GetAllTokenResolvers<Rest>
        : unknown);

type OptionsDict<T extends ChainInitializer<any, any, any>> = {[K in T["chainId"]]: T["options"]};
type GetAllOptions<T extends readonly ChainInitializer<any, any, any>[]> =
    (T extends readonly [infer First extends ChainInitializer<any, any, any>, ...infer Rest extends ChainInitializer<any, any, any>[]]
        ? OptionsDict<First> & GetAllOptions<Rest>
        : unknown);

type ChainTypeDict<T extends ChainInitializer<any, any, any>> = {[K in T["chainId"]]: T["chainType"]};
type ToMultichain<T extends readonly ChainInitializer<any, any, any>[]> =
    (T extends readonly [infer First extends ChainInitializer<any, any, any>, ...infer Rest extends ChainInitializer<any, any, any>[]]
        ? ChainTypeDict<First> & ToMultichain<Rest>
        : {});

export type MultichainSwapperOptions<T extends ChainInitializer<any, any, any>[]> = SwapperOptions & {
    chains: GetAllOptions<T>
} & {
    storageCtor?: <T extends StorageObject>(name: string) => IStorageManager<T>,
    pricingFeeDifferencePPM?: BN,
    mempoolApi?: MempoolApi
};

export class SwapperFactory<T extends ChainInitializer<any, any, any>[]> {

    initializers: T;
    Tokens: GetAllTokens<T> & {
        BITCOIN: {
            BTC: BtcToken<false>,
            BTCLN: BtcToken<true>
        }
    } = {
        BITCOIN: BitcoinTokens
    } as any;
    TokenResolver: GetAllTokenResolvers<T> = {} as any;

    constructor(initializers: T) {
        this.initializers = initializers;
        initializers.forEach(initializer => {
            const addressMap: {[tokenAddress: string]: SCToken} = {};

            this.Tokens[initializer.chainId] = {} as any;

            for(let ticker in initializer.tokens) {
                const assetData = initializer.tokens[ticker] as any;
                this.Tokens[initializer.chainId][ticker] = addressMap[assetData.address] = {
                    chain: "SC",
                    chainId: initializer.chainId,
                    address: assetData.address,
                    name: SmartChainAssets[ticker].name,
                    decimals: assetData.decimals,
                    displayDecimals: assetData.displayDecimals,
                    ticker
                } as any;
            }

            this.TokenResolver[initializer.chainId] = {
                getToken: (address: string) => addressMap[address]
            } as any;
        });
    }

    newSwapper(options: MultichainSwapperOptions<T>) {
        options.bitcoinNetwork ??= BitcoinNetwork.MAINNET as any;
        options.storagePrefix ??= "atomiqsdk-"+options.bitcoinNetwork;
        options.storageCtor ??= (name: string) => new IndexedDBStorageManager<any>(name);

        options.defaultTrustedIntermediaryUrl ??= options.bitcoinNetwork===BitcoinNetwork.MAINNET ?
            "https://node3.gethopa.com:34100" :
            "https://node3.gethopa.com:24100";

        options.registryUrl ??= options.bitcoinNetwork===BitcoinNetwork.MAINNET ?
            "https://api.github.com/repos/adambor/SolLightning-registry/contents/registry-mainnet.json?ref=main" :
            "https://api.github.com/repos/adambor/SolLightning-registry/contents/registry.json?ref=main";

        const mempoolApi = options.mempoolApi ?? new MempoolApi(
            options.bitcoinNetwork===BitcoinNetwork.TESTNET ?
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
                ]
        );
        const bitcoinRpc = new MempoolBitcoinRpc(mempoolApi);

        const pricingAssets: (RedundantSwapPriceAssets<ToMultichain<T>>[number] & {ticker: string, name: string})[] = [];
        Object.keys(SmartChainAssets).forEach((ticker) => {
            const chains: any = {};
            for(let {tokens, chainId} of this.initializers) {
                if(tokens[ticker]!=null) chains[chainId] = tokens[ticker];
            }
            const assetData = SmartChainAssets[ticker];
            pricingAssets.push({
                ...assetData.pricing,
                chains,
                ticker,
                name: assetData.name
            })
        });

        const chains: {[key in T[number]["chainId"]]: ChainData<any>} = {} as any;
        for(let {initializer, chainId} of this.initializers) {
            if(options.chains[chainId]==null) return null;
            chains[chainId] = initializer(options.chains[chainId], bitcoinRpc, options.bitcoinNetwork, options.storageCtor) as any;
        }

        return new Swapper<ToMultichain<T>>(
            bitcoinRpc,
            chains as any,
            RedundantSwapPrice.createFromTokenMap<ToMultichain<T>>(options.pricingFeeDifferencePPM ?? new BN(10000), pricingAssets),
            pricingAssets,
            options
        );
    }

}
