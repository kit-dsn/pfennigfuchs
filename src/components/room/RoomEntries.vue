<script setup lang="ts">
import RoomNavbar from "@/components/room/RoomNavbar.vue";
import NewExpense from "@/components/NewExpense.vue";
import { useMessageStore } from "@/stores/MessageStore";
import UserCard from "@/components/user/UserCard.vue";
import { useRoute } from "vue-router";
import { ref } from "vue";
import { formatTime } from "@/util/helpers";

const messageStore = ref(useMessageStore());
const route = useRoute();
const roomId = route.params.id as string;

const unwrapped = ref<Set<string>>(new Set<string>());
</script>

<template>
  <div class="container-fluid">
    <RoomNavbar />
    <div
      class="d-flex flex-column flex-sm-row justify-content-between align-items-center m-4"
    >
      <h3 class="text-dark mb-2"><strong>Expenses</strong></h3>
      <div class="d-flex justify-content-center align-items-center">
        <NewExpense :room-id="roomId" :show-text="true" />
      </div>
    </div>

    <div
      v-for="msg of messageStore.getAllMessagesForRoom(roomId).reverse()"
      :key="msg.event_id"
      class="d-flex justify-content-center"
      data-cy="expenses"
    >
      <div
        class="card shadow flex-fill mb-3 p-2 user_transaction"
        style="border-radius: 12px"
        @click="
          unwrapped.has(msg.event_id)
            ? unwrapped.delete(msg.event_id)
            : unwrapped.add(msg.event_id)
        "
      >
        <div data-cy="expense" class="card-header">
          <div class="d-flex justify-content-between text-primary fw-bold">
            <div data-cy="expense-subject" class="p-2 text-truncate">
              <i class="fas fa-money-bill-wave"></i>
              {{ msg.content.formatted_body.subject }}
            </div>
            <div data-cy="expense-date" class="p-2">
              {{ formatTime(msg.origin_server_ts) }}
            </div>
          </div>
        </div>

        <div class="card-body d-flex flex-row justify-content-between align-items-center">
          <div
            class="d-flex flex-column flex-sm-row justify-content-start align-items-center"
          >
            <UserCard
              :user-id="msg.content.formatted_body.sender ?? msg.sender"
              :room-id="roomId"
              :hide-modal="true"
              :size="40"
              :fSize="18"
              :hide-id="true"
              :mobile-resp="false"
              style="margin-right: 10px"
            />
            <div style="text-align: center; font-size: 18px">
              paid
              <span data-cy="expense-amount" class="text-success">{{ messageStore.calcTotalAmount(msg) }}€</span>
            </div>
          </div>
        </div>

        <div v-if="unwrapped.has(msg.event_id)" class="card-footer">
          <div data-cy="expense-participants" v-for="p of msg.content.formatted_body.v" :key="p.user">
            <div
              class="card-text d-flex flex-column flex-sm-row justify-content-start align-items-center"
            >
              <UserCard
                :user-id="p.user"
                :room-id="roomId"
                :hide-modal="true"
                :size="30"
                :fSize="16"
                :hide-id="true"
                :mobile-resp="false"
                style="margin-right: 10px"
              />
              <div style="text-align: center; font-size: 16px">
                owes <span class="text-danger">{{ p.amount }}€</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.user_transaction {
  color: var(--bs-secondary);
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  min-width: 25vw;
  max-width: 700px;
}

div.user_transaction:hover {
  cursor: pointer;
}
</style>
