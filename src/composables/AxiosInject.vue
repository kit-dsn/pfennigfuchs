<script setup lang="ts">
import { inject, provide } from "vue";
import { useMatrixAuthStore } from "@/stores/MatrixAuthStore";
import Axios, { AxiosError, CanceledError, type AxiosRequestConfig, type AxiosResponse } from "axios";
import { axiosKey, notificationKey } from "@/keys";
import { defined } from "@/util/helpers";
import { isJsonMatrixError, isJsonMatrixRateLimitError, type JsonMatrixError } from "@/types/Matrix";

const authStore = useMatrixAuthStore();
const authToken = defined(authStore.authStore?.auth_token);
const notify = defined(inject(notificationKey));

const confAxios = Axios.create({
  baseURL: authStore.authStore?.homeserver_base_url,
  headers: {
    Authorization: `Bearer ${authToken}`,
  },
});

let semaphore = 1;
const semaphore_queue: (() => void)[] = [];

let ql_notified = false;
const MAX_QUEUE_LEN_WARN = 20;
function warnQueueLength() {
  if (semaphore_queue.length > MAX_QUEUE_LEN_WARN) {
    const msg = `outstanding mutating API requests reached critical levels (semaphore_queue.length >= 20)`;
    console.error(msg);
    if (!ql_notified) {
      notify.pushNotification(msg);
      ql_notified = true;
    }
  }
}

async function p(priority: boolean) {
  warnQueueLength();
  if (semaphore > 0) {
    --semaphore;
    return;
  }
  await new Promise<void>(ok => {
    priority ? semaphore_queue.unshift(ok) : semaphore_queue.push(ok)
  })
  return;
}

function v() {
  const next = semaphore_queue.shift();
  if (next) {
    next();
  } else {
    ++semaphore;
  }
}

function throttleP(config: AxiosRequestConfig) {
  return config.method !== "get";
}

let barrier = Promise.resolve();

async function onRequest(config: AxiosRequestConfig) {
  if (throttleP(config)) {
    await p(config.pf_retry ?? false);
    await barrier;
  }
  return config;
}

function onResponse(res: AxiosResponse) {
  if (throttleP(res.config)) {
    v();
  }
  return res;
}

async function onResponseError(error: AxiosError<JsonMatrixError>) {
  if (error instanceof CanceledError && !error.config) {
    // we can't do much - probably a bug in axios. hope the user reloads the page soonish or gets automatically refresh.
    return Promise.reject(error);
  }
  if (throttleP(error.config) && error.response?.status === 429) {
    let ms = Math.round(Math.random() * 1000 + 1) + 1000;

    const rl = error.response?.data;
    if (rl && isJsonMatrixError(rl) && isJsonMatrixRateLimitError(rl)) {
      ms += rl.retry_after_ms;
    }
    console.warn(`slowing down traffic for ${ms} milliseconds`);
    barrier = new Promise(ok => { setTimeout(ok, ms) });
    v();
    return await confAxios({
      ...error.config,
      pf_retry: true
    });
  } else if (throttleP(error.config)) {
    v();
  }
  return Promise.reject(error);
}

confAxios.interceptors.request.use(onRequest, undefined,
  {
    runWhen: throttleP
  }
);
confAxios.interceptors.response.use(onResponse, onResponseError);

provide(axiosKey, confAxios);

// window.axiosTest = async () => {
//   await MatrixSync.createRoom(confAxios, randomUUID(), []);
// }

</script>

<template>
  <slot />
</template>
