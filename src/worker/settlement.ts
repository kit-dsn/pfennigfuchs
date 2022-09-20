/* eslint-env worker */
declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (msg) => {
    try {
        const result = optimize(msg.data as Parameters<typeof optimize>[0]);
        self.postMessage(result);
    } catch (e) {
        self.postMessage(e);
    } finally {
        self.close();
    }
}

type matrixId = string;
type debt = string;
type subset = number;
type node = number;

export function round(i: ReturnType<typeof optimize>): ReturnType<typeof optimize> {
    return i.map(([u1, u2, a]) => [u1, u2, parseFloat(a).toFixed(2)]);
}

export function optimize(balances: Array<[matrixId, debt]>): Array<[matrixId, matrixId, debt]> {
    const retArray = new Array<[matrixId, matrixId, debt]>;
    if (+balances.filter(b => +b[1] == 0).length >32) {
        const v_star = balances.filter(e=>+e[1] != 0).map(e=>+e)
        const nodes: Array<node> = getNodesFromSubset(1<<v_star.length - 1);
        const creditors: Array<node> = nodes.filter(u => sums[1 << u] < 0);
        const debtors: Array<node> = nodes.filter(u => sums[1 << u] > 0);
        debtors.forEach(debtor => {
            let debt: number = sums[1 << debtor]
            creditors.forEach(creditor => {
                if (!debt || !sums[1<<creditor]) return;
                if (debt + sums[1 << creditor] > 0) {
                    retArray.push([balances[v_star[debtor]][0], balances[v_star[creditor]][0], String(-sums[1 << creditor])]);
                    debt += sums[1 << creditor];
                    sums[1 << creditor] = 0;
                } else {
                    retArray.push([balances[v_star[debtor]][0], balances[v_star[creditor]][0], String(debt)]);
                    sums[1 << creditor] += debt;
                    debt = 0;
                }
            })
        })
        return round(retArray);
    }
    const [v_star, sums, s_0] = createVStarAndSums(balances);
    const [s_0_nonPair, p] = clearPairs(s_0);
    const s_0_nonAtomic = clearNonAtomicSets(s_0_nonPair);
    const [, best_subsets] = buildDP(v_star.length, s_0_nonAtomic, sums);
    p.forEach(pair => {
        const [u, v] = getNodesFromSubset(pair);
        if (sums[1<<u] > 0) {
            retArray.push([balances[v_star[u]][0], balances[v_star[v]][0], String(sums[1 << u])])
        } else {
            retArray.push([balances[v_star[v]][0], balances[v_star[u]][0], String(-sums[1 << u])])
        }
    })
    best_subsets.forEach(subset => {
        const nodes: Array<node> = getNodesFromSubset(subset);
        const creditors: Array<node> = nodes.filter(u => sums[1 << u] < 0);
        const debtors: Array<node> = nodes.filter(u => sums[1 << u] > 0);
        debtors.forEach(debtor => {
            let debt: number = sums[1 << debtor]
            creditors.forEach(creditor => {
                if (!debt || !sums[1<<creditor]) return;
                if (debt + sums[1 << creditor] > 0) {
                    retArray.push([balances[v_star[debtor]][0], balances[v_star[creditor]][0], String(-sums[1 << creditor])]);
                    debt += sums[1 << creditor];
                    sums[1 << creditor] = 0;
                } else {
                    retArray.push([balances[v_star[debtor]][0], balances[v_star[creditor]][0], String(debt)]);
                    sums[1 << creditor] += debt;
                    debt = 0;
                }
            })
        })
    });
    return round(retArray);
}

/**
 * 
 * @param balances 
 * @returns [V*, sums]
 */
export function createVStarAndSums(balances: Array<[matrixId, debt]>): [Array<node>, Array<number>, Array<subset>] {
    const sums: Array<number> = [];
    const v_star: Array<node> = [];
    const s_0: Array<subset> = [];
    balances.forEach((node, index) => {
        if (+node[1]) {
            sums[(2 ** (v_star.length))] = +node[1];
            v_star.push((index));
        }
    });
    const subsets = [...Array(2 ** v_star.length).keys()];
    subsets.forEach((subset, index) => {
        if (subset != 0) {
            sums[subset] = isNaN(sums[subset]) ? 0 : sums[subset];
            v_star.forEach((node, index) => {
                if (subset != 2 ** index && subset & 2 ** index) {
                    sums[subset] = +(sums[subset] + sums[2 ** index]).toFixed(2);
                }
            });
            if (!sums[subset]) {
                s_0.push(index)
            }
        }
    });
    return [v_star, sums, s_0];
}


/**
 * 
 * @param s_0 
 * @returns [S_0, P]
 */
export function clearPairs(s_0: Array<subset>): [Array<subset>, Array<subset>] {
    const inPair: Array<subset> = [];
    const cleanSubsets: Array<subset> = [];
    s_0.forEach(element => {
        if (countSetBits(element) == 2) {
            if (!inPair.some(pair => pair & element)) {
                cleanSubsets.push(element);
                inPair.push(element);
            }
        }
    });
    return [s_0.filter(subset => !inPair.some(pair => pair & subset)), cleanSubsets];
}

/**
 * 
 * @param s_0 
 * @returns S_0
 */
export function clearNonAtomicSets(s_0: Array<subset>): Array<subset> {
    return s_0.filter(subset =>
        !(s_0.some(e => e != subset && (e & subset) == e))
    );
}

/**
 * 
 * @param subset
 * @param s_0 
 * @returns S' for given subset
 */
export function getValidSubsetsFromNumber(subset: subset, s_0: Array<subset>): Array<subset> {
    return s_0.filter(e => (e & subset) == e);
}

export function getNodesFromSubset(subset: subset): Array<node> {
    const nodes = new Array<node>;
    while (subset) {
        const u: number = 31 - Math.clz32(subset);
        nodes.push(u);
        subset &= ~(1 << u);
    }
    return nodes;
}


/**
 * 
 * @param n 
 * @param s_0 
 * @param sums 
 * @returns [subset, DP]
 */
export function buildDP(n: number, s_0: Array<subset>, sums: Array<number>): [Array<[Array<subset>, number]>,  Array<subset>] {
    const subsets = [...Array(2 ** n).keys()].sort((a,b) => countSetBits(a) - countSetBits(b))
    const dp: Array<[Array<subset>, number]> = [];
    subsets.forEach(subset => {
        if (subset === 0) {
            dp[subset] = [[], 0];
        } else if (sums[subset] === 0) {
            const s_dash = getValidSubsetsFromNumber(subset, s_0);
            const tmp: Array<[Array<subset>, number]> = s_dash.filter(e => dp[subset & ~e]).map(e =>[dp[subset & ~e][0].concat(e), dp[subset & ~e][1] + 1]);
            if (tmp.length) {
                const max: [Array<subset>, number] = tmp.reduce((p, c) => c[1] > p[1] ? c : p)
                dp[subset] = max;
            }
        }
    });
    return [dp, dp[dp.length - 1][0]];
}

function countSetBits(n: number) {
    n = n - ((n >> 1) & 0x55555555)
    n = (n & 0x33333333) + ((n >> 2) & 0x33333333)
    return ((n + (n >> 4) & 0xF0F0F0F) * 0x1010101) >> 24
}