import { computed, readonly, ref } from "vue";
import { defineStore } from "pinia";
import {
  isJsonMatrixRoomCreateEvent,
  isJsonMatrixRoomMemberEvent,
  isJsonMatrixRoomNameEvent,
  type JsonMatrixClientEventWithoutRoomId,
  type JsonMatrixRoomNameEvent,
  type JsonMatrixStateEvent,
} from "@/types/Matrix";
import { useMatrixAuthStore } from "./MatrixAuthStore";
import { isJsonMatrixPfRoomMember, type EventType, type RoomEvents, type RoomName, type StateKey } from "@/types/Pfennigfuchs";
import { defined, splitMatrixId } from "@/util/helpers";
import type { PfGlobalAccountData } from "./GlobalAccountData";


export const useRoomStateStore = defineStore("pf-rooms", () => {
  const seenEventIds = new Map<string,Set<string>>();
  const lazyAddedMembers = new Set<string>();
  const roomState = ref(new Map<RoomName, RoomEvents>());

  function clear() {
    seenEventIds.clear();
    roomState.value.clear();
  }

  function leaveRoom(name: RoomName) {
    roomState.value.delete(name);
    seenEventIds.delete(name);
  }

  function addStateEvent(
    name: RoomName,
    type: EventType,
    key: StateKey,
    ev: JsonMatrixClientEventWithoutRoomId & JsonMatrixStateEvent,
    lazyMembers = false
  ): boolean {
    if (seenEventIds.get(name)?.has(ev.event_id)) {
      return false;
    }

    let evSet = seenEventIds.get(name);
    if (!evSet) {
      evSet = new Set<string>();
      seenEventIds.set(name, evSet);
    }
    evSet.add(ev.event_id);

    let room = roomState.value.get(name);
    if (!room) {
      // matrix doesn't order room creation events before other events
      /*
        // first event in a new room must be a RoomCreateEvent
        if (isJsonMatrixRoomCreateEvent(ev)) {
          if (type !== "m.room.create" || key !== "") {
            throw new AssertionError("invalid state during room creation", ev);
          }

          return true;
        } else {
          throw new Error("room creation without m.room.create event");
        }
      }
      */
      room = new Map([[type, new Map([[key, ev]])]]);
      roomState.value.set(name, room);
      return true;
    }

    let roomType = room.get(type);
    if (!roomType) {
      roomType = new Map([[key, ev]]);
      room.set(type, roomType);
      return false;
    }

    // we are backfilling room members and don't want to overwrite already added members
    if (type === "m.room.member")
      if (!lazyMembers) {
        lazyAddedMembers.delete(key);
      } else {
        if (roomType.has(key) && !lazyAddedMembers.has(key)) {
          return false;
        }
        lazyAddedMembers.add(key);
    }

    roomType.set(key, ev);
    return false;
  }

  function collectUsers(name: string) {
    const res = Array.from(getJoinedMembers(name).map(n => getMemberDisplayName(name, n))).sort().join(",");
    return res;
  }

  function getDisplayRoomName(name: RoomName): string {
    const nameEvent = roomState.value.get(name)?.get("m.room.name")?.get("");
    if (nameEvent && isJsonMatrixRoomNameEvent(nameEvent) && nameEvent.content.name) {
      return nameEvent.content.name;
    }
    return collectUsers(name) || name;
  }

  function isPfRoom(name: RoomName): boolean {
    const createEvent = roomState.value
      .get(name)
      ?.get("m.room.create")
      ?.get("");
    if (createEvent && isJsonMatrixRoomCreateEvent(createEvent)) {
      return (
        createEvent.content.type !== "m.space" &&
        (createEvent.content.pfennigfuchs ?? false)
      );
    }
    return false;
  }

  function isPfOneOnOne(name: RoomName): boolean {
    const createEvent = roomState.value
      .get(name)
      ?.get("m.room.create")
      ?.get("");
    if (createEvent && isJsonMatrixRoomCreateEvent(createEvent)) {
      return (
        createEvent.content.type !== "m.space" &&
        (createEvent.content.pfennigfuchs ?? false) &&
        (createEvent.content.pf_oneonone ?? false)
      );
    }
    return false;
  }


  function getJoinedMembers(name: RoomName): string[] {
    const members = Array.from(
      roomState.value.get(name)?.get("m.room.member") ?? []
    );
    return members
      .filter(
        ([, m]) =>
          isJsonMatrixRoomMemberEvent(m) && m.content.membership === "join"
      )
      .map(([id]) => id);
  }

  function getMembers(name: RoomName): string[] {
    const members = Array.from(
      roomState.value.get(name)?.get("m.room.member") ?? []
    );
    return members
      .filter(
        ([, m]) =>
          isJsonMatrixRoomMemberEvent(m) && (m.content.membership === "join" || m.content.membership === "leave" || m.content.membership === "invite")
      )
      .map(([id]) => id);
  }


  function getMemberDisplayName(name: RoomName, member_id: string) {
    const m = roomState.value.get(name)?.get("m.room.member")?.get(member_id);
    if (m && isJsonMatrixPfRoomMember(m)) {
      return m.content.pfennigfuchs.user_info.displayname ?? member_id;
    }
    return member_id;
  }

  function findSpace() {
    for (const [id, room] of roomState.value.entries()) {
      const createEvent = room.get("m.room.create")?.get("");
      if (createEvent && isJsonMatrixRoomCreateEvent(createEvent)) {
        if (
          createEvent.content.type === "m.space" &&
          createEvent.content.pfennigfuchs
        ) {
          return id;
        }
      }
    }
    return undefined;
  }

  function getAllContacts() {
    const res = new Set<string>();
    roomState.value.forEach((room, roomName) => {
      room.get("m.room.member")?.forEach((mem, id) => {
        if (
          (
            isPfRoom(roomName) ||
            getJoinedMembers(roomName).length == 2
          ) &&
          id !== myId() &&
          isJsonMatrixRoomMemberEvent(mem) &&
          mem.content.membership === "join"
        ) {
          res.add(id);
        }
      });
    });
    return res;
  }

  function myId() {
    const authStore = useMatrixAuthStore();
    return defined(authStore.authStore.identity);
  }

  function myDomain() {
    const id = myId();
    return id ? splitMatrixId(id)[1] : undefined;
  }

  function pfRoomsMissingFromSpace() {
    const space = findSpace();
    if (!space) {
      return [];
    }
    const allRooms = new Set(
      Array.from(roomState.value.keys()).filter(isPfRoom)
    );
    const spaceRooms = new Set(
      roomState.value.get(space)?.get("m.space.child")?.keys() ?? []
    );
    allRooms.delete(space);
    spaceRooms.forEach((r) => allRooms.delete(r));
    return Array.from(allRooms.values());
  }

  function getRoomAvatar(roomId: string) {
    const nameDesc = roomState.value.get(roomId)?.get("m.room.name")?.get("");
    if (nameDesc && isJsonMatrixRoomNameEvent(nameDesc)) {
      return nameDesc.content.pf_avatar_url;
    }
    return undefined;
  }

  function getPfPaymentInformation(roomId: string, memberId: string): PfGlobalAccountData["payment_info"] {
    const memberDesc = roomState.value.get(roomId)?.get("m.room.member")?.get(memberId);
    if (memberDesc && isJsonMatrixPfRoomMember(memberDesc) && memberDesc.content.pfennigfuchs.payment_info) {
      return new Map(Object.entries(memberDesc.content.pfennigfuchs.payment_info));
    }
    return undefined;
  }

  function getPfContactInformation(roomId: string, memberId: string): PfGlobalAccountData["user_info"] {
    const memberDesc = roomState.value.get(roomId)?.get("m.room.member")?.get(memberId);
    if (memberDesc && isJsonMatrixPfRoomMember(memberDesc) && memberDesc.content.pfennigfuchs.user_info) {
      return memberDesc.content.pfennigfuchs.user_info;
    }
    return undefined;
  }

  function getRoomDescription(roomId: string) {
    const roomDesc = roomState.value.get(roomId)?.get("m.room.name")?.get("");
    if (roomDesc && isJsonMatrixRoomNameEvent(roomDesc)) {
      return roomDesc.content.pf_room_description;
    }
    return undefined;
  }

  function forRequestRoom(roomId: string): JsonMatrixRoomNameEvent["content"] {
    const roomDesc = roomState.value.get(roomId)?.get("m.room.name")?.get("");
    if (roomDesc && isJsonMatrixRoomNameEvent(roomDesc)) {
      return roomDesc.content;
    } else {
      return {
        name: "",
      }
    }
  }

  function getOneOnOneLeftMember(roomId: string): string | undefined {
    const roomDesc = roomState.value.get(roomId)?.get("m.room.member");
    const l = Array.from(roomDesc?.entries() ?? []).filter(([, mem]) => isJsonMatrixRoomMemberEvent(mem) && mem.content.membership === "leave");
    if (l.length >= 2) {
      throw new Error("illegal state in one-on-one room");
    }
    return l[0]?.[0];
  }

  function getOneonOneOther(roomId: string): string | undefined {
    return getMembers(roomId).filter(u => u !== defined(myId()))?.[0];
  }

  return {
    roomState: readonly(roomState),

    getAllRooms: computed(() => Array.from(roomState.value.keys()).sort()),
    getPfRooms: computed(() =>
      Array.from(roomState.value.keys()).filter(isPfRoom).sort((a, b) => {
        const da = getDisplayRoomName(a);
        const db = getDisplayRoomName(b);
        return da.localeCompare(db);
      })
    ),
    getPfDisplayRooms: computed(() =>
      new Set(Array.from(roomState.value.keys()).filter(isPfRoom).map(getDisplayRoomName))
    ),
    space: computed(findSpace),

    isPfRoom,
    isPfOneOnOne,
    getOneonOneOther,
    getOneOnOneLeftMember,
    getDisplayRoomName,
    getRoomAvatar,
    getRoomDescription,
    getPfPaymentInformation,
    getPfContactInformation,
    getJoinedMembers,
    getMembers,
    getMemberDisplayName,
    getAllContacts: computed(() => getAllContacts()),
    leaveRoom,

    forRequestRoom,

    myId: computed(myId),
    myDomain: computed(myDomain),
    pfRoomsMissingFromSpace: computed(pfRoomsMissingFromSpace),

    addStateEvent,
    clear,
  };
});
