"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var __1 = require("../");
var chain_starknet_1 = require("@atomiqlabs/chain-starknet");
var chain_solana_1 = require("@atomiqlabs/chain-solana");
var solanaRpc = "https://api.mainnet-beta.solana.com";
var starknetRpc = "https://starknet-mainnet.public.blastapi.io/rpc/v0_7";
//We initialize a swapper factory, this is important such that we can pick and choose which chains
// we want to support and only install those specific libraries, here Solana & Starknet are used
//NOTE: The "as const" keyword is important here as to let typescript properly infer the
// generic type of the SwapperFactory, allowing you to have code-completion for Tokens and TokenResolver
var Factory = new __1.SwapperFactory([chain_solana_1.SolanaInitializer, chain_starknet_1.StarknetInitializer]);
var Tokens = Factory.Tokens;
function setupSwapper() {
    return __awaiter(this, void 0, void 0, function () {
        var swapper, solanaSwapper, signer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    swapper = Factory.newSwapper({
                        chains: {
                            SOLANA: {
                                rpcUrl: solanaRpc
                            },
                            STARKNET: {
                                rpcUrl: starknetRpc
                            }
                        },
                        //The following line is important for running on backend node.js,
                        // because the SDK by default uses browser's Indexed DB, which is not available in node
                        swapStorage: function (chainId) { return null; },
                        noEvents: true,
                        noTimers: true,
                        dontCheckPastSwaps: true,
                        dontFetchLPs: true
                    });
                    //Initialize the swapper
                    return [4 /*yield*/, swapper.init()];
                case 1:
                    //Initialize the swapper
                    _a.sent();
                    solanaSwapper = swapper.withChain("SOLANA");
                    signer = solanaSwapper.randomSigner();
                    //Or in React, using solana wallet adapter
                    //const signer = new SolanaKeypairWallet(useAnchorWallet());
                    //Extract a swapper with a defined signer
                    return [2 /*return*/, solanaSwapper.withSigner(signer)];
            }
        });
    });
}
function createToBtcSwap() {
    return __awaiter(this, void 0, void 0, function () {
        var solanaSwapper, fromToken, toToken, exactIn, amount, recipientBtcAddress, swap, inputTokenAmount, inputValueInUsd, outputTokenAmount, outputValueInUsd, paymentSuccess, bitcoinTxId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setupSwapper()];
                case 1:
                    solanaSwapper = _a.sent();
                    fromToken = Tokens.SOLANA.SOL;
                    toToken = Tokens.BITCOIN.BTC;
                    exactIn = false;
                    amount = (0, __1.fromHumanReadableString)("0.0001", toToken);
                    recipientBtcAddress = "bc1qtw67hj77rt8zrkkg3jgngutu0yfgt9czjwusxt";
                    return [4 /*yield*/, solanaSwapper.create(fromToken, toToken, amount, exactIn, recipientBtcAddress)];
                case 2:
                    swap = _a.sent();
                    inputTokenAmount = swap.getInput().amount;
                    return [4 /*yield*/, swap.getInput().usdValue()];
                case 3:
                    inputValueInUsd = _a.sent();
                    outputTokenAmount = swap.getOutput().amount;
                    return [4 /*yield*/, swap.getOutput().usdValue()];
                case 4:
                    outputValueInUsd = _a.sent();
                    //Initiate the swap by locking up the SOL
                    return [4 /*yield*/, swap.commit()];
                case 5:
                    //Initiate the swap by locking up the SOL
                    _a.sent();
                    return [4 /*yield*/, swap.waitForPayment()];
                case 6:
                    paymentSuccess = _a.sent();
                    if (!paymentSuccess) return [3 /*break*/, 7];
                    bitcoinTxId = swap.getBitcoinTxId();
                    return [3 /*break*/, 9];
                case 7: 
                //If payment is unsuccessful we can refund and get our funds back
                return [4 /*yield*/, swap.refund()];
                case 8:
                    //If payment is unsuccessful we can refund and get our funds back
                    _a.sent();
                    _a.label = 9;
                case 9: return [2 /*return*/];
            }
        });
    });
}
function createFromBtcSwap() {
    return __awaiter(this, void 0, void 0, function () {
        var solanaSwapper, fromToken, toToken, exactIn, amount, swap, inputTokenAmount, inputValueInUsd, outputTokenAmount, outputValueInUsd, qrCodeData, bitcoinAddress, timeout, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setupSwapper()];
                case 1:
                    solanaSwapper = _a.sent();
                    fromToken = Tokens.BITCOIN.BTC;
                    toToken = Tokens.SOLANA.SOL;
                    exactIn = true;
                    amount = BigInt(10000);
                    return [4 /*yield*/, solanaSwapper.create(fromToken, toToken, amount, exactIn)];
                case 2:
                    swap = _a.sent();
                    inputTokenAmount = swap.getInput().amount;
                    return [4 /*yield*/, swap.getInput().usdValue()];
                case 3:
                    inputValueInUsd = _a.sent();
                    outputTokenAmount = swap.getOutput().amount;
                    return [4 /*yield*/, swap.getOutput().usdValue()];
                case 4:
                    outputValueInUsd = _a.sent();
                    //Initiate the swap, this will prompt a Solana transaction, as we need to open the BTC swap address
                    return [4 /*yield*/, swap.commit()];
                case 5:
                    //Initiate the swap, this will prompt a Solana transaction, as we need to open the BTC swap address
                    _a.sent();
                    qrCodeData = swap.getQrData();
                    bitcoinAddress = swap.getBitcoinAddress();
                    timeout = swap.getTimeoutTime();
                    console.log("Please send exactly " + inputTokenAmount + " BTC to " + bitcoinAddress);
                    //Waits for bitcoin transaction to be received
                    return [4 /*yield*/, swap.waitForBitcoinTransaction(null, null, function (txId, //Transaction ID received
                        confirmations, //Current confirmation count of the transaction
                        targetConfirmations, //Required confirmations for the transaction to be accepted
                        transactionETAms //Estimated time in milliseconds till the transaction is accepted
                        ) {
                            //This callback receives periodic updates about the incoming transaction
                            console.log("Tx received: " + txId + " confirmations: " + confirmations + "/" + targetConfirmations + " ETA: " + transactionETAms + " ms");
                        })];
                case 6:
                    //Waits for bitcoin transaction to be received
                    _a.sent(); //This returns as soon as the transaction is accepted
                    _a.label = 7;
                case 7:
                    _a.trys.push([7, 9, , 11]);
                    return [4 /*yield*/, swap.waitTillClaimed((0, __1.timeoutSignal)(30 * 1000))];
                case 8:
                    _a.sent();
                    return [3 /*break*/, 11];
                case 9:
                    e_1 = _a.sent();
                    //Claim ourselves when automatic claim doesn't happen in 30 seconds
                    return [4 /*yield*/, swap.claim()];
                case 10:
                    //Claim ourselves when automatic claim doesn't happen in 30 seconds
                    _a.sent();
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/];
        });
    });
}
main();
