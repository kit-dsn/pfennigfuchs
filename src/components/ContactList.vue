<script setup lang="ts">
import { useRoomStateStore } from "@/stores/RoomStateStore";
import UserCard from "@/components/user/UserCard.vue";
import NewExpense from "@/components/NewExpense.vue";
import { axiosKey, notificationKey } from "@/keys";
import MatrixSync from "@/services/MatrixSync";
import { defined } from "@/util/helpers";
import { inject, ref } from "vue";
import { useRouter } from "vue-router";

const roomState = useRoomStateStore();
const axios = defined(inject(axiosKey));
const router = useRouter();
const notify = defined(inject(notificationKey));

const otherContact = ref("");
const myId = defined(roomState.myId);

function getRoomForNameIfAny(id: string): string | null {
  for (const roomId of roomState.getAllRooms) {
    if (roomState.getJoinedMembers(roomId).includes(id)) {
      return roomId;
    }
  }
  return null;
}

const MATRIX_ID_REGEX = /^@\w+:(\w+\.)+[\w]+$/;

function testMatrix(input: string) {
  return input ? get1on1room(input).length == 0 && MATRIX_ID_REGEX.test(input) : null;
}

async function create(id: string) {
  notify.pushNotification("Creating...");
  if (get1on1room(id).length > 0) {
    return;
  }
  await MatrixSync.createRoom(
    axios,
    `${id}, ${myId}`,
    new Array(id),
    true
  );
  notify.pushNotification("Created room");
}

function get1on1room(contact: string): string[] {
  const room: string[] = roomState.getAllRooms.filter((roomId) => {
    return (
      roomState.isPfOneOnOne(roomId) &&
      (roomState.getJoinedMembers(roomId).includes(contact) ||
        roomState.getDisplayRoomName(roomId).includes(contact))
    );
  });
  return room;
}

function compare(contact1: string, contact2: string) {
  if (get1on1room(contact1).length == get1on1room(contact2).length) {
    if (contact1 < contact2) return -1;
    if (contact1 > contact2) return 1;
  } else if (get1on1room(contact1).length < get1on1room(contact2).length) return 1;
  else if (get1on1room(contact1).length > get1on1room(contact2).length) return -1;
  return 0;
}
</script>

<template>
  <div class="container-fluid">
    <div class="d-flex w-100 justify-content-center">
      <div
        class="card shadow w-100 flex-fill mb-3 p-2 user_balance"
        style="border-radius: 12px"
      >
        <div
          class="card-body w-100 d-flex flex-column flex-sm-row justify-content-start align-items-center"
          style="overflow: hidden"
        >
          <label for="phone_number" class=""><strong>Add Contact:</strong></label>
          <b-form class="flex-grow mx-4 align-self-stretch align-self-sm-center">
            <b-form-input
              data-cy="addInput"
              v-model="otherContact"
              :type="'text'"
              :state="testMatrix(otherContact)"
              placeholder="@abc:matrix.org"
              id="displayname"
            ></b-form-input>
          </b-form>
          <b-button
            data-cy="addButton"
            :disabled="!testMatrix(otherContact)"
            class="btn btn-success mt-sm-0 mt-2"
            @click="create(otherContact)"
            >Create 1:1</b-button
          >
        </div>
        <b-form-invalid-feedback :state="testMatrix(otherContact) ?? true" class="text-center">
          <template v-if="get1on1room(otherContact).length > 0">
            You already have a room with this user.
          </template>
          <template v-else> Invalid ID </template>
        </b-form-invalid-feedback>
      </div>
    </div>
    <div
      class="d-flex justify-content-center"
      v-for="contact of Array.from(roomState.getAllContacts).sort(compare)"
      :key="contact"
    >
      <div
        class="card shadow flex-fill mb-3 p-2 user_balance"
        style="border-radius: 12px"
      >
        <div
          class="card-body d-flex flex-column flex-sm-row justify-content-between align-items-start sm-align-items-center"
          style="overflow: hidden"
        >
          <UserCard
            class="align-self-sm-center align-self-start"
            :user-id="contact"
            :hide-id="false"
            :room-id="getRoomForNameIfAny(contact)"
            :hide-modal="false"
            :size="50"
            :fSize="18"
            :mobile-resp="false"
          />
          <!-- :style="{display: get1on1room(contact).length > 0 ? 'inline-block' : 'none !important'}" -->
          <div
            v-if="get1on1room(contact).length > 0"
            class="d-flex flex-row flex-sm-column justify-content-center text-success m-2 align-self-center"
            style="padding-left: 20px"
          >
            <b-button
              :data-cy="`visitButton-${contact}`"
              @click="
                router.push({
                  path: `/rooms/${get1on1room(contact)[0]}/balances`,
                })
              "
              >Go to Room</b-button
            >
            <div class="p-1"></div>
            <NewExpense :room-id="get1on1room(contact)[0]" :show-text="true" />
          </div>
          <div
            :data-cy="`createButton-${contact}`"
            :style="{
              display: get1on1room(contact).length == 0 ? '' : 'none !important',
            }"
            class="d-flex justify-content-end text-success m-2 align-self-center"
            style="padding-left: 20px"
          >
            <b-button @click="create(contact)">Create 1:1</b-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style></style>
