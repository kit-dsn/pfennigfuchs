import type { DeepReadonly } from "vue";
import { isJsonMatrixRoomMemberEvent, type JsonMatrixClientEventWithoutRoomId, type JsonMatrixEvent, type JsonMatrixRoomMemberEvent, type JsonMatrixRoomMessage, type JsonMatrixStateEvent } from "./Matrix";
import type { ReplaceInContent } from "./Util";

export type RoomName = string;
export type EventType = string;
export type StateKey = string;
export type RoomStateMap = Map<
  StateKey,
  JsonMatrixClientEventWithoutRoomId & JsonMatrixStateEvent
>;
export type RoomEvents = Map<EventType, RoomStateMap>;

export type PfMessage = {
  subject: string; // description of the expense
  sender?: string; // user who paid for the expense
  v: {
      user: string; // amount will be added up to the users ledger
      amount: string; // is a number, but we require a string for validation reasons
      // overwrite_sender: string;
  }[];
};

export type PfInitial = {
  pf_initial: boolean;
}

export type PAYMENT_DATA = "pf.payment_data";

type BaseType = JsonMatrixClientEventWithoutRoomId & JsonMatrixRoomMessage;

export type PfPaymentMessage = ReplaceInContent<BaseType, "formatted_body", PfMessage> & {
  content: {
      format: PAYMENT_DATA;
      formatted_body: object;
  }
};

export type PfPaymentMessageRaw = ReplaceInContent<BaseType, "formatted_body", string> & {
  content: {
      format: PAYMENT_DATA,
      formatted_body: string,
  }
};

export type INITIAL_DATA = "pf.initial";

export type PfInitialMessage = ReplaceInContent<BaseType, "formatted_body", PfInitial> & {
  content: {
    format: INITIAL_DATA,
    formatted_body: object;
  }
};

export type PfInitialMessageRaw = ReplaceInContent<BaseType, "formatted_body", string> & {
  content: {
    format: INITIAL_DATA,
    formatted_body: string;
  }
};

export function isJsonMatrixPfInitialMessage(obj: DeepReadonly<PfInitialMessage | PfPaymentMessage>): obj is PfInitialMessage {
  return 'pf_initial' in obj.content.formatted_body;
}

export function isJsonMatrixPfPaymentMessage(obj: PfInitialMessage | PfPaymentMessage): obj is PfPaymentMessage {
  return 'v' in obj.content.formatted_body;
}

export type UUID = string;
export type JsonMatrixPfGlobalData = {
    payment_info?: {
      [uuid in UUID]: {
        type: "IBAN" | "PAYPAL" | "Other";
        tag: string;
        address: string;
      };
    },
    user_info?: {
      displayname: string,
      avatar_url: string,
      email: string,
      phone: string,
    };
};

const PFENNIGFUCHS_ACCOUNT_DATA_KEY = "pfennigfuchs" as const;
export type JsonMatrixPfGlobalDataEvent = JsonMatrixEvent & {
  type: typeof PFENNIGFUCHS_ACCOUNT_DATA_KEY;
  content: JsonMatrixPfGlobalData;
}

export function isJsonMatrixPfGlobalDataEvent(
  obj: JsonMatrixEvent
): obj is JsonMatrixPfGlobalDataEvent {
  return obj.type === PFENNIGFUCHS_ACCOUNT_DATA_KEY;
}

export function isJsonMatrixPfPaymentMessageRaw<T extends JsonMatrixRoomMessage>(obj: T): obj is T & PfPaymentMessageRaw {
  return obj.content.format === "pf.payment_data" && obj.content.msgtype === "m.text";
}

export function isJsonMatrixPfInitialMessageRaw<T extends JsonMatrixRoomMessage>(obj: T): obj is T & PfInitialMessageRaw {
  return obj.content.format === "pf.initial" && obj.content.msgtype === "m.text";
}

export type PfRoomMember = JsonMatrixRoomMemberEvent & {
  content: {
    pfennigfuchs: Required<JsonMatrixPfGlobalData>
  }
}

export function isJsonMatrixPfRoomMember<T extends JsonMatrixStateEvent>(obj: T): obj is T & PfRoomMember {
  return isJsonMatrixRoomMemberEvent(obj) && 'pfennigfuchs' in obj.content;
}

export function isJsonMatrixPfMessageRaw<T extends JsonMatrixRoomMessage>(msg: T): msg is T & (PfInitialMessageRaw | PfPaymentMessageRaw) {
  return isJsonMatrixPfPaymentMessageRaw(msg) || isJsonMatrixPfInitialMessageRaw(msg);
}
