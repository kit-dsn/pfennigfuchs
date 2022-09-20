<script setup lang="ts">
import RoomNavbar from "@/components/room/RoomNavbar.vue";
import NewExpense from "@/components/NewExpense.vue";
import { useRoomStateStore } from "@/stores/RoomStateStore";
import { optimize } from "@/util/settlement";
import { useMessageStore } from "@/stores/MessageStore";
import { useRoute } from "vue-router";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { solveMinTransactions } from "@/util/glpk";
import OptBalancesResult from "./OptBalancesResult.vue";


const rooms = useRoomStateStore();
const messageStore = useMessageStore();
const route = useRoute();
const roomId = route.params.id as string;

type OptResult = [string,string,string][];

const verbose = ref(false);
const results = ref<OptResult>();

const OPT_TIMEOUT = 1000;
const OPT_MAX_PARTICIPANTS = 20;

function timeout() {
  return verbose.value ? undefined : OPT_TIMEOUT;
}

const patcas = ref<OptResult>();
const glpk = ref<OptResult>();
const simple = ref<OptResult>();

async function calc() {
  let result: [string, string, string][] | undefined;

  if (rooms.getMembers(roomId).length <= OPT_MAX_PARTICIPANTS || verbose.value) {
      try {
        result = patcas.value = await optimize(messageStore.getSortedBalancesForRoom(roomId), timeout());
      } catch (e) {
        console.error(e);
      }
  }

  if (!result || verbose.value) {
    try {
      result = glpk.value = await solveMinTransactions(messageStore.reduceDebts(roomId), timeout(), true);
    } catch (e) {
      console.error(e);
    }
  }

  if (!result || verbose.value) {
    result = simple.value = messageStore.simpleOptimize(roomId);
  }

  results.value = result;
}

watch(
  messageStore.getTriggerForRoom(roomId),
  async () => {
    await calc();
  }
)

function keyListener(ev: KeyboardEvent) {
  if (!ev.ctrlKey && !ev.shiftKey && !ev.metaKey && ev.key === "v") {
    verbose.value = !verbose.value;
    void(calc());
  }
}

onMounted(async () => {
  addEventListener('keydown', keyListener);
  await calc();
});

onUnmounted(() => {
  removeEventListener('keydown', keyListener);
});

function moneyInFlight(result?: OptResult): string {
  return (result ?? []).reduce((acc,cur) => {
    acc += parseFloat(cur[2]);
    return acc;
  }, 0).toFixed(2);
}

</script>
<template>
  <div class="container-fluid">
    <RoomNavbar />
    <div class="d-flex justify-content-between align-items-center m-4">
      <h3 class="text-dark mb-2"><strong>Settlement</strong></h3>
      <div class="d-flex justify-content-end">
        <NewExpense :room-id="roomId" :show-text="true" />
      </div>
    </div>

    <div v-if="!verbose">
      <OptBalancesResult :results="results" :roomId="roomId" />
    </div>
    <div v-else>
      <div>
        <h4>Pactas (num-tx: {{ patcas?.length ?? 0}}, num-money-in-flight: €{{moneyInFlight(patcas)}})</h4>
        <OptBalancesResult :results="patcas" :roomId="roomId" />
        <h4>GLPK (num-tx: {{ glpk?.length ?? 0}}, num-money-in-flight: €{{moneyInFlight(glpk)}})</h4>
        <OptBalancesResult :results="glpk" :roomId="roomId" />
        <h4>Simple (num-tx: {{ simple?.length ?? 0}}, num-money-in-flight: €{{moneyInFlight(simple)}})</h4>
        <OptBalancesResult :results="simple" :roomId="roomId" />
      </div>
    </div>
  </div>
</template>
