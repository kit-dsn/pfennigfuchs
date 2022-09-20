<script setup lang="ts">
import { axiosKey, notificationKey } from "@/keys";
import { onMounted, onUnmounted, inject } from "vue";
import { defined } from "@/util/helpers";
import { useRoomStateStore } from "@/stores/RoomStateStore";
import { useGlobalAccountData } from "@/stores/GlobalAccountData";
import MatrixSync from "@/services/MatrixSync";
import { useMessageStore } from "@/stores/MessageStore";
import { messageKey } from "@/keys";
import Axios from "axios";

const axios = defined(inject(axiosKey));
const notify = defined(inject(notificationKey));
const messager = defined(inject(messageKey));
const notifier = defined(inject(notificationKey));

const roomStateStore = useRoomStateStore();
const globalAccountData = useGlobalAccountData();
const msgStore = useMessageStore();

const CIRCUIT_BREAKER_MAX_ERR = 20;
const EXP_BACKOFF_UPPER_BOUND_INCL = 16;

const syncer = new MatrixSync(
  roomStateStore,
  msgStore,
  globalAccountData,
  axios,
  messager,
  notifier
);

async function wait(ms: number) {
  await new Promise((ok) => setTimeout(ok, ms));
}

function secToMs(sec: number) {
  return sec * 1000;
}

function expBackoffMs(err: number): number {
  const delay = 2 ** err;
  return secToMs(
    delay <= EXP_BACKOFF_UPPER_BOUND_INCL ? delay : EXP_BACKOFF_UPPER_BOUND_INCL
  );
}

// max. 500ms slack - plenty enough
function slackMs() {
  return Math.round((Math.random() * secToMs(1) + 1) / 2);
}

let do_sync = false;
async function startSyncing() {
  let err = 0;

  while (do_sync) {
    try {
      await syncer.matrixSync();
    } catch (e) {
      if (!Axios.isAxiosError(e)) {
        throw e;
      }
      // hard error
      console.error(e);
      err++;
      if (err >= CIRCUIT_BREAKER_MAX_ERR) {
        throw new Error("couldn't contact homeserver");
      }
      await wait(expBackoffMs(err) + slackMs());
      continue;
    }
    err = 0;
  }
}

onMounted(async () => {
  // notify.pushNotification("Started polling matrix.");
  await syncer.matrixSync();
  do_sync = true;
  return startSyncing();
});

onUnmounted(() => {
  notify.pushNotification("Stopped polling matrix.");
  do_sync = false;
  syncer.abort();
});

</script>

<template>
  <slot />
</template>
