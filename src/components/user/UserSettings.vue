<script setup lang="ts">
import { axiosKey, notificationKey } from "@/keys";
import { computed, inject, ref } from "vue";
import { defined } from "@/util/helpers";
import { testEmail, testNumber } from "@/util/helpers";
import { useGlobalAccountData } from "@/stores/GlobalAccountData";
import { useRoomStateStore } from "@/stores/RoomStateStore";
import MatrixSync from "@/services/MatrixSync";
import AvatarUpload from "@/components/AvatarUpload.vue";

const axios = defined(inject(axiosKey));
const notify = defined(inject(notificationKey));

const roomState = useRoomStateStore();
const globalData = useGlobalAccountData();

const myId = defined(roomState.myId);

const displayname = ref("");
const phone = ref("");
const email = ref("");
const avatarUrl = ref(""); //mxc url

async function updateInfos(clearAvatar = false) {
  notify.pushNotification("Saving...");
  const infos = globalData.forRequest();

  await MatrixSync.updateUserInfo(axios, myId, {
    ...infos,
    user_info: {
      ...defined(infos.user_info),

      ...(displayname.value && { displayname: displayname.value }),
      ...(email.value && { email: email.value }),
      ...(phone.value && { phone: phone.value }),
      ...((clearAvatar || avatarUrl.value) && { avatar_url: avatarUrl.value }),
    },
  });
  displayname.value = "";
  phone.value = "";
  email.value = "";

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
  if (displayname.value.length > 0) {
    return /^[a-zA-Z0-9_]+$/.test(displayname.value);
  } else {
    return null;
  }
});

const validationEmail = computed(() => {
  if (email.value.length > 0) {
    return testEmail(email.value);
  } else {
    return null;
  }
});

const validationPhone = computed(() => {
  if (phone.value.length > 0) {
    return testNumber(phone.value);
  } else {
    return null;
  }
});

const saveButtonEnabled = computed(() => {
  return validationName.value || validationEmail.value || validationPhone.value;
});
</script>

<template>
  <div class="row mb-3">
    <div class="col-lg-4">
      <AvatarUpload
        :id="defined(roomState.myId)"
        @avatar-cleared="() => clearAvatar()"
        @avatar-uploaded="(url: string) => uploadAvatar(url)"
      />
    </div>
    <div class="col-lg-8">
      <div class="row">
        <div class="col">
          <div class="card shadow mb-3">
            <div class="card-header py-3">
              <p class="text-primary m-0 fw-bold">User Settings</p>
            </div>
            <div class="card-body">
              <b-form @submit.stop.prevent="() => {}">
                <div class="row">
                  <div class="col">
                    <div class="mb-3">
                      <label for="displayname"><strong>Displayname</strong></label>
                      <b-form-input
                        v-model="displayname"
                        :type="'text'"
                        data-cy="displaynameCy"
                        :state="validationName"
                        :placeholder="globalData.data.user_info?.displayname"
                        id="displayname"
                      ></b-form-input>
                      <b-form-invalid-feedback :state="validationName ?? true">
                        Your user displayname must be made of characters, numbers or
                        underscores.
                      </b-form-invalid-feedback>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col">
                    <div class="mb-3">
                      <label for="phone_number"><strong>Phone Number</strong></label>
                      <b-form-input
                        v-model="phone"
                        :type="'tel'"
                        :state="validationPhone"
                        data-cy="numberCy"
                        :placeholder="globalData.data.user_info?.phone"
                        id="phone_number"
                      ></b-form-input>
                      <b-form-invalid-feedback :state="validationPhone ?? true">
                        Your phone number should be in a valid format.
                      </b-form-invalid-feedback>
                    </div>
                  </div>
                  <div class="col">
                    <div class="mb-3">
                      <label for="email"><strong>E-Mail</strong></label>
                      <b-form-input
                        v-model="email"
                        :type="'email'"
                        data-cy="emailCy"
                        :state="validationEmail"
                        :placeholder="globalData.data.user_info?.email"
                        id="email"
                      ></b-form-input>
                      <b-form-invalid-feedback :state="validationEmail ?? true">
                        Your E-Mail should be in a valid format.
                      </b-form-invalid-feedback>
                    </div>
                  </div>
                </div>
              </b-form>

              <div class="d-flex justify-content-end">
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
  </div>
</template>

<style scoped>
.btn {
  width: 125px;
}
</style>
