<script setup lang="ts">
import { useRoomStateStore } from "@/stores/RoomStateStore";
import RepaymentButton from "@/components/RepaymentButton.vue";
import UserCard from "@/components/user/UserCard.vue";
import { defined } from "@/util/helpers";

const rooms = useRoomStateStore();
const myId = defined(rooms.myId);

const props = defineProps<{
  results?: [string, string, string][];
  roomId: string;
}>();

function stringSort(a: string, b: string) {
  if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  } else {
    return 0;
  }
}

type Triple<A> = [A, A, A];

function sortTriples(a: Triple<string>, b: Triple<string>): number {
  const r1 = stringSort(a[0], b[0]);
  const r2 = stringSort(a[1], b[1]);
  return r1 ? r1 : r2 ? r2 : parseFloat(b[2]) - parseFloat(a[2]);
}

function sortResultsApexMe(a: Triple<string>[] = []) {
  const res = a.reduce(
    (acc, cur) => {
      if (cur[0] === myId) {
        acc[0].push(cur);
      } else if (cur[1] === myId) {
        acc[1].push(cur);
      } else {
        acc[2].push(cur);
      }
      return acc;
    },
    [Array<Triple<string>>(), Array<Triple<string>>(), Array<Triple<string>>()]
  );
  return res.flatMap((a) => a.sort(sortTriples)).map((a) => [...a, `${a[0]}_${a[1]}`]);
}
</script>

<template>
  <div
    v-for="[user, user2, balance, id] of sortResultsApexMe(props.results)"
    :key="id"
    class="d-flex justify-content-center"
  >
    <div
      class="card shadow flex-fill mb-3 p-2 user_balance"
      style="border-radius: 12px; overflow-x: hidden"
      :style="myId != user && myId != user2 ? 'background-color: #F4F4F4;' : ''"
    >
      <div class="card-body d-flex flex-row justify-content-between align-items-center">
        <div />
        <div class="d-flex flex-column justify-content-between align-items-center">
          <div
            class="d-flex flex-column flex-sm-row justify-content-start align-items-center"
          >
            <div class="d-flex flex-row justify-content-start align-items-center">
              <UserCard
                :user-id="user"
                :room-id="roomId"
                :hide-modal="true"
                :size="30"
                :fSize="16"
                :hide-id="true"
                :mobile-resp="false"
                class="mx-3 m-1"
              />
              <div style="text-align: center; font-size: 18px; margin-left: 10px">
                <i class="fas fa-arrow-right"></i>
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
              class="mx-3 m-1"
            />
          </div>
          <div class="d-flex flex-row justify-content-start align-items-center">
            <div style="text-align: center; font-size: 18px; margin-right: 30px">
              <span class="text-danger">{{ balance }}€</span>
            </div>
          </div>
        </div>
        <RepaymentButton
          :user1="user"
          :user2="user2"
          :amount="balance"
          :room-id="roomId"
        />
      </div>
    </div>
  </div>
</template>
