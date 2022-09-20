<script setup lang="ts">
import { axiosKey, notificationKey } from "@/keys";
import MatrixSync from "@/services/MatrixSync";
import { useRoomStateStore } from "@/stores/RoomStateStore";
import { defined } from "@/util/helpers";
import { inject, ref, computed } from "vue";
import MemberInvite from "@/components/MemberInvite.vue";

const axios = defined(inject(axiosKey));
const notify = defined(inject(notificationKey));
const roomState = useRoomStateStore();
const roomname = ref<string>("");
const invitees = ref<string[]>([]);
const showModal = ref(false);

// eslint-vue doesn't understand vue modules
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const memberInvite = ref<InstanceType<typeof MemberInvite> | null>(null);

const validation = computed(
  () => roomname.value.length > 0 && roomname.value.length < 50 && !roomState.getPfDisplayRooms.has(roomname.value)
);

async function create() {
  notify.pushNotification("Creating...");
  await MatrixSync.createRoom(axios, roomname.value, invitees.value);
  notify.pushNotification("Room created");
  resetModal();
}

function resetModal() {
  showModal.value = false;
  roomname.value = "";
  invitees.value = [];
  // eslint doesn't understand vue modules
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  memberInvite.value?.resetModal();
}

function showModalClean() {
  roomname.value = "";
  invitees.value = [];
  // eslint doesn't understand vue modules
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  memberInvite.value?.resetModal();
  showModal.value = true;
}

</script>
<template>
  <b-button
    data-cy="newRoomBtn"
    class="btn btn-success shadow d-sm-inline-block"
    @click="showModalClean"
  >
    <i class="fas fa-plus-circle"></i> Room
  </b-button>
  <b-modal
    hide-footer
    v-model="showModal"
    id="room-modal"
    title="Create new room"
    @hidden="resetModal"
  >
    <b-form v-if="showModal">
      <b-form-group>
        <label for="roomname"><strong>Room name</strong></label>
        <b-form-input
          :state="validation"
          v-model="roomname"
          aria-describedby="input-roomname-feedback"
          data-cy="roomName"
        />
        <b-form-invalid-feedback id="input-roomname-feedback">
          Roomname is not between 1 and 50 symbols long or already exists.
        </b-form-invalid-feedback>
      </b-form-group>
      <MemberInvite ref="memberInvite"
        :roomId="null"
        @invitees-changed="(inviteesNew: string[]) => invitees = inviteesNew.slice()"
      />
      <div class="d-flex justify-content-end">
        <b-button data-cy="createRoom" class="btn btn-success" @click="create" :disabled="!validation">Create Room</b-button>
      </div>
    </b-form>
  </b-modal>
</template>
