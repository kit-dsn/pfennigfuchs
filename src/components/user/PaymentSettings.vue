<script setup lang="ts">
import { axiosKey } from "@/keys";
import {
  useGlobalAccountData,
  type PaymentInfoType,
} from "@/stores/GlobalAccountData";
import { useRoomStateStore } from "@/stores/RoomStateStore";
import { defined } from "@/util/helpers";
import { computed, inject, ref } from "vue";
import type { UUID } from "@/types/Pfennigfuchs";
import { randomUUID } from "@/util/randomuuid";
import MatrixSync from "@/services/MatrixSync";

const axios = defined(inject(axiosKey));

const roomState = useRoomStateStore();
const globalData = useGlobalAccountData();

const myId = defined(roomState.myId);

const pi_types = ["PAYPAL", "IBAN", "Other"] as const;

const pi_type = ref("");
const pi_address = ref("");
const pi_tag = ref("");

async function add() {
  const data = new Map(globalData.data.payment_info);
  data.set(randomUUID(), {
    type: pi_type.value as PaymentInfoType,
    address: pi_address.value,
    tag: pi_tag.value,
  });

  const ui = globalData.forRequest();
  await MatrixSync.updateUserInfo(axios, myId,
    {
      ...ui,
      payment_info: Object.fromEntries(data)
    }
  );

  pi_type.value = "";
  pi_address.value = "";
  pi_tag.value = "";
}

async function removePi(uuid: UUID) {
  const data = new Map(globalData.data.payment_info);
  data.delete(uuid);

  const ui = globalData.forRequest();
  await MatrixSync.updateUserInfo(axios, myId,
    {
      ...ui,
      payment_info: Object.fromEntries(data)
    }
  );
}

const validationAddress = computed(() => {
  return pi_address.value.length > 0 ? true : null;
});

const validationTag = computed(() => {
  if (pi_tag.value.length > 0) {
    return /^[a-zA-Z0-9_]+$/.test(pi_tag.value);
  } else {
    return null;
  }
});

const validationType = computed(() => {
  return pi_type.value.length > 0;
});
</script>

<template>
  <div class="row mb-3">
    <div class="col">
      <div class="card shadow mb-3">
        <div class="card-header py-3">
          <p class="text-primary m-0 fw-bold">Stored Payment Information</p>
        </div>
        <div class="card-body text-center selection-enabled">
          <ul class="list-group">
            <li
              class="list-group-item"
              v-for="[uuid, pi] of globalData.data.payment_info"
              :key="uuid"
            >
              <div>
                <h4>{{ pi.tag }}</h4>
                <p>
                  <b>{{ pi.type }}:</b> {{ pi.address }}
                </p>
                <input
                  type="button"
                  class="btn btn-danger"
                  value="Remove"
                  @click="removePi(uuid)"
                />
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div class="col-lg-7">
      <div class="card shadow mb-3">
        <div class="card-header py-3">
          <p class="text-primary m-0 fw-bold">Add Payment Information</p>
        </div>
        <div class="card-body">
          <b-form @submit.stop.prevent="() => {}">
            <div class="row">
              <div class="col mb-3">
                <label for="tag"><strong>Address</strong></label>
                <b-form-input
                  v-model="pi_address"
                  :state="validationAddress"
                  placeholder="Value"
                  id="tag"
                ></b-form-input>
              </div>
            </div>
            <div class="row">
              <div class="col mb-3">
                <label for="tag"><strong>Tag</strong></label>
                <b-form-input
                  v-model="pi_tag"
                  :state="validationTag"
                  placeholder="Name"
                  id="tag"
                ></b-form-input>
                <b-form-invalid-feedback :state="validationTag ?? true">
                  The payment tag must be made of characters, numbers or
                  underscores.
                </b-form-invalid-feedback>
              </div>
              <div class="col mb-3">
                <label>
                  <strong>Type Selection</strong>
                </label>
                <!-- :state="validationType"  -->
                <b-form-select
                  :options="
                    [
                      { text: 'Please choose an option', value: '', disabled: true },
                      pi_types,
                    ].flat()
                  "
                  v-model="pi_type"
                  :class="{ 'is-valid': validationType}"
                ></b-form-select>
              </div>
            </div>
          </b-form>
          <input
            class="btn btn-success btn-sm"
            type="button"
            value="Add"
            @click="add"
            :disabled="!(validationAddress ?? true)"
          />
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
