# atomiqlabs SDK

A typescript multichain client for atomiqlabs trustlesss cross-chain swaps. Enables trustless swaps between smart chains (Solana, EVM, Starknet, etc.) and bitcoin (on-chain - L1 and lightning network - L2).

## Installation
```
npm install @atomiqlabs/sdk
```

## Installing chain-specific connectors

You can install only the chain-specific connectors that your project requires

```
npm install @atomiqlabs/chain-solana
npm install @atomiqlabs/chain-starknet
```

## How to use?

### Preparations

Set Solana & Starknet RPC URL to use

```typescript
const solanaRpc = "https://api.mainnet-beta.solana.com";
const starknetRpc = "https://starknet-mainnet.public.blastapi.io/rpc/v0_7";
```

Create swapper factory, here we can pick and choose which chains we want to have supported in the SDK, ensure the "as const" keyword is used such that the typescript compiler can properly infer the types.

```typescript
const Factory = new SwapperFactory<[SolanaInitializerType, StarknetInitializerType]>([SolanaInitializer, StarknetInitializer] as const);
const Tokens = Factory.Tokens; //Get the supported tokens for all the specified chains.
```

#### Browser

This uses browser's Indexed DB by default

```typescript
const swapper = Factory.newSwapper({
    chains: {
        SOLANA: {
            rpcUrl: solanaRpc //You can also pass Connection object here
        },
        STARKNET: {
            rpcUrl: starknetRpc //You can also pass Provider object here
        }
    },
    bitcoinNetwork: BitcoinNetwork.TESTNET //or BitcoinNetwork.MAINNET - this also sets the network to use for Solana (solana devnet for bitcoin testnet) & Starknet (sepolia for bitcoin testnet)
});
```

#### NodeJS

For NodeJS we need to explicitly use filesystem storage

```typescript
const swapper = Factory.newSwapper({
    chains: {
        SOLANA: {
            rpcUrl: solanaRpc //You can also pass Connection object here
        },
        STARKNET: {
            rpcUrl: starknetRpc //You can also pass Provider object here
        }
    },
    bitcoinNetwork: BitcoinNetwork.TESTNET, //or BitcoinNetwork.MAINNET - this also sets the network to use for Solana (solana devnet for bitcoin testnet) & Starknet (sepolia for bitcoin testnet)
    //The following line is important for running on backend node.js,
    // because the SDK by default uses browser's Indexed DB
    storageCtor: (name: string) => new FileSystemStorageManager(name)
});
```

### Signer

```typescript
//React, using solana wallet adapter
const anchorWallet = useAnchorWallet();
const wallet = new SolanaSigner(anchorWallet);
```

```typescript
//Browser, using get-starknet
const swo = await connect();
const wallet = new StarknetSigner(new WalletAccount(starknetRpc, swo.wallet));
```

or

```typescript
//Creating a random signer
const wallet = swapper.randomSigner<"SOLANA">("SOLANA");
```

### Initialization

Initialize the swapper

```typescript
await swapper.init();
```

Now we have the multichain swapper initialized

### Extract chain-specific swapper with signer

To make it easier to do swaps between bitcoin and a specific chain we can extract a chain-specific swapper, and also set a signer.

```typescript
const solanaSwapper = swapper.withChain<"SOLANA">("SOLANA").withSigner(signer);
```

### Bitcoin on-chain swaps

#### Swap Smart chain -> Bitcoin on-chain

Initiating & executing the swap.

```typescript
const _exactIn = false; //exactIn = false, so we specify the output amount
const _amount = 10000n; //Amount in BTC base units - sats
const _address = "bc1qtw67hj77rt8zrkkg3jgngutu0yfgt9czjwusxt"; //BTC address of the recipient

//Create the swap: swapping SOL to Bitcoin on-chain, receiving _amount of satoshis (smallest unit of bitcoin) to _address
const swap = await solanaSwapper.create(
    Tokens.SOLANA.SOL,
    Tokens.BITCOIN.BTC,
    _amount,
    _exactIn,
    _address
);

//Get the amount required to pay and fee
const amountToBePaid: string = swap.getInput().amount; //Human readable amount to be paid on the Solana side (including fee)
const fee: string = swap.getFee().amountInSrcToken.amount; //Human readable swap fee paid on the Solana side (already included in the the above amount)

//Get swap expiration time
const expiry: number = swap.getExpiry(); //Expiration time of the swap in UNIX milliseconds, swap needs to be initiated before this time

//Initiate and pay for the swap
await swap.commit();

//Wait for the swap to conclude
const result: boolean = await swap.waitForPayment();
if(!result) {
    //Swap failed, money can be refunded
    await swap.refund();
} else {
    //Swap successful, we can get the bitcoin txId
    const bitcoinTxId = swap.getBitcoinTxId();
}
```

##### Swap states

- ToBTCSwapState.REFUNDED = -3
  - Swap failed and was successfully refunded
- ToBTCSwapState.QUOTE_EXPIRED = -2
  - Swap quote expired and cannot be executed anymore
- ToBTCSwapState.QUOTE_SOFT_EXPIRED = -1
  - Swap quote soft-expired (i.e. the quote probably expired, but if there is already an initialization transaction sent it might still succeed)
- ToBTCSwapState.CREATED = 0
  - Swap quote is created, waiting to be executed
- ToBTCSwapState.COMMITED = 1,
  - Swap was initiated (init transaction sent)
- ToBTCSwapState.SOFT_CLAIMED = 2,
  - Swap was processed by the counterparty but not yet claimed on-chain (bitcoin transaction was sent, but unconfirmed yet)
- ToBTCSwapState.CLAIMED = 3
  - Swap was finished and funds were successfully claimed by the counterparty
- ToBTCSwapState.REFUNDABLE = 4
  - Swap was initiated but counterparty failed to process it, the user can now refund his funds

#### Swap Bitcoin on-chain -> Smart chain

Initiating & executing the swap.

```typescript
const _exactIn = true; //exactIn = true, so we specify the input amount
const _amount = fromHumanReadableString("0.0001", Tokens.BITCOIN.BTC); //Amount in BTC base units - sats, we can also use a utility function here

//Create the swap: swapping _amount of satoshis of Bitcoin on-chain to SOL
const swap = await solanaSwapper.create(
    Tokens.BITCOIN.BTC,
    Tokens.SOLANA.SOL,
    _amount,
    _exactIn
);

//Get the amount required to pay, amount to be received and fee
const amountToBePaidOnBitcoin: string = swap.getInput().amount; //Human readable amount of BTC that needs to be send to the BTC swap address
const amountToBeReceivedOnSolana: string = swap.getOutput().amount; //Human readable amount SOL that will be received on Solana
const fee: string = swap.getFee().amountInSrcToken.amount; //Human readable fee in BTC

//Get swap offer expiration time
const expiry: number = swap.getExpiry(); //Expiration time of the swap offer in UNIX milliseconds, swap needs to be initiated before this time

//Get security deposit amount (Human readable amount of SOL that needs to be put down to rent the liquidity from swap intermediary), you will get this deposit back if the swap succeeds
const securityDeposit: string = swap.getSecurityDeposit().amount;
//Get claimer bounty (Human readable amount of SOL reserved as a reward for watchtowers to claim the swap on your behalf)
const claimerBounty: string = swap.getClaimerBounty().amount;

//Once client is happy with swap offer, we can send a Solana transaction that initiates the swap by opening a bitcoin swap address
await swap.commit();

//Get the bitcoin address
const receivingAddressOnBitcoin = swap.getAddress();
//Get the QR code data (contains the address and amount)
const qrCodeData = swap.getQrData(); //Data that can be displayed in the form of QR code
//Get the bitcoin swap address timeout (in UNIX millis), a transaction needs to be made in under this time
const expiryTime = swap.getTimeoutTime();

try {
    //Wait for the payment to arrive
    await swap.waitForPayment(
        null, null,
        (
            txId: string, //Transaction ID of the received bitcoin transaction
            confirmations: number, //Current confirmations of the transaction
            targetConfirmations: number, //Required confirmations
            transactionETAms: number //Estimated in time (in milliseconds) until when the transaction will receive required amount of confirmations
        ) => {
            //Callback for transaction updates
        }
    );
} catch(e) {
    //Error occurred while waiting for payment, this is most likely due to network errors
    return;
}

//Swap should get automatically claimed by the watchtowers, if not we can call swap.claim() ourselves
try {
    await swap.waitTillClaimed(timeoutSignal(30*1000));
} catch (e) {
    //Claim ourselves when automatic claim doesn't happen in 30 seconds
    await swap.claim();
}
```

##### Swap states

- FromBTCSwapState.EXPIRED = -3
  - Bitcoin swap address expired
- FromBTCSwapState.QUOTE_EXPIRED = -2
  - Swap quote expired and cannot be executed anymore
- FromBTCSwapState.QUOTE_SOFT_EXPIRED = -1
  - Swap quote soft-expired (i.e. the quote probably expired, but if there is already an initialization transaction sent it might still succeed)
- FromBTCSwapState.PR_CREATED = 0
  - Swap quote is created, waiting for the user to open a bitcoin swap address
- FromBTCSwapState.CLAIM_COMMITED = 1
  - Bitcoin swap address is opened
- FromBTCSwapState.BTC_TX_CONFIRMED = 2
  - Bitcoin transaction sending funds to the swap address is confirmed
- FromBTCSwapState.CLAIM_CLAIMED = 3
  - Swap funds are claimed to the user's wallet

### Bitcoin lightning network swaps

#### Swap Smart chain -> Bitcoin lightning network

```typescript
//Destination lightning network invoice, amount needs to be part of the invoice!
const _lightningInvoice = "lnbc10u1pj2q0g9pp5ejs6m677m39cznpzum7muruvh50ys93ln82p4j9ks2luqm56xxlshp52r2anlhddfa9ex9vpw9gstxujff8a0p8s3pzvua930js0kwfea6scqzzsxqyz5vqsp5073zskc5qfgp7lre0t6s8uexxxey80ax564hsjklfwfjq2ew0ewq9qyyssqvzmgs6f8mvuwgfa9uqxhtza07qem4yfhn9wwlpskccmuwplsqmh8pdy6c42kqdu8p73kky9lsnl40qha5396d8lpgn90y27ltfc5rfqqq59cya";

//Create the swap: swapping SOL to Bitcoin lightning
const swap = await solanaSwapper.create(
    Tokens.SOLANA.SOL,
    Tokens.BITCOIN.BTCLN,
    null,
    false,
    _lightningInvoice
);

//Get the amount required to pay and fee
const amountToBePaid: string = swap.getInput().amount; //Human readable amount to be paid on the Solana side (including fee)
const fee: string = swap.getFee().amountInSrcToken.amount; //Human readable swap fee paid on the Solana side (already included in the the above amount)

//Get swap expiration time
const expiry: number = swap.getExpiry(); //Expiration time of the swap in UNIX milliseconds, swap needs to be initiated before this time

//Initiate and pay for the swap
await swap.commit();

//Wait for the swap to conclude
const result: boolean = await swap.waitForPayment();
if(!result) {
    //Swap failed, money can be refunded
    await swap.refund();
} else {
    //Swap successful, we can get the lightning payment secret pre-image, which acts as a proof of payment
    const lightningSecret = swap.getSecret();
}
```

##### Swap states

- ToBTCSwapState.REFUNDED = -3
    - Swap failed and was successfully refunded
- ToBTCSwapState.QUOTE_EXPIRED = -2
    - Swap quote expired and cannot be executed anymore
- ToBTCSwapState.QUOTE_SOFT_EXPIRED = -1
    - Swap quote soft-expired (i.e. the quote probably expired, but if there is already an initialization transaction sent it might still succeed)
- ToBTCSwapState.CREATED = 0
    - Swap quote is created, waiting to be executed
- ToBTCSwapState.COMMITED = 1,
    - Swap was initiated (init transaction sent)
- ToBTCSwapState.SOFT_CLAIMED = 2,
    - Swap was processed by the counterparty but not yet claimed on-chain (lightning network payment secret was revealed)
- ToBTCSwapState.CLAIMED = 3
    - Swap was finished and funds were successfully claimed by the counterparty
- ToBTCSwapState.REFUNDABLE = 4
    - Swap was initiated but counterparty failed to process it, the user can now refund his funds

#### Swap Bitcoin lightning network -> Smart chain
```typescript
const _exactIn = true; //exactIn = true, so we specify the input amount
const _amount = 10000n; //Amount in BTC base units - sats

//Create the swap: swapping _amount of satoshis from Bitcoin lightning network to SOL
const swap = await solanaSwapper.create(
    Tokens.BITCOIN.BTCLN,
    Tokens.SOLANA.SOL,
    _amount,
    _exactIn
);

//Get the bitcoin lightning network invoice (the invoice contains pre-entered amount)
const receivingLightningInvoice: string = swap.getLightningInvoice();
//Get the QR code (contains the lightning network invoice)
const qrCodeData: string = swap.getQrData(); //Data that can be displayed in the form of QR code

//Get the amount required to pay, amount to be received and fee
const amountToBePaidOnBitcoin: string = swap.getInput().amount; //Human readable amount of BTC that needs to be send to the BTC swap address
const amountToBeReceivedOnSolana: string = swap.getOutput().amount; //Human readable amount SOL that will be received on Solana
const fee: string = swap.getFee().amountInSrcToken.amount; //Human readable fee in BTC

try {
    //Wait for the lightning payment to arrive
    await swap.waitForPayment();
    //Claim the swap funds - this will initiate 2 transactions
    await swap.commitAndClaim();
    //Or for e.g. starknet which doesn't support signing 2 transactions at once
    // await swap.commit();
    // await swap.claim();
} catch(e) {
    //Error occurred while waiting for payment
}
```

##### Swap states

- FromBTCLNSwapState.FAILED = -4
  - If the claiming of the funds was initiated, but never concluded, the user will get his lightning network payment refunded
- FromBTCLNSwapState.QUOTE_EXPIRED = -3
  - Swap quote expired and cannot be executed anymore
- FromBTCLNSwapState.QUOTE_SOFT_EXPIRED = -2
  - Swap quote soft-expired (i.e. the quote probably expired, but if there is already an initialization transaction sent it might still succeed)
- FromBTCLNSwapState.EXPIRED = -1
  - Lightning network invoice expired, meaning the swap is expired
- FromBTCLNSwapState.PR_CREATED = 0
  - Swap is created, the user should now pay the provided lightning network invoice
- FromBTCLNSwapState.PR_PAID = 1
  - Lightning network invoice payment was received (but cannot be settled by the counterparty yet)
- FromBTCLNSwapState.CLAIM_COMMITED = 2
  - Claiming of the funds was initiated
- FromBTCLNSwapState.CLAIM_CLAIMED = 3
  - Funds were successfully claimed & lightning network secret pre-image revealed, so the lightning network payment will settle now

### Getting state of the swap

You can get the current state of the swap with:

```typescript
const state = swap.getState();
```

You can also set a listener to listen for swap state changes:

```typescript
swap.events.on("swapState", swap => {
    const newState = swap.getState();
});
```

For the meaning of the states please refer to the "Swap state" section under each swap type.

### LNURLs & readable lightning identifiers

LNURLs extend the lightning network functionality by creating static lightning addreses (LNURL-pay & static internet identifiers) and QR codes which allow you to pull funds from them (LNURL-withdraw)

This SDK supports:
* LNURL-pay ([LUD-6](https://github.com/lnurl/luds/blob/luds/06.md), [LUD-9](https://github.com/lnurl/luds/blob/luds/09.md), [LUD-10](https://github.com/lnurl/luds/blob/luds/10.md), [LUD-12](https://github.com/lnurl/luds/blob/luds/12.md))
* LNURL-withdraw ([LUD-3](https://github.com/lnurl/luds/blob/luds/03.md))
* Static internet identifiers ([LUD-16](https://github.com/lnurl/luds/blob/luds/16.md))

#### Differences

Lightning invoices:
* One time use only
* Need to have a fixed amount, therefore recipient has to set the amount
* Static and bounded expiration
* You can only pay to a lightning invoice, not withdraw funds from it

LNURLs & lightning identifiers:
* Reusable
* Programmable expiry
* Allows payer to set an amount
* Supports both, paying (LNURL-pay) and withdrawing (LNURL-withdraw)
* Possibility to attach a message/comment to a payment
* Receive a message/url as a result of the payment

#### Helpers

It is good practice to automatically distinguish between lightning network invoices & LNURLs and adjust the UI accordingly.
Therefore there are a few helper functions to help with that:
```typescript
const isLNInvoice: boolean = swapper.isValidLightningInvoice(_input); //Checks if the input is lightning network invoice
const isLNURL: boolean = swapper.isValidLNURL(_input); //Checks if the input is LNURL or lightning identifier
if(isLNURL) {
    //Get the type of the LNURL
    const result: (LNURLPay | LNURLWithdraw | null) = await swapper.getLNURLTypeAndData(_input);
    if(result.type==="pay") {
        const lnurlPayData: LNURLPay = result;
        const minPayable: bigint = lnurlPayData.min; //Minimum payment amount in satoshis
        const maxPayable: bigint = lnurlPayData.max; //Maximum payment amount in satoshis
        const icon: (string | null) = lnurlPayData.icon; //URL encoded icon that should be displayed on the UI
        const shortDescription: (string | null) = lnurlPayData.shortDescription; //Short description of the payment
        const longDescription: (string | null) = lnurlPayData.longDescription; //Long description of the payment
        const maxCommentLength: (number | 0) = lnurlPayData.commentMaxLength; //Maximum allowed length of the payment message/comment (0 means no comment allowed)
        //Should show a UI displaying the icon, short description, long description, allowing the user to choose an amount he wishes to pay and possibly also a comment
    }
    if(result.type==="withdraw") {
        const lnurlWithdrawData: LNURLWithdraw = result;
        const minWithdrawable: bigint = lnurlWithdrawData.min;
        const maxWithdrawable: bigint = lnurlWithdrawData.max;
        //Should show a UI allowing the user to choose an amount he wishes to withdraw
    }
}
```

#### Swap Smart chain -> Bitcoin lightning network
```typescript
const _lnurlOrIdentifier: string = "lnurl1dp68gurn8ghj7ampd3kx2ar0veekzar0wd5xjtnrdakj7tnhv4kxctttdehhwm30d3h82unvwqhkx6rfvdjx2ctvxyesuk0a27"; //Destination LNURL-pay or readable identifier
const _exactIn = false; //exactIn = false, so we specify the output amount
const _amount: bigint = 10000n; //Amount of satoshis to send (1 BTC = 100 000 000 satoshis)

//Create the swap: swapping SOL to Bitcoin lightning
const swap = await solanaSwapper.create(
    Tokens.SOLANA.SOL,
    Tokens.BITCOIN.BTCLN,
    _amount,
    _exactIn,
    _lnurlOrIdentifier
);

//Get the amount required to pay and fee
const amountToBePaid: string = swap.getInput().amount; //Human readable amount to be paid on the Solana side (including fee)
const fee: string = swap.getFee().amountInSrcToken.amount; //Human readable swap fee paid on the Solana side (already included in the the above amount)

//Get swap expiration time
const expiry: number = swap.getExpiry(); //Expiration time of the swap in UNIX milliseconds, swap needs to be initiated before this time

//Initiate and pay for the swap
await swap.commit();

//Wait for the swap to conclude
const result: boolean = await swap.waitForPayment();
if(!result) {
    //Swap failed, money can be refunded
    await swap.refund();
} else {
    //Swap successful, we can get the lightning payment secret pre-image, which acts as a proof of payment
    const lightningSecret = swap.getSecret();
    //In case the LNURL contained a success action, we can read it now and display it to user
    if(swap.hasSuccessAction()) {
        //Contains a success action that should displayed to the user
        const successMessage = swap.getSuccessAction();
        const description: string = successMessage.description; //Description of the message
        const text: (string | null) = successMessage.text; //Main text of the message
        const url: (string | null) = successMessage.url; //URL link which should be displayed
    }
}
```

#### Swap Bitcoin lightning network -> Smart chain
```typescript
const _lnurl: string = "lnurl1dp68gurn8ghj7ampd3kx2ar0veekzar0wd5xjtnrdakj7tnhv4kxctttdehhwm30d3h82unvwqhkx6rfvdjx2ctvxyesuk0a27"; //Destination LNURL-pay or readable identifier
const _exactIn = true; //exactIn = true, so we specify the input amount
const _amount = 10000n; //Amount in BTC base units - sats

//Create the swap: swapping _amount of satoshis from Bitcoin lightning network to SOL
const swap = await solanaSwapper.create(
    Tokens.BITCOIN.BTCLN,
    Tokens.SOLANA.SOL,
    _amount,
    _exactIn,
    _lnurl
);

//Get the amount of BTC to be withdrawn from LNURL, amount to be received and fee
const amountToBeWithdrawnOnBitcoin: string = swap.getInput().amount; //Human readable amount of BTC that will be withdrawn from the LNURL
const amountToBeReceivedOnSolana: string = swap.getOutput().amount; //Human readable amount SOL that will be received on Solana
const fee: string = swap.getFee().amountInSrcToken.amount; //Human readable fee in BTC

try {
    //Submit the withdraw request & wait for the payment to arrive
    await swap.waitForPayment();
    //Claim the swap funds - this will initiate 2 transactions
    await swap.commitAndClaim();
    //Or for e.g. starknet which doesn't support signing 2 transactions at once
    // await swap.commit();
    // await swap.claim();
} catch(e) {
    //Error occurred while waiting for payment
}
```

### Get refundable swaps
You can refund the swaps in one of two cases:
* In case intermediary is non-cooperative and goes offline, you can claim the funds from the swap contract back after some time.
* In case intermediary tried to pay but was unsuccessful, so he sent you signed message with which you can refund now without waiting.

This call can be checked on every startup and periodically every few minutes.
```typescript
//Get the swaps
const refundableSwaps = await solanaSwapper.getRefundableSwaps();
//Refund all the swaps
for(let swap of refundableSwaps) {
    await swap.refund();
}
```

### Get claimable swaps
Returns swaps that are ready to be claimed by the client, this can happen if client closes the application when a swap is in-progress and the swap is concluded while the client is offline.

```typescript
//Get the swaps
const claimableSwaps = await solanaSwapper.getClaimableSwaps();
//Claim all the claimable swaps
for(let swap of claimableSwaps) {
    if(swap.canCommit()) await swap.commit(); //This is for Bitcoin (lightning) -> Smart chain swaps, where commit & claim procedure might be needed
    await swap.claim();
}
```
