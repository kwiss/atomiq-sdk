import {MultichainSwapper, Tokens} from "../dist";
import {FileSystemStorageManager} from "crosslightning-sdk-base/dist/fs-storage";
import {SolanaKeypairWallet, SolanaSigner} from "crosslightning-solana";
import {Keypair} from "@solana/web3.js";
import * as BN from "bn.js";

const solanaRpc = "https://api.mainnet-beta.solana.com";

async function main() {
    const swapper = new MultichainSwapper({
        chains: {
            SOLANA: {
                rpcUrl: solanaRpc
            }
        },
        intermediaryUrl: "https://127.0.0.1:4000",
        storageCtor: (name: string) => new FileSystemStorageManager(name)
    });
    await swapper.init();

    console.log(swapper);

    const signer = new SolanaSigner(new SolanaKeypairWallet(Keypair.generate()));
    const solanaSwapper = swapper.withChain("SOLANA").withSigner(signer);

    console.log(solanaSwapper);

    // console.log(solanaSwapper.intermediaryDiscovery.intermediaries[0]);
    // const swapService = solanaSwapper.intermediaryDiscovery.intermediaries[0].services[SwapType.FROM_BTCLN];
    // console.log(swapService);
    // console.log(swapService.min.toString());
    // console.log(swapService.max.toString());
    // console.log(swapService.chainTokens);
    // console.log(swapService.chainTokens["SOLANA"]);

    solanaSwapper.create(Tokens.BITCOIN.BTCLN, Tokens.SOLANA.SOL, new BN(10000), true).then(swap => {
        console.log("Swap created! ", swap);
    });
}

main();
