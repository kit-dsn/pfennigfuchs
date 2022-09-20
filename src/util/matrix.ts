export function sumRows(m: number[][]): number[] {
    return m.map((r) => r.reduce((a, b) => a + b, 0));
  }
  
  export function sumColumns(m: number[][]): number[] {
    return m.reduce(
      (acc, curr) => acc.map((b, i) => curr[i] + b),
      new Array<number>(m.length).fill(0)
    );
  }
  
  export function debtTrace(m: number[][]) {
    const rowSum = sumRows(m);
    const columnSum = sumColumns(m);
    return rowSum.map((c, i) => c - columnSum[i]);
  }

  export function parseFloatStrict(num: string): number {
    const n = parseFloat(num);
    if (Number.isNaN(n)) {
      throw new Error(`illegal number: ${String(num)}`);
    }
    return n;
  }
  
  export function matrixToNum(m: string[][]): number[][] {
    return m.map((r) => r.map((e) => Math.trunc(Math.trunc(parseFloatStrict(e) * 1000) / 10)));
  }
  
  export function* combine(l: number): Generator<[number, number]> {
    const ns = Array(l)
      .fill(0)
      .map((_, idx) => idx);
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        yield [ns[i], ns[j]];
      }
    }
  }
  