"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SdkStarknet = void 0;
const sdk_lib_1 = require("@atomiqlabs/sdk-lib");
const starknet_1 = require("starknet");
const chain_starknet_1 = require("@atomiqlabs/chain-starknet");
const chainId = "STARKNET";
function getStarknetCtorData(options, bitcoinRpc, network) {
    var _a, _b;
    const provider = typeof (options.chains.STARKNET.rpcUrl) === "string" ?
        new starknet_1.RpcProvider({ nodeUrl: options.chains.STARKNET.rpcUrl }) :
        options.chains.STARKNET.rpcUrl;
    const Fees = (_a = options.chains.STARKNET.fees) !== null && _a !== void 0 ? _a : new chain_starknet_1.StarknetFees(provider, "ETH");
    const chainId = (_b = options.chains.STARKNET.chainId) !== null && _b !== void 0 ? _b : (options.bitcoinNetwork === sdk_lib_1.BitcoinNetwork.MAINNET ? starknet_1.constants.StarknetChainId.SN_MAIN : starknet_1.constants.StarknetChainId.SN_SEPOLIA);
    const btcRelay = new chain_starknet_1.StarknetBtcRelay(chainId, provider, bitcoinRpc, options.chains.STARKNET.btcRelayContract, options.chains.STARKNET.retryPolicy, Fees);
    const swapContract = new chain_starknet_1.StarknetSwapContract(chainId, provider, btcRelay, options.chains.STARKNET.swapContract, options.chains.STARKNET.retryPolicy, Fees);
    const chainEvents = new chain_starknet_1.StarknetChainEventsBrowser(swapContract);
    return {
        btcRelay,
        swapContract,
        chainEvents,
        swapDataConstructor: chain_starknet_1.StarknetSwapData
    };
}
const StarknetAssets = {
    ETH: {
        address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
        decimals: 18,
        displayDecimals: 9
    },
    STRK: {
        address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
        decimals: 18,
        displayDecimals: 9
    }
};
exports.SdkStarknet = {
    getCtorData: getStarknetCtorData,
    assets: StarknetAssets,
    chainIdentifier: chainId
};
