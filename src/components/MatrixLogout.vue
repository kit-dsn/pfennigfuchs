<script setup lang="ts">
import { messageKey, notificationKey } from "@/keys";
import { logout } from "@/services/MatrixAuth";
import { useAvatarStore } from "@/stores/AvatarStore";
import { useGlobalAccountData } from "@/stores/GlobalAccountData";
import { useMatrixAuthStore } from "@/stores/MatrixAuthStore";
import { useMessageStore } from "@/stores/MessageStore";
import { useRoomStateStore } from "@/stores/RoomStateStore";
import { defined } from "@/util/helpers";
import { inject } from "vue";

const authStore = useMatrixAuthStore();
const msgStore = useMessageStore();
const roomStore = useRoomStateStore();
const accountData = useGlobalAccountData();
const avatarCache = useAvatarStore();

const notifications = defined(inject(notificationKey));
const messages = defined(inject(messageKey));

defineProps<{
  iconClasses: string;
}>();

async function doLogout() {  
  const homeserver = authStore.authStore.homeserver_base_url;
  const token = authStore.authStore.auth_token;

  if (!homeserver || !token) {
    throw new Error("invalid state during logout");
  }

  const url = new URL(homeserver);
  // TODO: loader or progress screen maybe in the future?

  await logout(url, token);
  authStore.$state.authStore = {};

  accountData.$state.data = {};
  localStorage.clear();
  msgStore.clear();
  roomStore.clear();
  avatarCache.clear();
  notifications.clearNotifications();
  messages.clearMessages();
  window.location.reload();
}
</script>

<template>
  <a href="#" @click="doLogout" style="text-decoration: none" data-cy="Logout">
    <i :class="iconClasses"></i>
    <span class="links_name">Logout</span>
  </a>
</template>
