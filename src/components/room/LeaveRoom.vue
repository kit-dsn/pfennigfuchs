<script setup lang="ts">
import MatrixSync from "@/services/MatrixSync";
import { useRouter } from "vue-router";
import { defined } from "@/util/helpers";
import { inject, ref } from "vue";
import { axiosKey, notificationKey } from "@/keys";

const axios = defined(inject(axiosKey));
const notify = defined(inject(notificationKey));
const router = useRouter();
const showModal = ref(false);

const props = defineProps<{
  roomId: string;
}>();

async function leaveRoom() {
  notify.pushNotification("Leaving...");
  showModal.value = false;
  await MatrixSync.leaveRoomRaw(axios, props.roomId);
  notify.pushNotification("Left room")
  await router.replace({ path: "/" });
}
</script>

<template>
  <b-button @click="showModal = true" class="btn btn-danger" data-cy="Leave">
    <i class="fas fa-sign-out-alt text-white-100"></i> Leave</b-button
  >
  <b-modal v-model="showModal" hide-footer id="leave-modal" title="Confirmation">
    <p>Are you sure to leave the room?</p>
    <div class="modal-footer">
      <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
        Cancel
      </button>
      <button type="button" @click="leaveRoom" class="btn btn-danger" data-cy="LeaveConf">
        Leave Room
      </button>
    </div>
  </b-modal>
</template>
