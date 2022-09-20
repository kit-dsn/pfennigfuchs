<script setup lang="ts">
import {
  onErrorCaptured,
  provide,
  ref,
  watch,
  readonly,
  onMounted,
  onUnmounted,
} from "vue";
import MatrixLogin from "@/components/MatrixLogin.vue";
import { useMatrixAuthStore } from "@/stores/MatrixAuthStore";
import AxiosInject from "@/composables/AxiosInject.vue";
import axios from "axios";
import { installKey, messageKey, notificationKey, isInstallEvent, type InstallEvent } from "./keys";
import MatrixSync from "@/composables/MatrixSync.vue";
import { RouterView } from "vue-router";
import NavBar from "@/components/NavBar.vue";
import SideBar from "@/components/SideBar.vue";
import { randomUUID } from "@/util/randomuuid";
import { isJsonMatrixError } from "./types/Matrix";
// import ServiceWorker from '/serviceworker.ts?url'

export type Notification = {
  id: string;
  ts: number;
  text: string;
};

export type Message = {
  id: string;
  ts: number;
  text: string;
};

const MODE = import.meta.env.MODE;
const VERSION = import.meta.env.VITE_PFENNIGFUCHS_VERSION ?? "unknown";

const authStore = useMatrixAuthStore();
const authenticated = ref(false);
const sidebarHidden = ref(false);
const isOpened = ref(false);
const screenWidth = ref(78);
const menuOpenedPaddingLeftBody = "230px";
const menuClosedPaddingLeftBody = "78px";
const sidePadding = ref(0);

const autoDismissSecs = 15;
const dismissCountdownMsg = ref(0);
const dismissCountdownAlert = ref(0);

const autoDismissCountDownChangedMsg = (countDown: number) => {
  dismissCountdownMsg.value = countDown;
}
const autoDismissCountDownChangedAlert = (countDown: number) => {
  dismissCountdownAlert.value = countDown;
}

let oldWindowWidth = window.innerWidth;
/* Notifications */


let serviceWorker: ServiceWorkerRegistration;

const notifications = ref<Notification[]>([]);
const messages = ref<Message[]>([]);

function nativeMsg(text: string) {
  if ('Notification' in window &&
    Notification.permission === "granted" &&
    serviceWorker) {
    serviceWorker.showNotification("Pfennigfuchs", {
      body: text,
      badge: "/favicon.png",
      icon: "/favicon.png",
      vibrate: [200, 100, 200, 100, 200, 100, 200],
    }).catch(() => {
      return;
    });
  }
}

function pushNotification(text: string) {
  notifications.value.splice(0, 0, {
    id: randomUUID(),
    ts: Date.now(),
    text,
  });
  nativeMsg(text);
  dismissCountdownAlert.value = autoDismissSecs;
  return;
}

function pushMessage(text: string) {
  messages.value.splice(0, 0, {
    id: randomUUID(),
    ts: Date.now(),
    text,
  });
  nativeMsg(text);
  dismissCountdownMsg.value = autoDismissSecs;
  return;
}

provide(notificationKey, {
  notifications: readonly(notifications),
  pushNotification,
  clearNotifications,
});

provide(messageKey, {
  messages: readonly(messages),
  pushMessage,
  clearMessages,
});

onErrorCaptured((err) => {
  console.error(err);
  if (axios.isAxiosError(err)) {
    const remoteError = err.response?.data;
    if (remoteError && typeof remoteError === "object" && isJsonMatrixError(remoteError)) {
      pushNotification(`Matrix error: ${remoteError.error} (${remoteError.errcode})`);
    } else {
      pushNotification(`Network error: ${err.message}`);
    }
  } else if (err instanceof Error) {
    pushNotification(err.message);
  } else {
    pushNotification(`unhandled error: ${String(err)}`);
  }
  return false;
});

/* Watcher for auth store - log out when auth_token is null */

watch(
  () => authStore.authStore,
  () => {
    if (!authStore.authStore.auth_token) {
      authenticated.value = false;
    }
  }
);

function globalErrHandler(err: ErrorEvent) {
  console.error(err);
  pushNotification(err.message);
  return;
}

function rejectionErrHandler(err: PromiseRejectionEvent) {
  const reason = err.reason as object | string;
  if (typeof reason === 'string') {
    pushNotification(reason);
  } else if (typeof reason === 'object' && 'toString' in reason) {
    pushNotification(reason.toString());
  }
  return;
}

function authOk() {
  notifications.value = [];
  authenticated.value = true;
  resetSidebar();
}

function resetSidebar() {
  if (authenticated.value) {
    screenWidth.value = window.innerWidth;
    if (window.innerWidth < 768) {
      sidebarHidden.value = true;
      isOpened.value = false;
      window.document.body.style.paddingLeft = "0px";
    } else if (window.innerWidth >= 768) {
      sidebarHidden.value = false;
      isOpened.value = false;
      window.document.body.style.paddingLeft = menuClosedPaddingLeftBody;
    }
    oldWindowWidth = screenWidth.value;
  }
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const swUrl = import.meta.env.PROD ? "/serviceworker.js" : "/serviceworker.ts";
    serviceWorker = await navigator.serviceWorker.register(swUrl);
  }
  return;
}

const installPrompt = ref<InstallEvent | undefined>(undefined);
function registerInstallHandler() {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    if (isInstallEvent(e)) {
      installPrompt.value = e;
    }
  });
}
provide(installKey, installPrompt);

onMounted(async () => {
  window.addEventListener<"error">("error", globalErrHandler);
  window.addEventListener<"unhandledrejection">(
    "unhandledrejection",
    rejectionErrHandler
  );
  window.addEventListener("resize", resizeHandler);
  resetSidebar();
  registerInstallHandler();
  await registerServiceWorker();
});

onUnmounted(() => {
  window.removeEventListener<"error">("error", globalErrHandler);
  window.removeEventListener<"unhandledrejection">(
    "unhandledrejection",
    rejectionErrHandler
  );
  window.removeEventListener("resize", resizeHandler);
});

function isTouchDevice() {
  return (('ontouchstart' in window) ||
     (navigator.maxTouchPoints > 0));
}

function resizeHandler() {
  screenWidth.value = window.innerWidth;
  if (authenticated.value) {
    //if screen size changes -> initialize sidebar to defaults
    if (screenWidth.value < 768 && oldWindowWidth >= 768) {
      sidebarHidden.value = true;
      isOpened.value = false;
      //problem is that the watchers fire a bit after changing these values
      //so setting the padding instantly gets overridden
      setTimeout(function () {
        window.document.body.style.paddingLeft = "0px";
        sidePadding.value = 0;
      }, 10);
    } else if (screenWidth.value >= 768 && oldWindowWidth < 768) {
      sidebarHidden.value = false;
      isOpened.value = false;
      setTimeout(function () {
        window.document.body.style.paddingLeft = menuClosedPaddingLeftBody;
        sidePadding.value = 78;
      }, 10);
    }
  }
  oldWindowWidth = screenWidth.value;
}

watch(
  () => isOpened.value,
  () => {
    if (isTouchDevice()){
    window.document.body.style.paddingLeft = isOpened.value
      ? menuOpenedPaddingLeftBody
      : menuClosedPaddingLeftBody;
    sidePadding.value = isOpened.value ? 230 : 78;
    } else {
      window.document.body.style.paddingLeft = menuClosedPaddingLeftBody;
      sidePadding.value = 78;
    }
  }
);


watch(
  () => sidebarHidden.value,
  () => {
    if (sidebarHidden.value) {
      window.document.body.style.paddingLeft = "0px";
      sidePadding.value = 0;
    } else {
      if (screenWidth.value < 768) {
        isOpened.value = false;
        window.document.body.style.paddingLeft = menuClosedPaddingLeftBody;
          sidePadding.value = 78;
      } else if (isTouchDevice() && screenWidth.value >= 768) {
        if (isOpened.value) {
          window.document.body.style.paddingLeft = menuOpenedPaddingLeftBody;
          sidePadding.value = 230;
        } else {
          window.document.body.style.paddingLeft = menuClosedPaddingLeftBody;
          sidePadding.value = 78;
        }
      }
    }
  }
);

// let mouseInside = false;

function openSidebar(){
  // mouseInside = true;
  if (screenWidth.value > 768){
    isOpened.value = true;
  }
}

// let timerID: ReturnType<typeof setTimeout> | undefined = undefined;

function closeSidebar() {
  if (screenWidth.value > 768){
    if (!isOpened.value){
      return;
    }
    // mouseInside = false;
    // clearTimeout(timerID)
    // timerID = setTimeout(() => {
    //   if (mouseInside == false) isOpened.value = false;
    // }, 400)
    isOpened.value = false;
  }
}

function clearMessages() {
  dismissCountdownMsg.value = 0;
  messages.value = [];
}

function clearNotifications() {
  dismissCountdownAlert.value = 0;
  notifications.value = [];
}
</script>

<template>
  <template v-if="!authenticated">
    <main id="login">
      <MatrixLogin @authenticated-ok="authOk" />
    </main>
  </template>
  <template v-else>
    <AxiosInject>
      <MatrixSync>
        <SideBar
          @mouseover="openSidebar"
          @mouseout="closeSidebar"
          @toggle-opened="isOpened = !isOpened"
          :screenWidth="screenWidth"
          :sidebarHidden="sidebarHidden"
          :isOpened="isOpened"
        />
        <div class="message-notif notification">
          <b-alert
            v-model="dismissCountdownMsg"
            dismissible
            variant="success"
            @dismissed="dismissCountdownMsg = 0"
            @dismiss-count-down="autoDismissCountDownChangedMsg"
          >
            <div v-if="messages.length">
              {{ messages[0].text }}
            </div>
          </b-alert>
        </div>
        <div class="message-notif notification">
          <b-alert
            v-model="dismissCountdownAlert"
            dismissible
            variant="warning"
            @dismissed="dismissCountdownAlert = 0"
            @dismiss-count-down-alert="autoDismissCountDownChangedAlert"
          >
            <div v-if="notifications.length">
              {{ notifications[0].text }}
            </div>
          </b-alert>
        </div>
        <div class="d-flex flex-column" id="content-wrapper">
          <div id="content">
            <NavBar
              @clear-notifications="clearNotifications"
              @clear-messages="clearMessages"
              :notifications="notifications"
              :messages="messages"
              @toggle-sidebar-hidden="sidebarHidden = !sidebarHidden"
              :screenWidth="screenWidth"
              :sidebarHidden="sidebarHidden"
            />
            <router-view />
          </div>
          <footer class="bg-white sticky-footer">
            <div class="container my-auto">
              <div class="text-center my-auto copyright">
                <span>Mode: {{ MODE }} Version: {{ VERSION }}</span>
              </div>
            </div>
          </footer>
        </div>
      </MatrixSync>
    </AxiosInject>
  </template>
</template>

<style>
.message-notif {
  top: 4rem;
  z-index: 1500;
}

.alert-notif {
  top: 5rem;
  z-index: 1510;
}

.notification {
  position: fixed;
  max-width: 95%;
  min-height: 4rem;
  max-height: 9rem;
  right: 50%;
  transform: translateX(50%);
}

.card {
  border-radius: 12px !important;
}

.flex-grow {
  flex: 1 0 auto;
}

.selection-enabled {
  user-select:text !important;
}
</style>
