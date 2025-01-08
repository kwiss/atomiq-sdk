import {SolanaKeypairWallet, SolanaSigner, SolanaSwapperWithSigner, MultichainSwapper, Tokens} from "../";
import {Keypair} from "@solana/web3.js";
import * as BN from "bn.js";
import {FileSystemStorageManager} from "@atomiqlabs/sdk-lib/dist/fs-storage";

const solanaRpc = "https://api.mainnet-beta.solana.com";

let solanaSwapper: SolanaSwapperWithSigner;

async function setupSwapper() {
    //Setup the multichain swapper
    const swapper: MultichainSwapper = new MultichainSwapper({
        chains: {
            SOLANA: {
                rpcUrl: solanaRpc
            }
        },
        //The following line is important for running on backend node.js,
        // because the SDK by default uses browser's Indexed DB
        storageCtor: (name: string) => new FileSystemStorageManager(name)
    });
    await swapper.init();

    //Create new random keypair wallet
    const wallet = new SolanaKeypairWallet(Keypair.generate()); //This is just a dummy, you should load the wallet from file, or etc.

    const signer: SolanaSigner = new SolanaSigner(wallet);
    //Extract a Solana specific swapper (used for swapping between Solana and Bitcoin) with a defined signer
    solanaSwapper = swapper.withChain("SOLANA").withSigner(signer);
}

async function createToBtcSwap() {
    const exactIn = false; //exactIn = false, so we specify the output amount
    const amount = new BN(10000); //Amount in BTC base units - sats
    const recipientBtcAddress = "bc1qtw67hj77rt8zrkkg3jgngutu0yfgt9czjwusxt"; //BTC address of the recipient

    const swap = await solanaSwapper.create(
        Tokens.SOLANA.SOL,
        Tokens.BITCOIN.BTC,
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

    //Swap will get automatically claimed by the watchtowers
    await swap.waitTillClaimed();
}

async function main() {
    await setupSwapper();
    // await createToBtcSwap();
    // await createFromBtcSwap();
}

main();
