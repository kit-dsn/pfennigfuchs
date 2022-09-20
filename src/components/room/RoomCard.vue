<script setup lang="ts">
import { useRoomStateStore } from "@/stores/RoomStateStore";
import { useMessageStore } from "@/stores/MessageStore";
import UserCard from "@/components/user/UserCard.vue";
import { useRouter } from "vue-router";
import { useAvatarStore } from "@/stores/AvatarStore";
import NewExpense from "@/components/NewExpense.vue";
import { defined } from "@/util/helpers";
import { axiosKey } from "@/keys";
import { computed, inject, onMounted, onUnmounted, ref } from "vue";

const rooms = useRoomStateStore();
const msgs = useMessageStore();
const avatarStore = useAvatarStore();
const axios = defined(inject(axiosKey));
const router = useRouter();

const myId = defined(rooms.myId);

const r_avatar = ref("");
const screenWidth = ref(window.innerWidth);

const props = defineProps<{ id: string }>();

avatarStore.fetchAvatarEffect(axios, props.id, r_avatar);

onMounted(() => {
  window.addEventListener("resize", resizeHandler);
});

onUnmounted(() => {
  window.removeEventListener("resize", resizeHandler);
});

function resizeHandler() {
  screenWidth.value = window.innerWidth;
}

function otherUsers(): string[] {
  const otherUsers: string[] = rooms.getJoinedMembers(props.id).filter((id) => {
    return id != rooms.myId;
  });
  return otherUsers;
}

const MATRIX_ID_global = /@\w+:(\w+\.)+[\w]+/g;

const getInvitee = computed(() => {
  return rooms
    .getDisplayRoomName(props.id)
    ?.match(MATRIX_ID_global)
    ?.filter((id) => id != rooms.myId)[0];
});
</script>

<template>
  <div
    :data-cy="`${rooms.getDisplayRoomName(id)}`"
    class="card shadow mb-4 room-card"
    @click="
      router.push({
        path: `/rooms/${props.id}/entries`,
      })
    "
  >
    <div
      v-if="!rooms.isPfOneOnOne(props.id)"
      style="height: 50px; overflow: visible"
      class="card-header text-primary h5 fw-bold m-0 d-flex justify-content-start align-items-center"
    >
      <img v-if="r_avatar != ''" class="room-img rounded-circle" :src="r_avatar" />
      <i v-else class="fas fa-users text-white-100"></i>
      <div class="text-truncate" style="margin-left: 10px">
        {{ rooms.getDisplayRoomName(id) }}
      </div>
      <div v-if="!msgs.hasFullHistory(id)" class="tooltip1">
        <i class="fas fa-exclamation-triangle m-2"></i>
        <span class="tooltiptext">Warning: history synchronization inconsistencies</span>
      </div>
    </div>

    <div v-else>
      <div class="card-header d-flex justify-content-start align-items-center">
        <div v-if="otherUsers().length > 0" :data-cy="`roomCard-${otherUsers()[0]}`">
          <UserCard
            :user-id="otherUsers()[0]"
            :room-id="props.id"
            :hide-id="false"
            :hide-modal="true"
            :size="50"
            :fSize="20"
            :mobile-resp="false"
          />
        </div>
        <div v-else :data-cy="`roomCard-${getInvitee}`">
          <h5>Contact didn't join or left</h5>
          <p>
            {{ getInvitee }}
          </p>
        </div>
        <div v-if="!msgs.hasFullHistory(id)" class="tooltip1">
          <i class="fas fa-exclamation-triangle m-2"></i>
          <span class="tooltiptext"
            >Warning: history synchronization inconsistencies</span
          >
        </div>
      </div>
    </div>

    <div
      class="card-body overflow-auto"
      :style="
        screenWidth < 768 || rooms.isPfOneOnOne(props.id)
          ? 'max-height: 20rem'
          : 'height: 20rem'
      "
    >
      <div class="text-dark fw-bold mb-0 d-flex justify-content-between">
        <span
          style="font-size: 22px"
          class="text-success"
          v-if="-parseFloat(msgs.getBalanceForRoom(id, myId)) >= 0"
        >
          {{ (-parseFloat(msgs.getBalanceForRoom(id, myId))).toFixed(2) }}€
        </span>
        <span style="font-size: 22px" class="text-danger" v-else>
          {{ (-parseFloat(msgs.getBalanceForRoom(id, myId))).toFixed(2) }}€
        </span>
        <NewExpense :room-id="id" :show-text="false" />
      </div>
      <template v-if="!rooms.isPfOneOnOne(props.id)">
        <hr />
        <div
          class="text-dark mb-1"
          v-for="member of rooms.getJoinedMembers(id).sort()"
          :key="member"
        >
          <UserCard
            :user-id="member"
            :room-id="id"
            :size="27"
            :fSize="13"
            :hide-id="false"
            :hide-modal="true"
            :mobile-resp="false"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style>
.room-img {
  position: relative;
  right: 20px;
  bottom: 8px;
  margin-right: -15px;
  outline: 3px solid var(--bs-secondary);
  outline-offset: -2px;
  object-fit: cover;
  margin-left: -5px;
  text-align: center;
  min-height: 60px;
  max-height: 60px;
  min-width: 60px;
  max-width: 60px;
}

div.room-card:hover {
  cursor: pointer;
}

.tooltip1 {
  position: relative;
  display: inline-block;
}

.tooltip1 .tooltiptext {
  font-size: 13px;
  visibility: hidden;
  width: 200px;
  top: 100%;
  left: 50%;
  margin-left: -100px;
  background-color: black;
  color: #fff;
  text-align: center;
  padding: 5px 0;
  border-radius: 6px;
  position: absolute;
  z-index: 1;
}

.tooltip1:hover .tooltiptext {
  visibility: visible;
}
</style>
