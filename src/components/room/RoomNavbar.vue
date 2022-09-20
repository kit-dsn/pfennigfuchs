<script setup lang="ts">
import { useRoomStateStore } from "@/stores/RoomStateStore";
import { useRoute } from "vue-router";
import { useAvatarStore } from "@/stores/AvatarStore";
import { defined } from "@/util/helpers";
import { axiosKey } from "@/keys";
import { computed, inject, onMounted, onUnmounted, ref } from "vue";
import MatrixSync from "@/services/MatrixSync";
import UserCard from "@/components/user/UserCard.vue";
import LeaveRoom from "./LeaveRoom.vue";

const route = useRoute();
const roomStore = useRoomStateStore();
const avatarStore = useAvatarStore();
const roomId = route.params.id as string;
const axios = defined(inject(axiosKey));
const r_avatar = ref("");
avatarStore.fetchAvatarEffect(axios, roomId, r_avatar);
const fontSize = ref("font-size: calc(2vw + 8px);");

async function reinvite() {
  const otherUser = getInvitee.value;
  if (otherUser) {
    await MatrixSync.inviteRaw(axios, roomId, otherUser);
  }
}

const getInvitee = computed(() => {
  return roomStore.getOneOnOneLeftMember(roomId);
});

function otherUsers(): string[] {
  const otherUsers: string[] = roomStore.getJoinedMembers(roomId).filter((id) => {
    return id != roomStore.myId;
  });
  return otherUsers;
}

onMounted(() => {
  window.addEventListener("resize", resizeHandler);
  resizeHandler();
});

onUnmounted(() => {
  window.removeEventListener("resize", resizeHandler);
});

function resizeHandler() {
  if (window.innerWidth < 768) {
    fontSize.value = "font-size: calc(2vw + 6px);";
  } else {
    fontSize.value = "font-size: 25px;";
  }
}
</script>

<template>
  <div class="d-flex flex-column flex-sm-row justify-content-between align-items-center w-100">
    <div data-cy="room-navbar" class="d-flex flex-row justify-content-between align-items-center text-truncate w-100">
      <b-link :to="`/`" class="room_name mr-0 p-sm-3" style="text-decoration: none">
        <i class="fas fa-angle-left" />
      </b-link>
      <template v-if="!roomStore.isPfOneOnOne(roomId)">
        <div class="d-flex flex-row">
          <img
            v-if="r_avatar != ''"
            class="room-img-big p-0 rounded-circle"
            :src="r_avatar"
          />
          <i v-else class="p-2 fas fa-users text-white-100" style="font-size: 50px"></i>
          <div class="d-flex flex-column justify-content-center mx-sm-4">
            <div class="pl-2 room_name">
              {{ roomStore.getDisplayRoomName(roomId) }}
            </div>
            <div
              data-cy="roomNavDesc"
              class="pl-2 text-gray-600"
              style="font-size: 15px; white-space: pre-wrap; line-height: 16px; text-overflow: ellipsis;"
            >
              {{ roomStore.getRoomDescription(roomId) }}
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <template v-if="otherUsers().length > 0">
          <UserCard
            :user-id="otherUsers()[0]"
            :room-id="roomId"
            :hide-id="false"
            :hide-modal="false"
            :size="50"
            :fSize="18"
            :mobile-resp="false"
          />
        </template>
        <template v-else>
          <div class="d-flex flex-column justify-content-center text-truncate mx-4">
            <h5>Contact didn't join or left</h5>
            <p>
              {{ getInvitee }}
            </p>
            <b-button @click="reinvite" class="btn btn-success">Invite again</b-button>
          </div>
        </template>
      </template>
      <div />
    </div>
    <div class="align-self-center">
      <LeaveRoom :room-id="roomId" />
    </div>
  </div>

  <div
    class="mb-2 mt-2 mx-auto d-flex justify-content-around"
    style="background-color: rgba(0, 0, 0, 0.2); border-radius: 10px; font-size: 3vw"
  >
    <router-link
      :to="`/rooms/${roomId}/entries`"
      :replace="true"
      class="p-2 m-2 room_navabar_item"
      :class="{ active_navbar_item: route.name == 'RoomEntries' }"
      data-cy="entriesTab"
    >
      <div :style="fontSize">
        <i class="fas fa-coins"></i>
        Expenses
      </div>
    </router-link>

    <router-link
      :to="`/rooms/${roomId}/balances`"
      :replace="true"
      class="p-2 m-2 room_navabar_item"
      :class="{ active_navbar_item: route.name == 'RoomBalances' }"
    >
      <div :style="fontSize">
        <i class="fas fa-balance-scale-right"></i>
        Balances
      </div>
    </router-link>

    <router-link
      :style="{ display: !roomStore.isPfOneOnOne(roomId) ? '' : 'none !important' }"
      :to="`/rooms/${roomId}/optbalances`"
      :replace="true"
      class="p-2 m-2 room_navabar_item"
      :class="{ active_navbar_item: route.name == 'OptBalances' }"
    >
      <div :style="fontSize">
        <i class="fas fa-balance-scale"></i>
        Settlement
      </div>
    </router-link>

    <router-link
      :style="{ display: !roomStore.isPfOneOnOne(roomId) ? '' : 'none !important' }"
      data-cy="settingsTab"
      :to="`/rooms/${roomId}/settings`"
      :replace="true"
      class="p-2 m-2 room_navabar_item"
      :class="{ active_navbar_item: route.name == 'RoomSettings' }"
    >
      <div :style="fontSize">
        <i class="fas fa-cog"></i>
        Settings
      </div>
    </router-link>
  </div>
</template>

<style>
.room_name {
  color: var(--bs-secondary);
  font-size: 25px;
  font-weight: 600;
}

.mw-1000px {
  max-width: 1000px;
}

.room_navabar_item {
  color: var(--bs-secondary);
  font-size: 20px;
  font-weight: 600;
  text-decoration: none;
  border-radius: 12px;
  min-width: 15%;
  text-align: center;
}

.room_navabar_item:hover {
  color: #fff;
  background-color: var(--bs-tertiary);
}

.active_navbar_item {
  background-color: var(--bs-secondary) !important;
  color: #fff !important;
}

.room-img-big {
  outline: 4px solid var(--bs-secondary);
  outline-offset: -2px;
  object-fit: cover;
  margin: 5px;
  margin-left: 10px;
  margin-right: 10px;
  text-align: center;
  min-height: 70px;
  max-height: 70px;
  min-width: 70px;
  max-width: 70px;
}
</style>
