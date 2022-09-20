<script setup lang="ts">
import RoomNavbar from "@/components/room/RoomNavbar.vue";
import NewExpense from "@/components/NewExpense.vue";
import RepaymentButton from "@/components/RepaymentButton.vue";
import UserCard from "@/components/user/UserCard.vue";
import { useMessageStore } from "@/stores/MessageStore";
import { useRoomStateStore } from "@/stores/RoomStateStore";
import { useRoute } from "vue-router";
import { ref, watchEffect } from "vue";
import { defined } from "@/util/helpers";

const messageStore = useMessageStore();
const roomStore = useRoomStateStore();
const route = useRoute();
const roomId = route.params.id as string;

const me = defined(roomStore.myId);
const otherUser = ref<string>();

watchEffect(() => {
  otherUser.value = roomStore.getOneonOneOther(roomId);
})

</script>

<template>
  <div class="container-fluid">
    <RoomNavbar />
    <div class="d-flex flex-column flex-sm-row justify-content-between align-items-center m-4">
      <h3 class="text-dark mb-2"><strong>Balances</strong></h3>
      <div class="d-flex justify-content-center align-items-center">
        <NewExpense :room-id="roomId" :show-text="true" />
      </div>
    </div>

    <div v-for="[user, balance] of messageStore.getSortedBalancesForRoom(roomId)" :key="user"
      class="d-flex justify-content-center">
      <!-- Balances shouldn't include oneself -->
      <div class="card shadow flex-fill mb-3 p-2 user_balance" style="border-radius: 12px"
        v-if="!roomStore.isPfOneOnOne(roomId) || user !== me">
        <div class="d-flex flex-column justify-content-start align-items-center">
          <div class="w-100 card-body d-flex flex-column flex-sm-row justify-content-between align-items-center"
            style="overflow: hidden">
            <UserCard :user-id="user" :room-id="roomId" :hide-id="false" :hide-modal="false" :size="50" :fSize="18"
              :mobile-resp="false" style="padding-right: 20px" />
            <div class="d-flex justify-content-end" :class="
              -parseFloat(balance) < 0
                ? 'text-danger'
                : parseFloat(balance) != 0
                  ? 'text-success'
                  : ''
            ">
              {{ (-parseFloat(balance)).toFixed(2) }}€
            </div>
          </div>
          <RepaymentButton
            v-if="roomStore.isPfOneOnOne(roomId) && user === otherUser && balance !== `0.00`"
            :user1="parseFloat(balance) < 0 ? me : otherUser"
            :user2="parseFloat(balance) < 0 ? otherUser : me"
            :amount="Math.abs(parseFloat(balance)).toFixed(2)"
            :room-id="roomId"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.user_balance {
  color: var(--bs-secondary);
  font-size: 18px;
  font-weight: 600;
  min-width: 25vw;
  max-width: 700px;
}
</style>
