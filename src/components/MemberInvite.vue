<script setup lang="ts">
import { useRoomStateStore } from "@/stores/RoomStateStore";
import UserCard from "@/components/user/UserCard.vue";
import { ref, unref, watch, type Ref } from "vue";
import { BFormInput } from "bootstrap-vue-3";

const emit = defineEmits<{
  (e: "invitees-changed", invitees: string[]): void;
}>();

const roomState = useRoomStateStore();
const invitees = ref<string[]>([]);

defineProps<{ roomId: string | null }>();

function addInvitee(memberId: string) {
  if (!invitees.value.includes(memberId)) {
    invitees.value.push(memberId);
  }
}

const MATRIX_ID_REGEX = /^@\w+:(\w+\.)+[\w]+$/;

function tagState(input: string): boolean {
  return MATRIX_ID_REGEX.test(input);
}

watch(
  () => invitees.value,
  () => {
    emit("invitees-changed", invitees.value);
  },
  { deep: true }
);

function resetModal() {
  invitees.value = [];
}

defineExpose({
  resetModal
});

function hackInputAttributes(obj: {id?: Ref<string>, value?: Ref<string | number>}): {id?: string, value?: string | number} {
  const {id, value, ...rest} = obj;
  return {
    ...rest,
    ...(id && {id: unref(id)}),
    ...(value && {value: unref(value)})
  };
}

const hackUnref = unref;
</script>

<template>
  <label for="selected_members"><strong>Select Members</strong></label>
  <b-form-tags v-model="invitees" no-outer-focus class="sm-2" :tag-validator="tagState">
    <template
      #default="{
        tags,
        inputAttrs,
        inputHandlers,
        tagVariant,
        addTag,
        removeTag,
        isInvalid,
      }"
    >
      <b-input-group>
        <b-form-input
          id="input-custom-username-feedback"
          v-bind="hackInputAttributes(inputAttrs)"
          v-on="inputHandlers"
          placeholder="Add Matrix ID..."
          class="form-control col"
          :state="
            hackInputAttributes(inputAttrs).value === '' ? null : !hackUnref(isInvalid)
          "
          aria-describedby="input-custom-username-feedback"
        ></b-form-input>
        <b-input-group-append class="col-lg-2">
          <b-button @click="addTag()" style="margin-left: 10px">Add</b-button>
        </b-input-group-append>
        <b-form-invalid-feedback id="input-custom-username-feedback"
          >Please enter a valid Matrix ID.
        </b-form-invalid-feedback>
      </b-input-group>
      <div class="d-flex flex-row flex-wrap overflow-auto pt-2 pb-1">
        <b-form-tag
          v-for="tag of hackUnref(tags)"
          @remove="removeTag(tag)"
          :key="tag"
          :title="tag"
          :variant="tagVariant"
          ><div class="my-1">
            {{ tag }}
          </div></b-form-tag
        >
      </div>
      <br />
      <label for="suggested_members"><strong>Suggested Members</strong></label>
      <b-list-group id="suggested_members">
        <b-list-group-item
          class="overflow-auto"
          v-for="contact of Array.from(roomState.getAllContacts).filter(element => {
            return !roomState.getJoinedMembers(roomId!).includes(element)
          })"
          :key="contact"
        >
          <div class="d-flex flex-row w-100 justify-content-center align-items-center">
            <UserCard
              style="max-width: 25rem"
              class="flex-grow"
              :user-id="contact"
              :room-id="null"
              :hide-modal="true"
              :size="30"
              :fSize="16"
              :hide-id="false"
              :mobile-resp="false"
            />
            <b-button
              class="btn btn-sm"
              :id="contact"
              @click="addInvitee(contact)"
              :disabled="invitees.includes(contact)"
              ><i class="fas fa-plus-circle"></i
            ></b-button>
          </div>
        </b-list-group-item>
      </b-list-group>
    </template>
  </b-form-tags>
</template>

<style>
.flex-wrap.overflow-auto > span {
  margin-top: 5px;
}
</style>
