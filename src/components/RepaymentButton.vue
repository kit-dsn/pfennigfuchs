<script setup lang="ts">
import UserCard from "@/components/user/UserCard.vue";
import { axiosKey } from "@/keys";
import { defined } from "@/util/helpers";
import { inject, ref } from "vue";
import { randomUUID } from "@/util/randomuuid";
import type { PfMessage, PfPaymentMessageRaw } from "@/types/Pfennigfuchs";
import { useRoomStateStore } from "@/stores/RoomStateStore";

const roomState = useRoomStateStore();
const axios = defined(inject(axiosKey));

const disabledButton = ref(false);
const showModal = ref(false);

const props = defineProps<{
  user1: string;
  user2: string;
  amount: string;
  roomId: string;
}>();

async function sendPayback() {
  disabledButton.value = true;

  const txnId = encodeURIComponent(randomUUID());
  const user1 = roomState.getMemberDisplayName(props.roomId, props.user1);
  const user2 = roomState.getMemberDisplayName(props.roomId, props.user2);
  const pfMsg: PfMessage = {
    subject: `Payback from ${user1} to ${user2}`,
    sender: props.user1,
    v: [{ user: props.user2, amount: props.amount }],
  };
  const msg: PfPaymentMessageRaw["content"] = {
    body: "🦊",
    msgtype: "m.text",
    format: "pf.payment_data",
    formatted_body: JSON.stringify(pfMsg),
  };
  await axios.put(
    `/_matrix/client/v3/rooms/${encodeURIComponent(
      props.roomId
    )}/send/m.room.message/${txnId}`,
    msg
  );
  showModal.value = false;
}
</script>

<template>
  <!-- <b-button variant="danger" @click="sendPayback" class="ml-auto">
Payback</b-button> -->

  <b-button
    class="btn btn-success d-sm-inline-block ml-auto"
    @click.stop="showModal = true"
    :aria-controls="`modal-${user1}-${user2}`"
  >
    <!-- Settle Up -->
    <i class="fas fa-balance-scale"></i>
  </b-button>
  <b-modal
    :id="`modal-${user1}-${user2}`"
    hide-footer
    v-model="showModal"
    title="Settle Up"
  >
    Add settlement payment?
    <div
      class="card-text d-flex flex-column flex-sm-row justify-content-start align-items-center my-4 overflow-hidden"
    >
      <UserCard
        :user-id="user1"
        :room-id="roomId"
        :hide-modal="true"
        :size="30"
        :fSize="16"
        :hide-id="true"
        :mobile-resp="false"
      />
      <div class="card-text d-flex flex-row justify-content-start align-items-center">
        <div style="text-align: center; font-size: 16px; margin-left: 10px">
          paid <span class="text-success">{{ amount }}€ </span> to
        </div>
      </div>
      <UserCard
        :user-id="user2"
        :room-id="roomId"
        :hide-modal="true"
        :size="30"
        :fSize="16"
        :hide-id="true"
        :mobile-resp="false"
      />
    </div>
    <div class="d-flex justify-content-end">
      <b-button @click="showModal = false" class="btn-primary m-1">Cancel</b-button>
      <b-button @click="sendPayback" class="btn btn-success m-1">Add</b-button>
    </div>
  </b-modal>
</template>
