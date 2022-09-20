import type { MessageType, NotificationType } from "@/keys";
import { useAvatarStore } from "@/stores/AvatarStore";
import { useGlobalAccountData, type PfGlobalAccountDataRaw } from "@/stores/GlobalAccountData";
import type { useMessageStore } from "@/stores/MessageStore";
import { useRoomStateStore } from "@/stores/RoomStateStore";
import {
  isJsonMatrixRoomCreateEvent,
  isJsonMatrixRoomMessage,
  isJsonMatrixRoomMemberEvent,
  isJsonMatrixRoomNameEvent,
  isJsonMatrixStateEvent,
  type JsonMatrixAccountData,
  type JsonMatrixCreateRoom,
  type JsonMatrixInvitedRoom,
  type JsonMatrixMessageResponse,
  type JsonMatrixProfile,
  type JsonMatrixRooms,
  type JsonMatrixSyncRequest,
  type JsonMatrixSyncResponse,
  type JsonMatrixRoomNameEvent,
  type JsonMatrixFilter,
  type JsonMatrixClientEvent,
} from "@/types/Matrix";
import { isJsonMatrixPfGlobalDataEvent, isJsonMatrixPfInitialMessage, isJsonMatrixPfMessageRaw, isJsonMatrixPfRoomMember, type JsonMatrixPfGlobalData, type PfInitial, type PfInitialMessageRaw, type PfPaymentMessage, type PfRoomMember } from "@/types/Pfennigfuchs";
import { defined, filterMaybeOne, setRelativeComplement } from "@/util/helpers";
import { randomUUID } from "@/util/randomuuid";
import axios, { type AxiosInstance, type AxiosResponse, } from "axios";

export default class MatrixSync {
  readonly #LIMIT = import.meta.env.PROD ? 100 : 100;
  readonly #INITIAL_LIMIT = import.meta.env.PROD ? 10 : 10;
  #initialLoad = true;

  limit() {
    return this.#initialLoad ? this.#INITIAL_LIMIT : this.#LIMIT;
  }

  readonly #roomStore: ReturnType<typeof useRoomStateStore>;
  readonly #messageStore: ReturnType<typeof useMessageStore>;
  readonly #globalAccountData: ReturnType<typeof useGlobalAccountData>;
  readonly #axios: AxiosInstance;
  readonly #abortAxios = new AbortController();

  readonly #myId: string;

  #globalSyncToken: string | undefined = undefined;
  static readonly #SYNC_TIMEOUT_MS = 10000;

  #messager: MessageType;
  #notifier: NotificationType;

  constructor(
    roomStore: ReturnType<typeof useRoomStateStore>,
    msgStore: ReturnType<typeof useMessageStore>,
    globalAccountData: ReturnType<typeof useGlobalAccountData>,
    axios: AxiosInstance,
    messager: MessageType,
    notifier: NotificationType,
  ) {
    this.#roomStore = roomStore;
    this.#messageStore = msgStore;
    this.#globalAccountData = globalAccountData;
    this.#axios = axios;
    this.#messager = messager;
    this.#notifier = notifier;

    this.#myId = defined(roomStore.myId);
  }

  static async leaveRoomRaw(axios: AxiosInstance, roomId: string) {
    const res = await axios.post(
      `/_matrix/client/v3/rooms/${roomId}/leave`,
      {
        reason: ""
      }
    );
    return res.status;
  }

  static async inviteRaw(axios: AxiosInstance, roomId: string, userId: string) {
    const res = await axios.post(
      `/_matrix/client/v3/rooms/${roomId}/invite`,
      {
        reason: "",
        user_id: userId
      }
    );
    return res.status;
  }

  static async #createRoomRaw(axios: AxiosInstance, room: JsonMatrixCreateRoom) {
    const res = await axios.post<{ room_id: string }, AxiosResponse<{ room_id: string }>, JsonMatrixCreateRoom>(
      "/_matrix/client/v3/createRoom",
      room
    );
    return res.data.room_id;
  }

  static async updateUserInfo(axios: AxiosInstance, id: string, ui: PfGlobalAccountDataRaw) {
    return await axios.put<void, AxiosResponse<void>, PfGlobalAccountDataRaw>(
      `/_matrix/client/v3/user/${encodeURIComponent(id)}/account_data/pfennigfuchs`, ui);
  }

  static async updateRoomInfo(axios: AxiosInstance, room: string, data: JsonMatrixRoomNameEvent["content"]) {
    await axios.put<void, AxiosResponse<void>, JsonMatrixRoomNameEvent["content"]>(
      `/_matrix/client/v3/rooms/${encodeURIComponent(room)}/state/m.room.name/`,
      data);
    return;
  }

  static async createRoom(axios: AxiosInstance, name: string, invite_ids: string[],
      oneonone = false, description: string | undefined = undefined) {
    const roomId = await MatrixSync.#createRoomRaw(axios, {
      creation_content: {
        "m.federate": true,
        pfennigfuchs: true,
        ...(oneonone && { pf_oneonone: oneonone })

      },
      preset: "trusted_private_chat",
      room_version: "9",
      visibility: "private",
      invite: invite_ids,
      ...(description && {topic: description}),
      power_level_content_override: {
        users_default: 100
      },
      initial_state: [
        {
          type: "m.room.name",
          content: {
            name,
            ...(description && { pf_room_description: description })
          },
          state_key: ""
        } as JsonMatrixRoomNameEvent
      ],
    });

    const txnId = encodeURIComponent(randomUUID());
    const pfInitMsg: PfInitial = {
      pf_initial: true,
    };
    const msg: PfInitialMessageRaw["content"] = {
      body: "🦊",
      msgtype: "m.text",
      format: "pf.initial",
      formatted_body: JSON.stringify(pfInitMsg),
    };
    await axios.put(
      `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`,
      msg
    );
    return roomId;
  }

  #createFilter(): string {
    const state = useRoomStateStore();
    const filter: JsonMatrixFilter = {
      account_data: {
        types: ['pfennigfuchs'],
        // limit: this.#LIMIT
      },
      presence: {
        // types: [],
        types: [],
        // limit: this.#LIMIT
      },
      // event_format: "federation",
      room: {
        not_rooms: state.getAllRooms.filter(r => !this.isPfRelatedRoom(r)),
        ephemeral: {
          types: [],
          // limit: this.#LIMIT
        },
        state: {
          lazy_load_members: true,
          include_redundant_members: false,
          limit: this.limit(),
        },
        timeline: {
          lazy_load_members: true,
          include_redundant_members: false,
          limit: this.limit(),
        },
      }
    };
    return JSON.stringify(filter);
  }

  /**
   * Raw synchronization interface with matrix
   *
   * @param syncOptions options for the /sync api call
   */
  async #matrixSyncRaw(
    syncOptions: JsonMatrixSyncRequest
  ): Promise<JsonMatrixSyncResponse> {
    const res = await this.#axios.get<JsonMatrixSyncResponse>(
      `/_matrix/client/v3/sync`,
      { params: syncOptions, signal: this.#abortAxios.signal }
    );
    return res.data;
  }


  /**
   * Creates the required space for Pfennigfuchs to operate with a random name.
   * Sets pfennigfuchs attribute in the initial m.room.create content.
   */
  async #createSpace() {
    const name = `pfennigfuchs_${randomUUID()}`;
    await MatrixSync.#createRoomRaw(this.#axios, {
      creation_content: {
        "m.federate": false,
        type: "m.space",
        pfennigfuchs: true,
      },
      preset: "private_chat",
      room_version: "9",
      name: name,
      visibility: "private",
      initial_state: [
        {
          type: "m.room.topic",
          state_key: "",
          content: {
            topic: ""
          }
        }
      ]
    });
    return;
  }

  #applyGlobalData(data: JsonMatrixAccountData) {
    const o = filterMaybeOne(
      data.events,
      isJsonMatrixPfGlobalDataEvent,
      "ambiguous global account data"
    );
    if (o) {
      if (o.content.payment_info) {
        this.#globalAccountData.data.payment_info =
          new Map(Object.entries(o.content.payment_info));
      }

      if (o.content.user_info) {
        this.#globalAccountData.data.user_info = o.content.user_info;
      }
    }
  }

  async #joinPfRoom(id: string, room: JsonMatrixInvitedRoom) {
    const r = filterMaybeOne(
      room.invite_state.events,
      isJsonMatrixRoomCreateEvent,
      "ambiguous room create event"
    );
    if (!r) {
      return;
    }
    const pfRoom = r.content.pfennigfuchs ?? false;
    if (pfRoom) {
      await this.#axios.post(`/_matrix/client/v3/join/${encodeURIComponent(id)}`);
      const roomName = filterMaybeOne(
        room.invite_state.events,
        isJsonMatrixRoomNameEvent,
        "ambiguous room name event"
      );
      this.#messager.pushMessage(`You have been invited to ${roomName?.content.name ?? id}`);
    }
  }

  #applyRoomState(rooms: JsonMatrixRooms) {
    const newRooms = new Set<string>();
    rooms.join &&
      Object.entries(rooms.join).forEach(([id, room]) => {
        room.state.events
          .filter(isJsonMatrixStateEvent)
          .forEach((v) => {
              if (this.#roomStore.addStateEvent(id, v.type, v.state_key, v)) {
                newRooms.add(id);
              }
          });
        room.timeline.events
          .filter(isJsonMatrixStateEvent)
          .forEach((v) =>
            this.#roomStore.addStateEvent(id, v.type, v.state_key, v)
          );
      });
    rooms.leave &&
      Object.keys(rooms.leave).forEach((r) => { 
        this.#roomStore.leaveRoom(r)
        this.#messageStore.leaveRoom(r);
      });
    return newRooms;
  }

  async #moveRoomToSpace(this: MatrixSync, id: string) {
    const store = this.#roomStore;
    const space = store.space;
    if (space) {
      await this.#axios.put(
        `/_matrix/client/v3/rooms/${encodeURIComponent(
          space
        )}/state/m.space.child/${encodeURIComponent(id)}`,
        {
          via: [this.#roomStore.myDomain],
          canonical: true,
        }
      );
    }
  }

  async #checkAndMoveRoomsToSpace() {
    const l = this.#roomStore.pfRoomsMissingFromSpace;
    if (l.length > 0) {
      await Promise.all(l.map(el => this.#moveRoomToSpace(el)));
    }
  }

  async #fetchRoomMessagesRaw(roomName: string, from?: string, to?: string) {
    const res = await this.#axios.get<JsonMatrixMessageResponse>(`/_matrix/client/v3/rooms/${encodeURIComponent(roomName)}/messages`, {
      params: {
        dir: "b",
        filter: this.#createFilter(),
        limit: this.limit() * 2 + 1, // state and chunks and maybe off-by-one error in synapse
        ...(from && { from }),
        ...(to && { to }),
      }
    });
    return res.data;
  }

  async #feedRoom(room: string, msgtoken?: string, prevToken?: string) {
    let token: string | undefined = msgtoken;
    const buffer: JsonMatrixClientEvent[][] = [];
    let o: JsonMatrixMessageResponse;
    do {
      o = await this.#fetchRoomMessagesRaw(room, token, prevToken);
      o.chunk.reverse();
      buffer.unshift(o.chunk);
      if (!o.end) {
        break;
      }
      token = o.end;
    } while (!prevToken || token !== prevToken);
    return buffer;
  }

  #initialSync(): boolean {
    return !this.#globalSyncToken;
  }

  #notificationPayment(this: MatrixSync, roomId: string, e: PfPaymentMessage): void {
    if (this.#initialSync()) {
      return;
    }

    const room = this.#roomStore.getDisplayRoomName(roomId);

    if (this.#myId === e.sender) {
      const amount = e.content.formatted_body.v.reduce((acc,v_) => acc + parseFloat(v_.amount), 0).toFixed(2);
      this.#messager.pushMessage(`You paid ${amount} in ${room} with subject: ${e.content.formatted_body.subject}`);
    } else if (e.content.formatted_body.v.some((e) => e.user === this.#myId)) {
      const amount = e.content.formatted_body.v.reduce((acc, v_) => v_.user === this.#myId ? acc + parseFloat(v_.amount) : acc, 0).toFixed(2);
      this.#messager.pushMessage(`New expense of ${amount} in ${room} with subject: ${e.content.formatted_body.subject}`);
    }
  }

  async #syncMessages(data: JsonMatrixSyncResponse, newRooms: Set<string>, prevToken?: string) {
    await Promise.all(Object.entries(data.rooms?.join ?? {}).map(async ([room, o]) => {
      if (this.#roomStore.isPfRoom(room)) {
        const events = o.timeline.events;
        const msgtoken = o.timeline.prev_batch;
        const newRoom = newRooms.has(room);
        if (newRoom || (msgtoken && o.timeline.limited)) {
          const feed = await this.#feedRoom(room, msgtoken, newRoom ? undefined : prevToken);
          feed.forEach(b => {
            b.filter(isJsonMatrixStateEvent).filter(isJsonMatrixRoomMemberEvent).forEach(e => {
              this.#roomStore.addStateEvent(room, e.type, e.state_key, e, true)
            });
            const batch = b.filter(isJsonMatrixRoomMessage).filter(isJsonMatrixPfMessageRaw);
            this.#messageStore.addMessageBatch(room, batch, this.#notificationPayment.bind(this));
          });
        }
        events.filter(isJsonMatrixStateEvent).filter(isJsonMatrixRoomMemberEvent).forEach(e => {
          this.#roomStore.addStateEvent(room, e.type, e.state_key, e, true)
        });
        const batch = events.filter(isJsonMatrixRoomMessage).filter(isJsonMatrixPfMessageRaw);
        this.#messageStore.addMessageBatch(room, batch, this.#notificationPayment.bind(this));

        const msg = this.#messageStore.messages.get(room)?.[0]?.[0];
        if (!msg || !isJsonMatrixPfInitialMessage(msg) || !msg.content.formatted_body.pf_initial) {
          // this.#notifier.pushNotification(`History truncation detected in room ${this.#roomStore.getDisplayRoomName(room)}.`);
        }
      }
    }));
  }

  #syncAvatars(/*data: JsonMatrixSyncResponse*/) {
    // no changes in rooms hopefully does mean, no changes
    // to avatars
    // if (!data.rooms) {
    //   return;
    // }

    type matrixId = string;
    type mxcUrl = string;
    const newAvatarMap = new Map<matrixId, mxcUrl>();

    /* collect all mxc avatar urls from all rooms for a particular user */
    for (const [name, room] of this.#roomStore.roomState.entries()) {
      // only care for avatars from pf rooms
      if (!this.#roomStore.isPfRoom(name)) {
        continue;
      }
      
      const roomNameEvent = room.get("m.room.name")?.get("");
      if (roomNameEvent && isJsonMatrixRoomNameEvent(roomNameEvent) && roomNameEvent.content.pf_avatar_url) {
        newAvatarMap.set(name, roomNameEvent.content.pf_avatar_url);
      }

      Array.from(room.get("m.room.member")?.entries() ?? []).forEach(([matrixId, memberEvent]) => {
        if (isJsonMatrixPfRoomMember(memberEvent) && memberEvent.content.membership === "join" && memberEvent.content.pfennigfuchs.user_info.avatar_url) {
          newAvatarMap.set(matrixId, memberEvent.content.pfennigfuchs.user_info.avatar_url);
        }
      });
    }

    const glbl = useGlobalAccountData();
    if (glbl.data.user_info?.avatar_url) {
      newAvatarMap.set(this.#myId, glbl.data.user_info.avatar_url);
    }

    // TODO: performance improvment, we might skip removing avatars if no room event happend
    // if (data.rooms?.leave) {
    /* this part deletes old matrix ids from maybe parted channels */
    // TODO: extract into function difference
    const avatarStore = useAvatarStore();
    const toRemove = setRelativeComplement(avatarStore.avatarMap.keys(), newAvatarMap.keys());
    toRemove.forEach(u => {
      avatarStore.avatarMap.delete(u)
    });
    // }

    /* this part updates existing matrix id to mxc urls *only* if they have changed */
    for (const [k, v] of newAvatarMap.entries()) {
      const changed = avatarStore.avatarMap.get(k)?.mxc !== v;
      if (changed) {
        avatarStore.avatarMap.set(k, { mxc: v });
      }
    }
  }

  async #syncProfile(/*data: JsonMatrixSyncResponse*/) {
    if (this.#globalAccountData.data.user_info) {
      return;
    }

    let res;
    try {
      res = await this.#axios.get<JsonMatrixProfile>(`/_matrix/client/v3/profile/${encodeURIComponent(this.#myId)}`);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        /* ignore */
      } else {
        throw e;
      }
    }

    const update: PfGlobalAccountDataRaw["user_info"] = {
      displayname: res?.data.displayname ?? "",
      avatar_url: res?.data.avatar_url ?? "",
      email: "",
      phone: "",
    }

    await MatrixSync.updateUserInfo(this.#axios, this.#myId, {
      ...this.#globalAccountData.forRequest(),
      user_info: update
    });
  }


  async #sendRoomUpdate(roomName: string, id: string, update: PfRoomMember["content"]) {
    await this.#axios.put<void, AxiosResponse<void>, PfRoomMember["content"]>(
      `/_matrix/client/v3/rooms/${encodeURIComponent(roomName)}/state/m.room.member/${encodeURIComponent(id)}`,
      update);
    return;
  }

  static #comparePI(pi1: Required<JsonMatrixPfGlobalData>["payment_info"], pi2: Required<JsonMatrixPfGlobalData>["payment_info"]): boolean {
    const s1 = new Set(Object.keys(pi1));
    const s2 = new Set(Object.keys(pi2));
    if (s1.size !== s2.size) {
      return false;
    }

    for (const e of s1) {
      if (!s2.has(e)) {
        return false;
      }
    }

    return true;
  }

  isPfRelatedRoom(roomId: string) {
    return this.#roomStore.isPfRoom(roomId) || this.#roomStore.space === roomId;
  }

  async #syncRoomMemberInfo(/*data*/) {
    const promises: Promise<void>[] = [];
    const req = this.#globalAccountData.forRequest();

    for (const [roomName, room] of this.#roomStore.roomState.entries()) {
      if (!this.#roomStore.isPfRoom(roomName)) {
        continue;
      }

      const memObj = room.get("m.room.member")?.get(this.#myId);
      if (!memObj || !isJsonMatrixRoomMemberEvent(memObj) || memObj.content.membership !== "join") {
        continue;
      }

      const update: PfRoomMember["content"] = {
        ...memObj?.content,
        pfennigfuchs: {
          ...req
        }
      }

      if (isJsonMatrixPfRoomMember(memObj)) {
        const oldui = memObj.content.pfennigfuchs.user_info;
        const newui = update.pfennigfuchs.user_info;

        const oldpi = memObj.content.pfennigfuchs.payment_info;
        const newpi = update.pfennigfuchs.payment_info;
        if (oldui.email === newui.email &&
          oldui.phone === newui.phone &&
          oldui.displayname === newui.displayname &&
          oldui.avatar_url === newui.avatar_url &&
          MatrixSync.#comparePI(oldpi, newpi)) {
          continue;
        }
      }

      promises.push(this.#sendRoomUpdate(roomName, this.#myId, update));
    }

    await Promise.all(promises);
    return;
  }

  async #matrixMetaSync(data: JsonMatrixSyncResponse) {
    const promises: Promise<void>[] = [];
    if (data.account_data) {
      this.#applyGlobalData(data.account_data);
    }

    promises.push(this.#syncProfile(/*data*/));

    let newRooms = new Set<string>();
    if (data.rooms) {
      newRooms = this.#applyRoomState(data.rooms);
    }

    promises.push(this.#syncRoomMemberInfo(/*data*/));

    const space = this.#roomStore.space;
    if (space === undefined) {
      promises.push(this.#createSpace());
    }
    promises.push(this.#checkAndMoveRoomsToSpace());

    data.rooms?.invite && promises.push(...Object.entries(data.rooms.invite).map(async ([id, r]) => {
      try {
        await this.#joinPfRoom(id, r);
      } catch (e) {
        if (!axios.isAxiosError(e) || e.response?.status !== 404) {
          throw e;
        } else {
          console.error(e);
          try {
            await MatrixSync.leaveRoomRaw(this.#axios, id);
          } catch (e) {
            console.error(e);
          }
        }
      }
      return;
    }));

    this.#syncAvatars(/*data*/);

    await Promise.all(promises);
    return newRooms;
  }

  async matrixSync() {
    const data = await this.#matrixSyncRaw({
      ...(this.#globalSyncToken && {
        since: this.#globalSyncToken,
        timeout: MatrixSync.#SYNC_TIMEOUT_MS,
      }),
      filter: this.#createFilter(),
      "set_presence": "offline"
    });

    this.#initialLoad = false;

    // must happen before syncMessages
    // only updates to RoomStateStore
    const newRooms = await this.#matrixMetaSync(data);

    // only updates to MessageStore
    await this.#syncMessages(data, newRooms, this.#globalSyncToken);

    this.#globalSyncToken = data.next_batch;
  }

  abort() {
    this.#abortAxios.abort();
  }
}
