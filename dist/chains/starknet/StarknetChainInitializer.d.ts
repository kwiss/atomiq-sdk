import { SdkChain } from "../ChainInitializer";
import { Provider, constants } from "starknet";
import { StarknetChainType, StarknetFees, StarknetRetryPolicy } from "@atomiqlabs/chain-starknet";
type StarknetSwapperOptions = {
    rpcUrl: string | Provider;
    retryPolicy?: StarknetRetryPolicy;
    chainId?: constants.StarknetChainId;
    swapContract?: string;
    btcRelayContract?: string;
    fees?: StarknetFees;
};
declare const StarknetAssets: {
    readonly ETH: {
        readonly address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
        readonly decimals: 18;
        readonly displayDecimals: 9;
    };
    readonly STRK: {
        readonly address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
        readonly decimals: 18;
        readonly displayDecimals: 9;
    };
};
export type SdkStarknetType = {
    ChainType: StarknetChainType;
    Options: StarknetSwapperOptions;
    Assets: typeof StarknetAssets;
};
export declare const SdkStarknet: SdkChain<SdkStarknetType>;
export {};
