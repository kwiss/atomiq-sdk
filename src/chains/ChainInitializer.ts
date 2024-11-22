import {BitcoinRpc, ChainType} from "crosslightning-base";
import {BitcoinNetwork, CtorChainData, SwapperOptions} from "crosslightning-sdk-base";
import {AssetData} from "../SmartChainAssets";


export type SdkChainType = {
    ChainType: ChainType,
    Options: {},
    Assets: AssetData
}

export type SdkChain<T extends SdkChainType> = {
    getCtorData: (options: SwapperOptions, bitcoinRpc: BitcoinRpc<any>, network: BitcoinNetwork) => CtorChainData<T["ChainType"]>,
    assets: AssetData,
    chainIdentifier: string
};
