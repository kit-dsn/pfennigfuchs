import type { UnPromisify } from "@/types/Util";

// import SettlementWorker from "../worker/settlement.ts?worker&inline";

type matrixId = string;
type debt = string;

const TIMEOUT = "settlement worker timed out";

type Result = NonNullable<UnPromisify<ReturnType<typeof optimize>>>;

export async function optimize(balances: Array<[matrixId, debt]>, timeoutMs?: number): Promise<Array<[matrixId, matrixId, debt]> | undefined> {
    // const worker = new SettlementWorker();
    const worker = new Worker(new URL("../worker/settlement.ts", import.meta.url));
    try {
        const p = new Promise<Result>((ok,rej) => {
            worker.onmessage = (e) => {
                if (e.data instanceof Error) {
                    rej(e.data);
                } else {
                    ok(e.data as Result);
                }
            };
            worker.onmessageerror = (e) => {
                console.error(e.data);
                rej(e.data);
            }
            if (timeoutMs !== undefined) {
                setTimeout(() => {
                    rej(TIMEOUT);
                }, timeoutMs);
            }
            worker.postMessage(balances);
        });
        return await p;
    } catch (e) {
        if (typeof e === "string" && e === TIMEOUT) {
            return undefined;
        } else {
            throw e;
        }
    } finally {
        worker.terminate();
    }
}
