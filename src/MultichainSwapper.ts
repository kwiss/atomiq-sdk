import {
    BitcoinNetwork, BitcoinTokens,
    BtcToken, IndexedDBStorageManager, isToken,
    MempoolApi,
    MempoolBitcoinRpc,
    RedundantSwapPrice,
    RedundantSwapPriceAssets,
    SCToken,
    Swapper,
    SwapperOptions, Token
} from "@atomiqlabs/sdk-lib";
import {objectMap} from "@atomiqlabs/sdk-lib/dist/utils/Utils";
import {SdkSolana, SdkSolanaType} from "./chains/solana/SolanaChainInitializer";
import {SdkChain} from "./chains/ChainInitializer";
import * as BN from "bn.js";
import {SmartChainAssets} from "./SmartChainAssets";
import {IStorageManager, StorageObject} from "@atomiqlabs/base";

type Chains = {
    "SOLANA": SdkSolanaType
};

const Chains: {
    [C in keyof Chains]: SdkChain<Chains[C]>
} = {
    "SOLANA": SdkSolana
} as const;

type SdkMultichain = { [C in keyof Chains]: Chains[C]["ChainType"] };

export type MultichainSwapperOptions = SwapperOptions & {
    chains: {
        [C in keyof Chains]: Chains[C]["Options"]
    }
} & {
    storageCtor?: <T extends StorageObject>(name: string) => IStorageManager<T>,
    pricingFeeDifferencePPM?: BN
};

export class MultichainSwapper extends Swapper<SdkMultichain> {

    constructor(options: MultichainSwapperOptions) {
        options.bitcoinNetwork ??= BitcoinNetwork.MAINNET;
        options.storagePrefix ??= "atomiqsdk-"+options.bitcoinNetwork;
        options.storageCtor ??= (name: string) => new IndexedDBStorageManager(name);

        options.registryUrl ??= options.bitcoinNetwork===BitcoinNetwork.MAINNET ?
            "https://api.github.com/repos/adambor/SolLightning-registry/contents/registry-mainnet.json?ref=main" :
            "https://api.github.com/repos/adambor/SolLightning-registry/contents/registry.json?ref=main";

        const mempoolApi = new MempoolApi(
            options.bitcoinNetwork===BitcoinNetwork.TESTNET ?
                "https://mempool.space/testnet/api/" :
                "https://mempool.space/api/"
        );
        const bitcoinRpc = new MempoolBitcoinRpc(mempoolApi);

        const pricingAssets: (RedundantSwapPriceAssets<SdkMultichain>[number] & {ticker: string, name: string})[] = [];
        Object.keys(SmartChainAssets).forEach((ticker) => {
            const chains: any = {};
            for(let chainId in Chains) {
                if(Chains[chainId].assets[ticker]!=null) chains[chainId] = Chains[chainId].assets[ticker];
            }
            const assetData = SmartChainAssets[ticker];
            pricingAssets.push({
                ...assetData.pricing,
                chains,
                ticker,
                name: assetData.name
            })
        });

        const ctorChainData = objectMap(Chains, (value, key) => {
            return value.getCtorData(options, bitcoinRpc, options.bitcoinNetwork);
        });

        super(
            bitcoinRpc,
            ctorChainData,
            RedundantSwapPrice.createFromTokenMap<SdkMultichain>(options.pricingFeeDifferencePPM ?? new BN(10000), pricingAssets),
            pricingAssets,
            options
        );
    }

}

export const Tokens: {
    [C in keyof Chains]: {
        [T in keyof Chains[C]["Assets"]]: SCToken<C>
    }
} & {
    BITCOIN: {
        BTC: BtcToken<false>,
        BTCLN: BtcToken<true>
    }
} = {
    ...objectMap(Chains, (value, key) => {
        return objectMap(value.assets, (assetData, ticker) => {
            return {
                chain: "SC",
                chainId: value.chainIdentifier,
                address: assetData.address,
                name: SmartChainAssets[ticker].name,
                decimals: assetData.decimals,
                ticker
            }
        });
    }),
    BITCOIN: BitcoinTokens
};

export const TokenResolver: {
    [C in keyof Chains]: {
        getToken(address: string): SCToken<C>
    }
} = {
    ...objectMap(Chains, (value, key) => {
        const addressMap: {[tokenAddress: string]: SCToken} = {};
        for(let ticker in value.assets) {
            addressMap[value.assets[ticker].address] = {
                chain: "SC",
                chainId: value.chainIdentifier,
                address: value.assets[ticker].address,
                ticker,
                name: SmartChainAssets[ticker].name,
                decimals: value.assets[ticker].decimals
            }
        }
        return {
            getToken: (address: string) => addressMap[address]
        };
    })
};
