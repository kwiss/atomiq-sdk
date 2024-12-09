import {BitcoinNetwork} from "@atomiqlabs/sdk-lib";

export const SolanaChains = {
    [BitcoinNetwork.TESTNET]: {
        addresses: {
            swapContract: "4hfUykhqmD7ZRvNh1HuzVKEY7ToENixtdUKZspNDCrEM",
            btcRelayContract: "3KHSHFpEK6bsjg3bqcxQ9qssJYtRCMi2S9TYVe4q6CQc"
        },
        trustedSwapForGasUrl: "https://node3.gethopa.com:24100"
    },
    [BitcoinNetwork.MAINNET]: {
        addresses: {
            swapContract: "4hfUykhqmD7ZRvNh1HuzVKEY7ToENixtdUKZspNDCrEM",
            btcRelayContract: "3KHSHFpEK6bsjg3bqcxQ9qssJYtRCMi2S9TYVe4q6CQc"
        },
        trustedSwapForGasUrl: "https://node3.gethopa.com:34100"
    }
} as const;
