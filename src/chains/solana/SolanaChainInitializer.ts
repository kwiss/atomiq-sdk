import {
    SolanaBtcRelay,
    SolanaChainType, SolanaFees, SolanaRetryPolicy,
    SolanaSwapData,
    SolanaSwapProgram,
    StoredDataAccount
} from "crosslightning-solana";
import {
    BitcoinNetwork,
    CtorChainData
} from "crosslightning-sdk-base";
import {BitcoinRpc, IStorageManager} from "crosslightning-base";
import {Connection} from "@solana/web3.js";
import {SolanaChains} from "./SolanaChains";
import {SolanaChainEventsBrowser} from "crosslightning-solana/dist/solana/events/SolanaChainEventsBrowser";
import {SdkChain} from "../ChainInitializer";
import {MultichainSwapperOptions} from "../../MultichainSwapper";

const chainId = "SOLANA" as const;

type SolanaSwapperOptions = {
    rpcUrl: string | Connection,
    dataAccountStorage?: IStorageManager<StoredDataAccount>,
    retryPolicy?: SolanaRetryPolicy,

    btcRelayContract?: string,
    swapContract?: string,

    trustedIntermediary?: string,

    fees?: SolanaFees
};

function getSolanaCtorData(options: MultichainSwapperOptions, bitcoinRpc: BitcoinRpc<any>, network: BitcoinNetwork): CtorChainData<SolanaChainType> {
    const connection = typeof(options.chains.SOLANA.rpcUrl)==="string" ?
        new Connection(options.chains.SOLANA.rpcUrl) :
        options.chains.SOLANA.rpcUrl;

    const Fees = options.chains.SOLANA.fees ?? new SolanaFees(connection, 200000, 4, 100);
    const btcRelay = new SolanaBtcRelay(connection, bitcoinRpc, options.chains.SOLANA.btcRelayContract ?? SolanaChains[network].addresses.btcRelayContract, Fees);
    const swapContract = new SolanaSwapProgram(
        connection,
        btcRelay,
        options.chains.SOLANA.dataAccountStorage || options.storageCtor("solAccounts"),
        options.chains.SOLANA.swapContract ?? SolanaChains[network].addresses.swapContract,
        options.chains.SOLANA.retryPolicy ?? {transactionResendInterval: 1000},
        Fees
    )
    const chainEvents = new SolanaChainEventsBrowser(connection, swapContract);

    return {
        btcRelay,
        swapContract,
        chainEvents,
        swapDataConstructor: SolanaSwapData,
        defaultTrustedIntermediaryUrl: options.chains.SOLANA.trustedIntermediary ?? SolanaChains[network].trustedSwapForGasUrl,
        //These are defined here to keep the data from old SolLightning-sdk, not needed for other chains
        storage: {
            toBtc: options.storageCtor("SOLv4-"+options.bitcoinNetwork+"-Swaps-ToBTC"),
            toBtcLn: options.storageCtor("SOLv4-"+options.bitcoinNetwork+"-Swaps-ToBTCLN"),
            fromBtc: options.storageCtor("SOLv4-"+options.bitcoinNetwork+"-Swaps-FromBTC"),
            fromBtcLn: options.storageCtor("SOLv4-"+options.bitcoinNetwork+"-Swaps-FromBTCLN"),
            lnForGas: options.storageCtor("SOLv4-"+options.bitcoinNetwork+"-Swaps-LnForGas")
        }
    }
}

const SolanaAssets = {
    WBTC: {
        address: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
        decimals: 8
    },
    USDC: {
        address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        decimals: 6
    },
    USDT: {
        address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        decimals: 6
    },
    SOL: {
        address: "So11111111111111111111111111111111111111112",
        decimals: 9
    },
    BONK: {
        address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        decimals: 5
    }
} as const;

export type SdkSolanaType = {
    ChainType: SolanaChainType,
    Options: SolanaSwapperOptions,
    Assets: typeof SolanaAssets
};

export const SdkSolana: SdkChain<SdkSolanaType> = {
    getCtorData: getSolanaCtorData,
    assets: SolanaAssets,
    chainIdentifier: chainId
} as const;
