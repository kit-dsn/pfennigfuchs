/* types regarding /createRoom api call */

export type JsonMatrixEventContent = object;

export type JsonMatrixEvent = {
  content: JsonMatrixEventContent;
  type: string;
};

export type JsonMatrixStateEvent = JsonMatrixEvent & {
  state_key: "" | string;
};

export function isJsonMatrixStateEvent<T extends JsonMatrixEvent>(
  obj: T & { state_key?: string | null }
): obj is T & JsonMatrixStateEvent {
  return (
    "state_key" in obj && obj.state_key !== undefined && obj.state_key !== null
  );
}

export type JsonMatrixNotifications = {
  room: number;
};

export type JsonMatrixPowerLevelEventContent = {
  ban?: number;
  events?: {
    [key: string]: string;
  };
  events_default?: number;
  invite?: number;
  kick?: number;
  notifications?: JsonMatrixNotifications;
  redact?: number;
  state_default?: number;
  users?: {
    [key: string]: string;
  };
  users_default?: number;
};

export type JsonMatrixCreateRoom = {
  creation_content?: object;
  initial_state?: JsonMatrixStateEvent[];
  invite?: string[];
  is_direct?: boolean;
  name?: string;
  power_level_content_override?: JsonMatrixPowerLevelEventContent;
  preset: "private_chat" | "public_chat" | "trusted_private_chat";
  room_alias_name?: string;
  room_version: string;
  topic?: string;
  visibility: "public" | "private";
};

/* types regarding /sync api call */

export type JsonMatrixSyncRequest = {
  filter?: string;
  full_state?: boolean;
  set_presence?: "offline" | "online" | "unavailable";
  since?: string;
  timeout?: number;
};

export type JsonMatrixAccountData = {
  events: JsonMatrixEvent[];
};

export type JsonMatrixPresence = {
  events: JsonMatrixEvent[];
};

export type JsonMatrixStrippedStateEvent = JsonMatrixStateEvent & {
  sender: string;
};

export type JsonMatrixInviteState = {
  events: JsonMatrixStrippedStateEvent[];
};

export type JsonMatrixInvitedRoom = {
  invite_state: JsonMatrixInviteState;
};

export type JsonMatrixJoinedRoom = {
  account_data: JsonMatrixAccountData;
  ephemeral: JsonMatrixEphemeral;
  state: JsonMatrixState;
  summary: JsonMatrixRoomSummary;
  timeline: JsonMatrixTimeline;
  unread_notifications: JsonMatrixUnreadNotificationsCounts;
};

export type JsonMatrixEphemeral = {
  events: JsonMatrixEvent[];
};

export type JsonMatrixUnsignedData = {
  age: number;
  prev_content: JsonMatrixEventContent;
  redacted_because: JsonMatrixClientEventWithoutRoomId;
  transaction_id: string;
};

export type JsonMatrixRoomSummary = {
  "m.heroes": string[];
  "m.invited_member_count": number;
  "m.joined_member_count": number;
};

export type JsonMatrixTimeline = {
  events: JsonMatrixClientEventWithoutRoomId[];
  limited: boolean;
  prev_batch?: string;
};

export type JsonMatrixUnreadNotificationsCounts = {
  highlight_count: number;
  notification_count: number;
};

export type JsonMatrixClientEventWithoutRoomId = JsonMatrixEvent & {
  event_id: string;
  origin_server_ts: number;
  sender: string;
  state_key?: string;
  unsigned?: JsonMatrixUnsignedData;
};

export type JsonMatrixState = {
  events: JsonMatrixClientEventWithoutRoomId[];
};

export type JsonMatrixKnockState = {
  events: JsonMatrixStrippedStateEvent[];
};

export type JsonMatrixKnockedRoom = {
  knock_state: JsonMatrixKnockState;
};

export type JsonMatrixLeftRoom = {
  account_data: JsonMatrixAccountData;
  state: JsonMatrixState;
  timeline: JsonMatrixTimeline;
};

export type JsonMatrixRooms = {
  invite?: { [key: string]: JsonMatrixInvitedRoom };
  join?: { [key: string]: JsonMatrixJoinedRoom };
  knock?: { [key: string]: JsonMatrixKnockedRoom };
  leave?: { [key: string]: JsonMatrixLeftRoom };
};

export type JsonMatrixSyncResponse = {
  account_data?: JsonMatrixAccountData;
  // device_lists: JsonMatrixDeviceLists;
  // device_one_time_keys_count: JsonMatrixOneTimeKeysCount;
  next_batch: string;
  presence: JsonMatrixPresence;
  rooms?: JsonMatrixRooms;
  // to_device: JsonMatrixToDevice;
};

/* types regarding /messages api call */

export type JsonMatrixMessageRequest = {
  dir: "b" | "f";
  filter?: string;
  from: string;
  limit: number;
  to: string;
};

export type JsonMatrixClientEvent = JsonMatrixClientEventWithoutRoomId & {
  room_id: string;
};

export type JsonMatrixMessageResponse = {
  chunk: JsonMatrixClientEvent[];
  end?: string;
  start: string;
  state: JsonMatrixClientEvent[];
};

/* EVENT TYPES */

export type JsonMatrixRoomNameEvent = JsonMatrixStateEvent & {
  type: "m.room.name";
  content: {
    name: string;
    pf_avatar_url?: string;
    pf_room_description?: string;
  };
};

export function isJsonMatrixRoomNameEvent<T extends JsonMatrixEvent>(
  obj: T
): obj is T & JsonMatrixRoomNameEvent {
  return isJsonMatrixStateEvent(obj) && obj.type === "m.room.name";
}

export type JsonMatrixSigned = {
  mxid: string;
  signatures: { [key: string]: string };
  token: string;
};

export type JsonMatrixInvite = {
  display_name: string;
  signed: JsonMatrixSigned;
};

export type JsonMatrixRoomMemberEvent = JsonMatrixStateEvent & {
  type: "m.room.member";
  content: {
    avatar_url?: string;
    displayname?: string;
    is_direct?: boolean;
    join_authorised_via_users_server?: string;
    membership: "invite" | "join" | "knock" | "leave" | "ban";
    reason?: string;
    third_party_invite?: JsonMatrixInvite;
  };
};

export function isJsonMatrixRoomMemberEvent<T extends JsonMatrixEvent>(
  obj: T
): obj is T & JsonMatrixRoomMemberEvent {
  return isJsonMatrixStateEvent(obj) && obj.type === "m.room.member";
}

export type JsonMatrixPreviousRoom = {
  event_id: string;
  room_id: string;
};

export type JsonMatrixRoomCreateEvent = JsonMatrixStateEvent & {
  type: "m.room.create";
  content: {
    creator: string;
    "m.federate": boolean;
    predecessor?: JsonMatrixPreviousRoom;
    room_version: string;
    type?: string;
    pfennigfuchs?: boolean;
    pf_oneonone?: boolean;
  };
};

export function isJsonMatrixRoomCreateEvent<T extends JsonMatrixEvent>(
  obj: T
): obj is T & JsonMatrixRoomCreateEvent {
  return isJsonMatrixStateEvent(obj) && obj.type === "m.room.create";
}

/**
 * The default name of the space we are creating for Pfennigfuchs.
 */

export type JsonMatrixRoomMessage = JsonMatrixEvent & {
  type: "m.room.message";
  content: {
    body: string;
    msgtype: "m.text";
    format?: string;
    formatted_body?: string;
  };
};

export function isJsonMatrixRoomMessage<T extends JsonMatrixEvent>(obj: T): obj is T & JsonMatrixRoomMessage {
  return obj.type === "m.room.message";
}

export type JsonMatrixProfile = {
  avatar_url?: string;
  displayname?: string;
}

export type JsonMatrixMediaUpload = {
  content_uri: string;
}

export type JsonMatrixEventFilter = {
  limit?: number;
  not_senders?: string[];
  not_types?: string[];
  senders?: string[];
  types?: string[];
};

export type JsonMatrixRoomEventFilter = {
  contains_url?: boolean;
  include_redundant_members?: boolean;
  lazy_load_members?: boolean;
  limit?: number;
  not_rooms?: string[];
  not_senders?: string[];
  not_types?: string[];
  rooms?: string[];
  senders?: string[];
  types?: string[];
};

export type JsonMatrixStateFilter = {
  contains_url?: boolean;
  include_redundant_members?: boolean;
  lazy_load_members?: boolean;
  limit?: number;
  not_rooms?: string[];
  not_senders?: string[];
  not_types?: string[];
  rooms?: string[];
  senders?: string[];
  types?: string[];
};

export type JsonMatrixRoomFilter = {
  account_data?: JsonMatrixRoomEventFilter;
  ephemeral?: JsonMatrixRoomEventFilter;
  include_leave?: boolean;
  not_rooms?: string[];
  rooms?: string[];
  state?: JsonMatrixStateFilter;
  timeline?: JsonMatrixRoomEventFilter;
};

export type JsonMatrixFilter = {
  account_data?: JsonMatrixEventFilter;
  event_fields?: string[];
  event_format?: "client" | "federation";
  presence?: JsonMatrixEventFilter;
  room?: JsonMatrixRoomFilter;
};

export type JsonMatrixError = {
  errcode: string,
  error: string;
}

export function isJsonMatrixError(obj: object): obj is JsonMatrixError {
  return 'errcode' in obj && 'error' in obj;
}

export type JsonMatrixRateLimitError = JsonMatrixError & {
  errcode: "M_LIMIT_EXCEEDED",
  retry_after_ms: number,
};

export function isJsonMatrixRateLimitError(obj: JsonMatrixError): obj is JsonMatrixRateLimitError {
  return obj.errcode === "M_LIMIT_EXCEEDED";
}
