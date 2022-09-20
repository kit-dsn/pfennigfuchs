<script setup lang="ts">
import RoomNavbar from "@/components/room/RoomNavbar.vue";
import MemberInvite from "@/components/MemberInvite.vue";
import MatrixSync from "@/services/MatrixSync";
import { computed, inject, ref } from "vue";
import { defined } from "@/util/helpers";
import { axiosKey, notificationKey } from "@/keys";
import { useRoute } from "vue-router";
import { useRoomStateStore } from "@/stores/RoomStateStore";
import AvatarUpload from "@/components/AvatarUpload.vue";
import type { JsonMatrixRoomNameEvent } from "@/types/Matrix";

const axios = defined(inject(axiosKey));
const notify = defined(inject(notificationKey));
const invitees = ref<string[]>([]);
const route = useRoute();
const roomId = route.params.id as string;
const roomState = useRoomStateStore();

const roomname = ref("");
const descField = ref("");
const avatarUrl = ref(""); //mxc url

// eslint-vue doesn't understand vue modules
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const memberInvite = ref<InstanceType<typeof MemberInvite> | null>(null);

async function sendInvites() {
  await Promise.all(
    invitees.value.map(
      async (invitee) => await MatrixSync.inviteRaw(axios, roomId, invitee)
    )
  );
  notify.pushNotification("Invites sent");
  // eslint-vue doesn't understand vue modules
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  memberInvite.value?.resetModal();
}

async function updateInfos(clearAvatar = false) {
  notify.pushNotification("Saving...");
  const oldState = roomState.forRequestRoom(roomId);
  const data: JsonMatrixRoomNameEvent["content"] = {
    ...oldState,

    ...(roomname.value && { name: roomname.value }),
    ...((clearAvatar || avatarUrl.value) && { pf_avatar_url: avatarUrl.value }),
    ...(descField.value && { pf_room_description: descField.value }),
  };

  await MatrixSync.updateRoomInfo(axios, roomId, data);
  roomname.value = "";
  descField.value = "";
  notify.pushNotification("Settings saved");
}

async function clearAvatar() {
  avatarUrl.value = "";
  await updateInfos(true);
}

async function uploadAvatar(url: string) {
  avatarUrl.value = url;
  await updateInfos();
}

const validationName = computed(() => {
  if (roomname.value.length > 0) {
    // return /^[a-zA-Z0-9_]+$/.test(roomname.value);
    return roomname.value.length > 0 && roomname.value.length < 50 && !roomState.getPfDisplayRooms.has(roomname.value);
  } else {
    return null;
  }
});

const saveButtonEnabled = computed(() => {
  return validationName.value || descField.value.length > 0;
});
</script>

<template>
  <div class="container-fluid">
    <RoomNavbar />
    <div class="d-flex justify-content-between align-items-center m-4">
      <h3 class="text-dark mb-2"><strong>Room Configuration</strong></h3>
    </div>
    <div class="row mb-3">
      <div class="col-lg-4">
        <AvatarUpload
          :id="roomId"
          @avatar-cleared="() => clearAvatar()"
          @avatar-uploaded="(url: string) => uploadAvatar(url)"
        />
      </div>
      <div class="col-lg-8">
        <div class="row">
          <div class="col">
            <div class="card shadow mb-3">
              <div class="card-header py-3">
                <p class="text-primary m-0 fw-bold">Room Parameters</p>
              </div>
              <div class="card-body">
                <b-form @submit.stop.prevent="() => {}">
                  <div class="row">
                    <div class="col">
                      <div class="mb-3">
                        <label for="roomname"><strong>Room Name</strong></label>
                        <b-form-input
                          v-model="roomname"
                          :placeholder="roomState.getDisplayRoomName(roomId)"
                          :type="'text'"
                          data-cy="roomnameCy"
                          :state="validationName"
                          id="displayname"
                        ></b-form-input>
                        <b-form-invalid-feedback :state="validationName ?? true">
                          Roomname is not between 1 and 50 symbols long or already exists.
                        </b-form-invalid-feedback>
                      </div>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col">
                      <div class="mb-3">
                        <label for="roomname"><strong>Room Description</strong></label>
                        <b-form-textarea
                          id="textarea"
                          v-model="descField"
                          :placeholder="roomState.getRoomDescription(roomId)"
                          rows="3"
                          max-rows="6"
                          data-cy="roomDesc"
                        ></b-form-textarea>
                      </div>
                    </div>
                  </div>
                </b-form>
                <input
                  type="button"
                  class="btn btn-success btn-sm"
                  value="Save Changes"
                  data-cy="submitCy"
                  @click="updateInfos()"
                  :disabled="!saveButtonEnabled"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card shadow mb-3">
      <div class="card-header py-3">
        <p class="text-primary m-0 fw-bold">Invite others</p>
      </div>
      <div class="card-body">
        <MemberInvite
          ref="memberInvite"
          :roomId="roomId"
          @invitees-changed="(inviteesNew: string[]) => invitees = inviteesNew.slice()"
        />
        <div class="d-flex justify-content-end">
          <b-button
            class="btn btn-success"
            :disabled="invitees.length == 0"
            @click="sendInvites"
            >Invite</b-button
          >
        </div>
      </div>
    </div>
  </div>
</template>
