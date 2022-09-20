<script setup lang="ts">
import { solveGLPK } from '@/util/glpk';
import { optimize } from '@/util/settlement';
import { randomUUID } from '@/util/randomuuid';
import type { Result } from 'glpk.js';
import { ref } from 'vue';

const logoutput = ref<HTMLTextAreaElement | null>(null);
const preview = ref<HTMLTextAreaElement | null>(null);

const logstr = ref("");
const cplex = ref(false);

const v = ref<{
    agent: string,
    v: {
        uuid: string,
        name: string,
        d: number[],
        error: boolean
    }[]
}>({
    agent: navigator.userAgent,
    v: []
});

function writeLog(s: string) {
    logstr.value += s + "\n";
}

function writeResult(r: Result) {
    void(r);
    // logstr.value += JSON.stringify(r, undefined, 2) + "\n";
}

type GLPK_TEST_DATA = string[][]
type PATCAS_TEST_DATA = [string, string][]

// const TESTS = import.meta.glob('/src/data/*.json');
const TESTS = import.meta.glob<{default: object}>('/src/data/*.json');

function writeCPLEX(cplex: string) {
    logstr.value += "--- >8 CPLEX-LP ---\n";
    logstr.value += cplex;
    logstr.value += "--- >8 CPLEX-LP ---\n";
}

async function testGlpk(data: object, run: number) {
    const r = await solveGLPK(data as GLPK_TEST_DATA, undefined, true, writeResult, run === 0 && cplex.value ? writeCPLEX : undefined);
    console.assert(r?.[1].result.status === 5, "result not optimal");
    return;
}

async function testPatcas(data: object) {
    return await optimize(data as PATCAS_TEST_DATA);
}

const perfTests = [
    {
        name: "glpk: empty",
        file: "glpk-empty",
        function: testGlpk,
    },
    {
        name: "glpk: 4 nodes 6 edges",
        file: "glpk-n4-e6",
        function: testGlpk,
    },
    {
        name: "glpk: 8 nodes 28 edges",
        file: "glpk-n8-e28",
        function: testGlpk,
    },
    {
        name: "glpk: 16 nodes 120 edges",
        file: "glpk-n16-e120",
        function: testGlpk,
    },
    {
        name: "glpk: 32 nodes 496 edges",
        file: "glpk-n32-e496",
        function: testGlpk,
    },
    {
        name: "glpk: 64 nodes 2016 edges",
        file: "glpk-n64-e2016",
        function: testGlpk,
    },
    {
        name: "glpk: 128 nodes 8128 edges",
        file: "glpk-n128-e8128",
        function: testGlpk,
    },
    {
        name: "glpk: 3 nodes",
        file: "glpk-n3",
        function: testGlpk,
    },
    {
        name: "glpk: 4 nodes",
        file: "glpk-n4",
        function: testGlpk,
    },
    {
        name: "glpk: 5 nodes",
        file: "glpk-n5",
        function: testGlpk,
    },
    {
        name: "glpk: 6 nodes",
        file: "glpk-n6",
        function: testGlpk,
    },
    {
        name: "glpk: 7 nodes",
        file: "glpk-n7",
        function: testGlpk,
    },
    {
        name: "glpk: 8 nodes",
        file: "glpk-n8",
        function: testGlpk,
    },
    {
        name: "glpk: 9 nodes",
        file: "glpk-n9",
        function: testGlpk,
    },
    {
        name: "glpk: 10 nodes",
        file: "glpk-n10",
        function: testGlpk,
    },
    {
        name: "glpk: 11 nodes",
        file: "glpk-n11",
        function: testGlpk,
    },
    {
        name: "glpk: 12 nodes",
        file: "glpk-n12",
        function: testGlpk,
    },
    {
        name: "glpk: 13 nodes",
        file: "glpk-n13",
        function: testGlpk,
    },
    {
        name: "glpk: 14 nodes",
        file: "glpk-n14",
        function: testGlpk,
    },
    {
        name: "glpk: 15 nodes",
        file: "glpk-n15",
        function: testGlpk,
    },
    {
        name: "glpk: 16 nodes",
        file: "glpk-n16",
        function: testGlpk,
    },
    {
        name: "glpk: 17 nodes",
        file: "glpk-n17",
        function: testGlpk,
    },
    {
        name: "glpk: 18 nodes",
        file: "glpk-n18",
        function: testGlpk,
    },
    {
        name: "glpk: 19 nodes",
        file: "glpk-n19",
        function: testGlpk,
    },
    {
        name: "glpk: 20 nodes",
        file: "glpk-n20",
        function: testGlpk,
    },{
        name: "patcas: 3 nodes",
        file: "patcas-n3",
        function: testPatcas,
    },
    {
        name: "patcas: 4 nodes",
        file: "patcas-n4",
        function: testPatcas,
    },
    {
        name: "patcas: 5 nodes",
        file: "patcas-n5",
        function: testPatcas,
    },
    {
        name: "patcas: 6 nodes",
        file: "patcas-n6",
        function: testPatcas,
    },
    {
        name: "patcas: 7 nodes",
        file: "patcas-n7",
        function: testPatcas,
    },
    {
        name: "patcas: 8 nodes",
        file: "patcas-n8",
        function: testPatcas,
    },
    {
        name: "patcas: 9 nodes",
        file: "patcas-n9",
        function: testPatcas,
    },
    {
        name: "patcas: 10 nodes",
        file: "patcas-n10",
        function: testPatcas,
    },
    {
        name: "patcas: 11 nodes",
        file: "patcas-n11",
        function: testPatcas,
    },
    {
        name: "patcas: 12 nodes",
        file: "patcas-n12",
        function: testPatcas,
    },
    {
        name: "patcas: 13 nodes",
        file: "patcas-n13",
        function: testPatcas,
    },
    {
        name: "patcas: 14 nodes",
        file: "patcas-n14",
        function: testPatcas,
    },
    {
        name: "patcas: 15 nodes",
        file: "patcas-n15",
        function: testPatcas,
    },
    {
        name: "patcas: 16 nodes",
        file: "patcas-n16",
        function: testPatcas,
    },
    {
        name: "patcas: 17 nodes",
        file: "patcas-n17",
        function: testPatcas,
    },
    {
        name: "patcas: 18 nodes",
        file: "patcas-n18",
        function: testPatcas,
    },
    {
        name: "patcas: 19 nodes",
        file: "patcas-n19",
        function: testPatcas,
    },
    {
        name: "patcas: 20 nodes",
        file: "patcas-n20",
        function: testPatcas,
    }
];

function geomMean(ns: number[]) {
    return Math.pow(ns.reduce((a,b) => a*b), 1/ns.length);
}

const NUM_RUNS = 10;
async function startBenchmarking() {
    for (const pt of perfTests) {
        writeLog(`Running test: ${pt.name}...`);
        let error = false;
        const benchs: number[] = [];
        try {
            const file = `/src/data/${pt.file}.json`;
            const data = (await (TESTS[file]())).default;
            for (let run = 0; run < NUM_RUNS; run++) {
                const start = performance.now();
                let end : number;
                try {
                    await pt.function(data, run);
                } finally {
                    end = performance.now();
                }
                benchs.push(end-start);
            }
        } catch (e) {
            console.error(e);
            writeLog(JSON.stringify(e, undefined, 2));
            error = true;
        }
        writeLog(`done (time elapsed (geometric mean ${NUM_RUNS} runs): ${geomMean(benchs)} ms; errors: ${error.toString()})\n`);
        v.value.v.push({
            uuid: randomUUID(),
            name: pt.name,
            d: benchs,
            error: error
        });
    }
    return null;
}

const SUBMISSION_URL = new URL("https://tes.dsn.kastel.kit.edu/perf");
async function submitPerflog() {
    await fetch(SUBMISSION_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(v.value)
    })
    return null;
}

</script>

<template>
    <div class="perfgrid">
        <a href="https://tes.dsn.kastel.kit.edu/perfresult.jsonl" target="_blank"><strong>Results</strong></a>
        <div>
            <input id="cplex" type="checkbox" v-model="cplex" />
            <label for="cplex" style="padding-left: 1ch;">CPLEX-LP output for GLPK benchmarks</label>
        </div>
        <input type="button" @click="startBenchmarking" value="Run benchmarks" />
        <label for="logoutput"><strong>log output (additional logs are available in the web console):</strong></label>
        <textarea id="logoutput" ref="logoutput" cols="80" rows="25" :value="logstr" disabled></textarea>
        <input type="button" @click='logstr = ""; v.v = [];' value="Clear log" />
        <label for="preview"><strong>Submission to server:</strong></label>
        <textarea id="preview" ref="preview" cols="80" rows="25" :value="JSON.stringify(v, undefined, 2)" disabled>
        </textarea>
        <input type="button" @click="submitPerflog" value="Submit performance log" />
    </div>
</template>

<style scoped>
.perfgrid {
    padding-left: 1em;
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: start;
}

</style>
