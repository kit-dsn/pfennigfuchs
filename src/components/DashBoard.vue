<script setup lang="ts">
import { useRoomStateStore } from "@/stores/RoomStateStore";
import NewRoom from "@/components/NewRoom.vue";
import RoomCard from "@/components/room/RoomCard.vue";

const rooms = useRoomStateStore();
</script>

<template>
  <div
    class="container-fluid"
    v-if="
      rooms.getPfRooms.filter((room) => {
        return rooms.isPfOneOnOne(room);
      }).length > 0
    "
  >
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h3 class="text-dark mb-0"><strong>One-to-One Rooms</strong></h3>
      <b-link to="/contacts" class="btn btn-primary">
        <i class="fas fa-address-book"></i>
        Contacts
      </b-link>
    </div>
    <div class="row">
      <div
        class="col-md-6 col-xl-3 mb-4"
        v-for="id of rooms.getPfRooms.filter((room) => {
          return rooms.isPfOneOnOne(room);
        })"
        :key="id"
      >
        <RoomCard :id="id" />
      </div>
    </div>
  </div>
  <hr />
  <div class="container-fluid">
    <div class="d-flex justify-content-between align-items-center">
      <h3 class="text-dark mb-0"><strong>Group Rooms</strong></h3>
      <NewRoom />
    </div>
    <div class="d-flex flex-row-reverse mb-4"></div>
    <div class="row">
      <div
        class="col-md-6 col-xl-3 mb-4"
        v-for="id of rooms.getPfRooms.filter((room) => {
          return !rooms.isPfOneOnOne(room);
        })"
        :key="id"
      >
        <RoomCard :id="id" />
      </div>
    </div>
  </div>
</template>
