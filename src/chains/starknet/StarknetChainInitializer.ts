import {
    BitcoinNetwork,
    CtorChainData
} from "@atomiqlabs/sdk-lib";
import {BitcoinRpc} from "@atomiqlabs/base";
import {SdkChain} from "../ChainInitializer";
import {MultichainSwapperOptions} from "../../MultichainSwapper";
import {Provider, RpcProvider, constants} from "starknet";
import {
    StarknetBtcRelay, StarknetChainEventsBrowser,
    StarknetChainType,
    StarknetFees,
    StarknetRetryPolicy,
    StarknetSwapContract, StarknetSwapData
} from "@atomiqlabs/chain-starknet";

const chainId = "STARKNET" as const;

type StarknetSwapperOptions = {
    rpcUrl: string | Provider,
    retryPolicy?: StarknetRetryPolicy,
    chainId?: constants.StarknetChainId,

    swapContract?: string,
    btcRelayContract?: string,

    fees?: StarknetFees
};

function getStarknetCtorData(options: MultichainSwapperOptions, bitcoinRpc: BitcoinRpc<any>, network: BitcoinNetwork): CtorChainData<StarknetChainType> {
    const provider = typeof(options.chains.STARKNET.rpcUrl)==="string" ?
        new RpcProvider({nodeUrl: options.chains.STARKNET.rpcUrl}) :
        options.chains.STARKNET.rpcUrl;

    const Fees = options.chains.STARKNET.fees ?? new StarknetFees(provider, "ETH");

    const chainId = options.chains.STARKNET.chainId ??
        (options.bitcoinNetwork===BitcoinNetwork.MAINNET ? constants.StarknetChainId.SN_MAIN : constants.StarknetChainId.SN_SEPOLIA);

    const btcRelay = new StarknetBtcRelay(
        chainId, provider, bitcoinRpc, options.chains.STARKNET.btcRelayContract, options.chains.STARKNET.retryPolicy, Fees
    );

    const swapContract = new StarknetSwapContract(
        chainId, provider, btcRelay, options.chains.STARKNET.swapContract, options.chains.STARKNET.retryPolicy, Fees
    );
    const chainEvents = new StarknetChainEventsBrowser(swapContract);

    return {
        btcRelay,
        swapContract,
        chainEvents,
        swapDataConstructor: StarknetSwapData
    }
}

const StarknetAssets = {
    ETH: {
        address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
        decimals: 18
    },
    STRK: {
        address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
        decimals: 18
    }
} as const;

export type SdkStarknetType = {
    ChainType: StarknetChainType,
    Options: StarknetSwapperOptions,
    Assets: typeof StarknetAssets
};

export const SdkStarknet: SdkChain<SdkStarknetType> = {
    getCtorData: getStarknetCtorData,
    assets: StarknetAssets,
    chainIdentifier: chainId
} as const;
