import GLPK, { type LP, type Options, type Result } from "glpk.js";
import { combine, debtTrace, matrixToNum } from "./matrix";

export async function solveMinTransactions(m: [string[],string[][]], timeoutMs?: number, verbose = false): Promise<[string, string, string][] | undefined> {
  const res = await solveGLPK(m[1], timeoutMs, verbose);
  if (!res) {
    return undefined;
  }
  const [mapping,result] = res;
  return Object.entries(result.result.vars).reduce((acc, [vName, vValue]) => {
    if (vName === "result") {
      return acc;
    }

    if (!vName.startsWith("v") || !(vName.endsWith("p") || vName.endsWith("m"))) {
      throw new Error("illegal state in glpk");
    }

    const i = Number.parseInt(vName.slice(1,-1), 10);
    if (Number.isNaN(i) || i < 0) {
      throw new Error("illegal state in glpk");
    }
    const plus = vName.endsWith("p");
    acc[i] += plus ? vValue : -vValue;

    return acc;
  }, new Array<number>(mapping.length).fill(0)).flatMap((val, idx) => {
    if (val !== 0) {
      const pos = val >= 0;
      return [[m[0][mapping[idx][pos ? 1 : 0]], m[0][mapping[idx][pos ? 0 : 1]], (Math.abs(val)/100).toFixed(2)]];
    } else {
      return [];
    }
  });
}

function arrayWithIdx(m: [number, number][], idx: number) {
  return m.filter(([n1, n2]) => n1 === idx || n2 === idx);
}

export async function solveGLPK(
  m: string[][],
  timeoutMs?: number,
  verbose = false,
  logFunction?: (s: Result) => void,
  cplex?: (s: string) => void
): Promise<[[number,number][], Result] | undefined> {
  const glpk = await GLPK();
  try {
    const m_ = matrixToNum(m);
    const vars = Array.from(combine(m_.length));
    const trace = debtTrace(m_);
    console.assert(
      trace.reduce((a, b) => a + b, 0) === 0,
      "debt trace is not equal zero"
    );
    // const one = trace[0] >= 0 ? 1 : -1;
    const one = 1;

    const subjectTo = trace.map((r, idx) => {
      return {
        name: `t${idx}`,
        vars: arrayWithIdx(vars, idx).flatMap((n) => {
          const [n1] = n;
          const inv = n1 === idx;
          return [
            {
              name: `v${vars.indexOf(n)}p`,
              coef: inv ? one : -one,
            },
            {
              name: `v${vars.indexOf(n)}m`,
              coef: inv ? -one : one,
            },
          ];
        }),
        bnds: { type: glpk.GLP_FX, ub: r, lb: r },
      };
    });

    const generals = vars.flatMap((_, idx) => [`v${idx}p`, `v${idx}m`]);

    // const binaries = ['inv'];

    const bounds = vars.flatMap((_, idx) => {
      return [
        { name: `v${idx}p`, type: glpk.GLP_LO, ub: 0, lb: 0 },
        { name: `v${idx}m`, type: glpk.GLP_LO, ub: 0, lb: 0 },
      ];
    });

    const binaries: string[] = [];

    const ilp: LP = {
      name: "PF",
      objective: {
        direction: glpk.GLP_MIN,
        name: "obj",
        vars: vars.flatMap((_, idx) => {
          return [
            {
              name: `v${idx}p`,
              coef: 1,
            },
            {
              name: `v${idx}m`,
              coef: 1,
            },
          ];
        }),
      },

      subjectTo: [
        ...subjectTo,
      ],
      bounds: [...bounds],
      generals: [...generals],
      binaries: [...binaries],
    };

    const options: Options = {
      ...(timeoutMs !== undefined && {tmlim: timeoutMs/1000}),
      // msglev: logFunction ? glpk.GLP_MSG_ALL : glpk.GLP_MSG_OFF,
      msglev: verbose ? glpk.GLP_MSG_ALL : glpk.GLP_MSG_OFF,
      presol: true,
      ...(logFunction && {
        cb: {
          each: 1,
          call: logFunction,
        },
      }),
    };

    if (cplex) {
      cplex(await glpk.write(ilp));
    }

    const r = await glpk.solve(ilp, options);
    if (r.result.status !== glpk.GLP_OPT) {
      return undefined;
    }

    return [vars,r];
  } finally {
    "terminate" in glpk && glpk.terminate();
  }
}
