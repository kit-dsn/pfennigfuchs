<script setup lang="ts">
import { useRoomStateStore } from "@/stores/RoomStateStore";
import { useAvatarStore } from "@/stores/AvatarStore";
import { computed, inject, onMounted, ref } from "vue";
import { axiosKey } from "@/keys";
import { defined, splitMatrixId } from "@/util/helpers";

const rooms = useRoomStateStore();
const avatarStore = useAvatarStore();
const axios = defined(inject(axiosKey));
const roomState = useRoomStateStore();

const showModal = ref(false);

const props = defineProps<{
  userId: string;
  roomId: string | null;
  hideId: boolean;
  hideModal: boolean;
  size: number;
  fSize: number;
  mobileResp: boolean;
}>();

const displayName = ref<string | null>(null);
const avatar = ref("");

avatarStore.fetchAvatarEffect(axios, props.userId, avatar);

const cssVars = computed(() => {
  return {
    "--size": `${props.size}px`,
    "--fSize": `${props.fSize}px`,
  };
});

onMounted(() => {
  if (props.roomId != null) {
    displayName.value = rooms.getMemberDisplayName(props.roomId, props.userId);
  }
});

const userid_display = computed(() => {
  if (
    !props.hideId &&
    props.roomId != null &&
    displayName.value != undefined &&
    displayName.value != props.userId
  ) {
    return props.userId;
  } else {
    return null;
  }
});
</script>

<template>
  <div
    :style="!hideModal ? 'cursor:pointer;' : ''"
    :data-cy="`card-${userId}`"
    class="user-card"
    :aria-controls="`modal-${userId}`"
    @click="showModal = !showModal"
  >
    <div v-if="!props.hideModal">
      <b-modal :id="`modal-${userId}`" hide-footer v-model="showModal" :title="userId">
        <div
          style="
            align-items: center;
            vertical-align: middle;
            --size: 70px;
            --fSize: 22px;
            overflow: hidden;
          "
          class="user-card d-flex flex-row justify-content-center align-items-center"
        >
          <img v-if="avatar != ''" class="avatar-img p-2 rounded-circle" :src="avatar" />
          <div v-else class="avatar-icon-div p-2">
            <img />
            <i class="avatar-icon fas fa-user"></i>
          </div>
          <div class="p-2 d-flex flex-column justify-content-center">
            <template v-if="roomId != null && displayName != undefined">
              <strong style="display: inline-block" class="text-black">
                {{ displayName }}
              </strong>
            </template>
            <!-- if hideId isn't set and the top part isn't already showing the id instead of nickname -> show whole id -->
            <div
              v-if="roomId != null && displayName != userId"
              class="text-gray-600 small"
              style="display: inline-block; margin-top: -4px"
            >
              {{ userId }}
            </div>
          </div>
        </div>
        <div
          class="selection-enabled"
          v-if="
            roomId != null &&
            roomState.getPfContactInformation(roomId, userId) != undefined &&
            (roomState.getPfContactInformation(roomId, userId)?.email != '' ||
              roomState.getPfContactInformation(roomId, userId)?.phone != '')
          "
        >
          <hr />
          <div v-if="roomState.getPfContactInformation(roomId, userId)?.email != ''">
            Email: {{ roomState.getPfContactInformation(roomId, userId)?.email }}<br />
          </div>
          <div v-if="roomState.getPfContactInformation(roomId, userId)?.phone != ''">
            Phone: {{ roomState.getPfContactInformation(roomId, userId)?.phone }}
          </div>
        </div>

        <div
          v-if="roomId != null &&
            roomState.getPfPaymentInformation(roomId, userId) != undefined &&
            roomState.getPfPaymentInformation(roomId, userId)!.size> 0"
        >
          <hr />
          <div class="row selection-enabled">
            <div
              class="col-6"
              v-for="[uuid, pi] of roomState.getPfPaymentInformation(roomId, userId)"
              :key="uuid"
            >
              <div class="card m-2">
                <div>
                  <div class="card-header">
                    <h4>{{ pi.tag }}</h4>
                  </div>
                  <div class="card-body">
                    <b>{{ pi.type }}:</b> {{ pi.address }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="d-flex justify-content-end">
          <b-button @click="showModal = false">Close</b-button>
        </div>
      </b-modal>
    </div>

    <div
      style="
        align-items: center;
        vertical-align: middle;
        overflow: hidden;
        margin-right: -15px;
      "
      :style="cssVars"
      class="user-card p-1 d-flex flex-row justify-content-start align-items-center"
    >
      <img v-if="avatar != ''" class="avatar-img p-1 rounded-circle" :src="avatar" />
      <img
        v-else
        class="avatar-img p-1 rounded-circle"
        src="/assets/img/avatars/placeholder_avatar.png"
      />
      <div
        class="p-2 d-flex flex-column justify-content-center"
        :class="props.mobileResp ? 'd-none d-lg-inline me-2' : ''"
      >
        <div>
          <!-- If used inside room -->
          <div v-if="roomId != null && displayName != undefined">
            <!-- The nickname if set -->
            <strong
              v-if="displayName != userId"
              style="display: inline-block"
              class="text-black"
            >
              {{ displayName }}
            </strong>
            <!-- if no nickname -> take only front part of id -->
            <strong v-else style="display: inline-block" class="text-black">
              @{{ splitMatrixId(userId)[0] }}
            </strong>
          </div>
          <!-- if not inside room -->
          <div v-else>
            <!-- if id should be hidden -> take only front part of id  -->
            <strong v-if="props.hideId" class="text-black" style="display: inline-block">
              @{{ splitMatrixId(userId)[0] }}
            </strong>
            <!-- else take the whole id  -->
            <strong v-else class="text-black" style="display: inline-block">
              {{ userId }}
            </strong>
          </div>
        </div>
        <!-- if hideId isn't set and the top part isn't already showing the id instead of nickname -> show whole id -->
        <div
          v-if="userid_display != null"
          class="text-gray-600 small"
          style="display: inline-block; margin-top: -4px"
        >
          {{ userid_display }}
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.user-card {
  height: calc(var(--size) + 2px);
  align-items: left;
  font-size: var(--fSize);
}

.avatar-img {
  object-fit: cover;
  margin-left: -5px;
  text-align: center;
  min-height: calc(var(--size) + 10px);
  max-height: calc(var(--size) + 10px);
  min-width: calc(var(--size) + 10px);
  max-width: calc(var(--size) + 10px);
}
</style>
