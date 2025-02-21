import {fromHumanReadableString, SwapperFactory, timeoutSignal} from "../";
import * as BN from "bn.js";
import {FileSystemStorageManager} from "@atomiqlabs/sdk-lib/dist/fs-storage";
import {StarknetInitializer, StarknetInitializerType} from "@atomiqlabs/chain-starknet";
import {SolanaInitializer, SolanaInitializerType} from "@atomiqlabs/chain-solana";

const solanaRpc = "https://api.mainnet-beta.solana.com";
const starknetRpc = "https://starknet-mainnet.public.blastapi.io/rpc/v0_7";

//We initialize a swapper factory, this is important such that we can pick and choose which chains
// we want to support and only install those specific libraries, here Solana & Starknet are used
//NOTE: The "as const" keyword is important here as to let typescript properly infer the
// generic type of the SwapperFactory, allowing you to have code-completion for Tokens and TokenResolver
const Factory = new SwapperFactory<[SolanaInitializerType, StarknetInitializerType]>([SolanaInitializer, StarknetInitializer] as const);
const Tokens = Factory.Tokens;

async function setupSwapper() {
    //Setup the multichain swapper
    const swapper = Factory.newSwapper({
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
        storageCtor: (name: string) => new FileSystemStorageManager(name)
    });
    //Initialize the swapper
    await swapper.init();

    //Extract a Solana specific swapper (used for swapping between Solana and Bitcoin)
    const solanaSwapper = swapper.withChain<"SOLANA">("SOLANA");

    //Create new random keypair wallet
    const signer = solanaSwapper.randomSigner(); //This is just a dummy, you should load the wallet from file, or etc.
    //Or in React, using solana wallet adapter
    //const signer = new SolanaKeypairWallet(useAnchorWallet());

    //Extract a swapper with a defined signer
    return solanaSwapper.withSigner(signer);
}

async function createToBtcSwap() {
    //In real use-cases you would setup the swapper just once, not for every swap!
    const solanaSwapper = await setupSwapper();

    const fromToken = Tokens.SOLANA.SOL;
    const toToken = Tokens.BITCOIN.BTC;
    const exactIn = false; //exactIn = false, so we specify the output amount
    const amount = fromHumanReadableString("0.0001", toToken); //Amount in BTC base units - sats, you can also use fromHumanReadable helper methods
    const recipientBtcAddress = "bc1qtw67hj77rt8zrkkg3jgngutu0yfgt9czjwusxt"; //BTC address of the recipient

    const swap = await solanaSwapper.create(
        fromToken,
        toToken,
        amount,
        exactIn,
        recipientBtcAddress
    );

    //Input amounts
    const inputTokenAmount = swap.getInput().amount;
    const inputValueInUsd = await swap.getInput().usdValue();

    //Output amounts
    const outputTokenAmount = swap.getOutput().amount;
    const outputValueInUsd = await swap.getOutput().usdValue();

    //Initiate the swap by locking up the SOL
    await swap.commit();
    //Wait for bitcoin payout to happen
    const paymentSuccess = await swap.waitForPayment();
    if(paymentSuccess) {
        //Payment was successful, we can get the transaction id
        const bitcoinTxId = swap.getBitcoinTxId();
    } else {
        //If payment is unsuccessful we can refund and get our funds back
        await swap.refund();
    }
}

async function createFromBtcSwap() {
    const solanaSwapper = await setupSwapper();

    const fromToken = Tokens.BITCOIN.BTC;
    const toToken = Tokens.SOLANA.SOL;
    const exactIn = true; //exactIn = true, so we specify the input amount
    const amount = new BN(10000); //Amount in BTC base units - sats

    const swap = await solanaSwapper.create(
        fromToken,
        toToken,
        amount,
        exactIn
    );

    //Input amounts
    const inputTokenAmount = swap.getInput().amount; //Human readable input token amount with decimals
    const inputValueInUsd = await swap.getInput().usdValue(); //Fetches the USD value of the input

    //Output amounts
    const outputTokenAmount = swap.getOutput().amount; //Human readable output token amount with decimals
    const outputValueInUsd = await swap.getOutput().usdValue(); //Fetches the USD value of the output

    //Initiate the swap, this will prompt a Solana transaction, as we need to open the BTC swap address
    await swap.commit();

    const qrCodeData = swap.getQrData(); //Data that can be displayed as QR code - URL with the address and amount
    const bitcoinAddress = swap.getBitcoinAddress(); //Bitcoin address to send the BTC to - exact amount needs to be sent!
    const timeout = swap.getTimeoutTime(); //The BTC should be sent before the timeout

    console.log("Please send exactly "+inputTokenAmount+" BTC to "+bitcoinAddress);

    //Waits for bitcoin transaction to be received
    await swap.waitForBitcoinTransaction(
        null, null,
        (
            txId: string, //Transaction ID received
            confirmations: number, //Current confirmation count of the transaction
            targetConfirmations: number, //Required confirmations for the transaction to be accepted
            transactionETAms: number //Estimated time in milliseconds till the transaction is accepted
        ) => {
            //This callback receives periodic updates about the incoming transaction
            console.log("Tx received: "+txId+" confirmations: "+confirmations+"/"+targetConfirmations+" ETA: "+transactionETAms+" ms");
        }
    ); //This returns as soon as the transaction is accepted

    //Swap should get automatically claimed by the watchtowers, if not we can call swap.claim()
    try {
        await swap.waitTillClaimed(timeoutSignal(30*1000));
    } catch (e) {
        //Claim ourselves when automatic claim doesn't happen in 30 seconds
        await swap.claim();
    }
}

async function main() {
    // await createToBtcSwap();
    // await createFromBtcSwap();
}

main();
