<script setup lang="ts">
import UserCard from "@/components/user/UserCard.vue";
import { axiosKey } from "@/keys";
import { useRoomStateStore } from "@/stores/RoomStateStore";
import { defined } from "@/util/helpers";
import { inject, ref, computed, onMounted, watch, type Ref } from "vue";
import { randomUUID } from "@/util/randomuuid";
import type { PfMessage, PfPaymentMessageRaw } from "@/types/Pfennigfuchs";

const axios = defined(inject(axiosKey));
const roomState = useRoomStateStore();

const props = defineProps<{
  roomId: string;
  showText: boolean;
}>();

const myId = defined(roomState.myId);

const description = ref<string>("");
const amount = ref<string>("0");
const participants = ref<Map<string, Ref<string>>>(new Map());
const payer = ref<string>(myId);
const showModal = ref(false);
const members = ref(roomState.getJoinedMembers(props.roomId));

function addParticipant(memberId: string) {
  if (!participants.value.has(memberId)) {
    participants.value.set(memberId, ref("0"));
  }
}

function removeParticipant(memberId: string) {
  participants.value.delete(memberId);
}

const validationDesc = computed(() => {
  return description.value != "";
});

const validationAmt = computed(() => {
    const ret = amount.value ? /^[0-9]+.?[0-9]?[0-9]?$/.test(amount.value) : null;
    return ret;
});

const validationShares = computed(() => {
  for (const key of participants.value.keys()) {
    if (!participants.value.get(key)){
      return false;
    } else if (!participants.value.get(key)?.value){
      return false;
    } else if (!beginsWithFloat(participants.value.get(key)?.value as string)){
      return false;
    }
  }
  return true;
});

function beginsWithFloat(val: string) {
  const number = parseFloat(val);
  return ! Number.isNaN(number);
}

watch(
  () => [participants.value.keys(), amount.value],
  () => {
    if (!showModal.value) return;
    const splitNum = parseFloat(amount.value) / participants.value.size;
    const split = Number.isNaN(splitNum) ? "0.00" : (splitNum).toFixed(2);
    for (const key of participants.value.keys()) {
      participants.value.set(key, ref(split));

    }
    return;
  },
  { deep: true }
);

function setShares(e: Event, participant: string) {
  let newVal = "0";
  const { target } = e;
  if (target) newVal = (target as HTMLButtonElement).value;
  const ref = participants.value.get(participant);
  if (ref) ref.value = newVal;
}

const missingAmt = computed(() =>{
  let amt = 0;
  for (const key of participants.value.keys()) {
    const ref = participants.value.get(key);
    if (ref) amt += parseFloat(ref.value);
  }
  return parseFloat((parseFloat(amount.value) - amt).toFixed(2));
});

onMounted(() => {
  resetArray();
});

async function create() {
  const shares = Array.from(participants.value.entries()).map(([key, val]) => {
    if (val.value){
      return { user: key, amount: val.value };
    } else {
      throw new Error("participant value not set");
    }
  });

  const txnId = encodeURIComponent(randomUUID());
  const pfMsg: PfMessage = {
    subject: description.value,
    sender: payer.value,
    v: shares,
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
  resetModal();
}

function rotatePayerLeft() {
  const currIndex = members.value.indexOf(payer.value);
  payer.value = currIndex == 0 ? members.value[members.value.length - 1] : members.value[currIndex - 1];
}

function rotatePayerRight() {
  const currIndex = members.value.indexOf(payer.value);
  payer.value = currIndex == members.value.length - 1 ? members.value[0] : members.value[currIndex + 1];
}

function selectPayer(payerP: string) {
  payer.value = payerP;
}

function resetArray() {
  participants.value.clear();
  if (!participants.value.has(myId)) participants.value.set(myId, ref("0.00"));

  payer.value = myId;

  if (props.roomId != undefined) {
    roomState.getJoinedMembers(props.roomId).forEach((element) => {
      if (!participants.value.has(element)) {
        participants.value.set(element, ref("0.00"));
      }
    });
  }
}

function resetModal() {
  description.value = "";
  amount.value = "";
  payer.value = myId;
  members.value = roomState.getJoinedMembers(props.roomId);
  resetArray();
}

const getSuggestions = computed(() => {
  return roomState
    .getJoinedMembers(props.roomId)
    .filter((e) => !participants.value.has(e));
});

function clickShowModal() {
  resetModal();
  showModal.value = true;
}
</script>
<template>
  <b-button data-cy="expenseBtn" class="btn shadow btn-primary d-sm-inline-block" @click.stop="clickShowModal">
    <i class="fas fa-money-bill-wave text-white-100 mx-2"></i>
    <template v-if="showText">Expense</template>
  </b-button>
  <b-modal hide-footer v-model="showModal" id="expense-modal" title="Add new Expense">
    <b-form v-if="showModal">
      <b-form-group>
        <b-form-input
          :state="validationDesc"
          v-model="description"
          placeholder="Description"
          :type="'text'"
          data-cy="expenseDesc"
        />
        <b-form-invalid-feedback :state="validationDesc ?? true">
          Description is empty.
        </b-form-invalid-feedback>
      </b-form-group>
      <b-form-group>
        <b-form-input
          :state="validationAmt"
          :type="'number'"
          min="0"
          v-model="amount"
          placeholder="0"
          data-cy="expenseAmount"
        />
        <b-form-invalid-feedback :state="validationAmt ?? true">
          Amount has to be a positive money amount e.g. 13.37
        </b-form-invalid-feedback>
      </b-form-group>

      <b-form-group>
        <label for="payer"><strong>Payer</strong></label>
        <b-list-group-item>
          <div
            class="d-flex flex-row p-0 w-100 justify-content-center align-items-center"
            style="overflow: visible"
          >
            <UserCard
              class="col-10"
              :user-id="payer"
              :room-id="roomId"
              :size="40"
              :fSize="17"
              :hide-id="false"
              :hide-modal="true"
              :mobile-resp="false"
              :key="payer"
            />
            <b-button
              class="col-1 btn btn-sm"
              @click="rotatePayerLeft()"
              style="margin-right: 10px"
            >
              <i class="fas fa-angle-left" />
            </b-button>
            <b-button class="col-1 btn btn-sm" @click="rotatePayerRight()">
              <i class="fas fa-angle-right" />
            </b-button>
          </div>
        </b-list-group-item>
      </b-form-group>

      <b-form-group>
        <b-list-group id="added_participants">
          <label for="added_participants"><strong>Participants</strong></label>
          <b-list-group-item
            v-for="[participant, share] of participants"
            :key="participant"
          >
            <div
              class="d-flex flex-row w-100 justify-content-center align-items-center"
              style="overflow: visible"
            >
              <UserCard
                class="col-7"
                :user-id="participant"
                :room-id="roomId"
                :size="40"
                :fSize="17"
                :hide-id="false"
                :hide-modal="true"
                :mobile-resp="false"
                @click="selectPayer(participant)"
              />
              <div class="col-4" style="background-color: white; padding: 5px">
                <input
                  class="form-control"
                  :value="share.value"
                  @change="setShares($event, participant)"
                />
                <b-form-invalid-feedback :state="validationAmt ?? true">
                  Amount has to be a positive money amount e.g. 13.37
                </b-form-invalid-feedback>
              </div>
              <b-button
                class="btn btn-sm"
                :id="participant"
                @click="removeParticipant(participant)"
              >
                <i class="fas fa-user-minus text-white-100"></i>
              </b-button>
            </div>
          </b-list-group-item>
        </b-list-group>
        <b-form-invalid-feedback :state="participants.size > 0">
          Add at least one participant.
        </b-form-invalid-feedback>
        <br />
        <b-form-invalid-feedback :state="!validationShares">
          <template v-if="missingAmt > 0">Missing: {{ missingAmt }}</template>
          <template v-if="missingAmt < 0">Too much: {{ missingAmt * -1 }}</template>
          <p v-if="missingAmt != 0 && !Number.isNaN(missingAmt)">(If this is not assigned to a participant it will be discarded.)</p>
        </b-form-invalid-feedback>
        <b-form-invalid-feedback :state="validationShares">
          Not all amounts set.
        </b-form-invalid-feedback>
      </b-form-group>

      <br />
      <h4>Add participants</h4>
      <b-form-group>
        <div class="overflow-auto" style="max-height: 40vh">
          <b-list-group id="suggested_participants" v-if="roomId != null">
            <p class="text-success" v-if="getSuggestions.length == 0">
              All room members added as participants.
            </p>
            <b-list-group-item v-for="roomMember of getSuggestions" :key="roomMember">
              <div
                class="d-flex flex-row w-100 justify-content-center align-items-center"
                style="overflow: visible"
              >
                <UserCard
                  class="col-11"
                  :user-id="roomMember"
                  :room-id="roomId"
                  :size="30"
                  :fSize="15"
                  :hide-id="false"
                  :hide-modal="true"
                  :mobile-resp="false"
                  @click="selectPayer(roomMember)"
                />
                <b-button
                  class="btn btn-sm"
                  :id="roomMember"
                  @click="addParticipant(roomMember)"
                >
                  <i class="fas fa-user-plus text-white-100"></i>
                </b-button>
              </div>
            </b-list-group-item>
          </b-list-group>
        </div>
      </b-form-group>
      <div class="d-flex justify-content-end">
        <b-button
          data-cy="submitExpense"
          class="btn btn-success"
          @click="create"
          :disabled="!validationDesc || !validationShares || participants.size == 0"
          >Add Expense</b-button
        >
      </div>
    </b-form>
  </b-modal>
</template>
