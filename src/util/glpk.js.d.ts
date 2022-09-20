import { type LP, type Result, type Options } from "glpk.js";

declare module "glpk.js" {
    interface GLPK {
        async solve(lp: LP, options?: number | Options): Promise<Result>;
        async write(lp: LP): Promise<string>;
        terminate();
    }
    export default async function(): Promise<GLPK>;
}
