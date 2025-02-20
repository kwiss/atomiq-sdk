import { Token } from "@atomiqlabs/sdk-lib";
import * as BN from "bn.js";
export declare function toHumanReadableString(amount: BN, currencySpec: Token): string;
export declare function fromHumanReadableString(amount: string, currencySpec: Token): BN;
/**
 * Returns an abort signal that aborts after a specified timeout in milliseconds
 *
 * @param timeout Milliseconds to wait
 * @param abortReason Abort with this abort reason
 * @param abortSignal Abort signal to extend
 */
export declare function timeoutSignal(timeout: number, abortReason?: any, abortSignal?: AbortSignal): AbortSignal;
