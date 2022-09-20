import { rest } from "msw";
import type {
  JsonMatrixCreateRoom,
  JsonMatrixSyncResponse,
  JsonMatrixStrippedStateEvent,
  JsonMatrixRoomMessage,
  JsonMatrixClientEventWithoutRoomId,
  JsonMatrixProfile,
  JsonMatrixRoomNameEvent} from "@/types/Matrix";
import type { RoomName } from "@/types/Pfennigfuchs";
import { randomUUID } from "@/util/randomuuid";
import type { PfGlobalAccountDataRaw } from "@/stores/GlobalAccountData";
import { userInfo } from "os";

let lastSyncState: JsonMatrixSyncResponse;
clearState();

export type Msg = JsonMatrixRoomMessage & JsonMatrixClientEventWithoutRoomId;

const messages: Map<RoomName, Msg[]> = new Map();

export function addMessagesToSync(roomName: string, msgs: Msg[]) {  
  if (!messages.has(roomName)) {
    messages.set(roomName, []);
  }
  messages.get(roomName)?.push(...msgs);
}

let paymentInfos: PfGlobalAccountDataRaw;

export const wellKnownHandler = rest.get(
  "https://matrix.org/.well-known/matrix/client",
  (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        "m.homeserver": {
          base_url: "https://matrix-client.matrix.org",
        },
        "m.identity_server": {
          base_url: "https://vector.im",
        },
      })
    );
  }
);

export const versionHandler = rest.get(
  "https://matrix-client.matrix.org/_matrix/client/versions",
  (req, res, ctx) => res(ctx.status(200))
);

export const login = rest.post(
  "https://matrix-client.matrix.org/_matrix/client/v3/login",
  (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        access_token: "access_token_af8ba796-7ef0-4c67-8828-e193c38a7b67",
        device_id: "device_id_7e49e090-6f5f-4259-b02d-330c03af4cd9",
      })
    );
  }
);

export const validate = rest.get(
  "https://matrix-client.matrix.org/_matrix/client/v3/account/whoami",
  (req, res, ctx) => {
    return res(ctx.status(200),
      ctx.json({
        homeserver_base_url: "https://matrix-client.matrix.org/",
        auth_token: "test-token-123",
    }))}
);

export const logout = rest.post(
  "https://matrix-client.matrix.org/_matrix/client/v3/logout",
  (req, res, ctx) => res(ctx.status(200))
);


export const addPaymentInfo = rest.put(
  "https://matrix-client.matrix.org/_matrix/client/v3/user/:userId/account_data/pfennigfuchs", async (req, res, ctx) => {
  paymentInfos = await req.json<PfGlobalAccountDataRaw>();
  return res(ctx.status(200))
  }
);

// TODO: Überarbeiten
export const createRoom = rest.post<JsonMatrixCreateRoom>(
  "https://matrix-client.matrix.org/_matrix/client/v3/createRoom",
  async (req, res, ctx) => {
    const roomId = "!" + randomUUID();
    lastSyncState.rooms!.join![roomId] = {
        account_data: {
          events: []
        },
        ephemeral: {
          events: []
        },
        state: {
          events: [
            {
              type: "m.room.create",
              content: (await req.json()).creation_content,
              event_id: randomUUID(),
              sender: "@foo:bar.com",
              origin_server_ts: 1,
              state_key: "",
            },
          ]
        },
        summary: {
          "m.heroes": [],
          "m.invited_member_count": (req.body.invite ?? []).length,
          "m.joined_member_count": 0
        },
        timeline: {
          events: [],
          limited: false
        },
        unread_notifications: {
          highlight_count: 0,
          notification_count: 1
        }
    }

    return res(
      ctx.status(200),
      ctx.json({
        room_id: roomId
      })
    );
  }
);

export const invite = rest.post("https://matrix-client.matrix.org/_matrix/client/v3/rooms/:roomId/invite",
  (req, res, ctx) => {
    req.json().then(data => {
      const invitedUser = data.user_id;
      lastSyncState!.rooms!.join![req.params.roomId as string].summary["m.invited_member_count"] += 1;
      lastSyncState!.rooms!.join![req.params.roomId as string].state.events.push({
        type: "m.room.member",
        event_id: randomUUID(),
        origin_server_ts: 45,
        sender: "@blub:mmmm.com",
        state_key: invitedUser,
        content:{
          displayname: invitedUser,
          membership: "invite",
          reason: ""
        }
      });
    });
    return res(ctx.status(200));
  });

  export const updateRoomInfo = rest.put("https://matrix-client.matrix.org/_matrix/client/v3/rooms/:roomId/state/m.room.name/",
    (req, res, ctx) => {
      req.json().then(data => {
        const roomName: string = data["name"];
        const roomDescription: string = data["pf_room_description"] ?? "";
        const avatarURL: string = data["pf_avatar_url"] ?? "";
        lastSyncState!.rooms!.join![req.params.roomId as string].state.events.push({
          type: "m.room.name",
          state_key: "",
          content: {
            name: roomName,
            pf_room_description: roomDescription,
            pf_avatar_url: avatarURL
          },
          event_id: randomUUID(),
          origin_server_ts: 0,
          sender: "@blub:blub.com"
        });
      });
      return res(ctx.status(200));
    });

export const sync = rest.get(
  "https://matrix-client.matrix.org/_matrix/client/v3/sync", (req, res, ctx) => {
    if (paymentInfos) {
      lastSyncState.account_data?.events.push({
        type: "pfennigfuchs",
        content: paymentInfos
      })
    }
    const syncResponse = lastSyncState;
    clearState();
    
    for (const [room, msgs] of messages) {
      if (!syncResponse.rooms!.join![room]) {
        syncResponse.rooms!.join![room] = {
          account_data: {events: []},
          ephemeral: {events: []},
          state: {events: []},
          summary: {
            "m.heroes": [],
            "m.invited_member_count": 0,
            "m.joined_member_count": 0,
          },
          timeline: {events: msgs, limited: false, ...(messageMessages.has(room) ? {prev_batch: "yes", limited: true} : {})},
          unread_notifications: {highlight_count: 0, notification_count: 0}
        };
      } else {
        syncResponse.rooms!.join![room].timeline.events = msgs;
        if (messageMessages.has(room)) {
          syncResponse.rooms!.join![room].timeline.prev_batch = "yes";
          syncResponse.rooms!.join![room].timeline.limited = true;
        }
      }
    }

    messages.clear();
    return res(
      ctx.status(200),
      ctx.json(syncResponse)
    )
  }
);

export const profile = rest.get("https://matrix-client.matrix.org/_matrix/client/v3/profile/:userId", (req, res, ctx) => {
  const response: JsonMatrixProfile = {};
  return res(
    ctx.status(200),
    ctx.json(response),
  );
});

export const putRoomAttribute = rest.put("https://matrix-client.matrix.org/_matrix/client/v3/rooms/:room_id/state/:event_type/:state_key",
  (req, res, ctx) => {
    return res(
      ctx.status(200)
    )
  }
)

export const joinPfRoom = rest.post("https://matrix-client.matrix.org/_matrix/client/v3/join/:roomId",
  (req, res, ctx) => {
    // @ts-ignore
    if (!lastSyncState.rooms?.invite[req.params.roomId]) {
      return res(
        ctx.status(403),
        ctx.json({
          errcode: "M_FORBIDDEN",
          error: "You are not invited to this room."
        })
      );
    }
    // @ts-ignore
    lastSyncState.rooms!.join![req.params.roomId] = {
      account_data: {
        events: []
      },
      ephemeral: {
        events: []
      },
      state: {
        events: [
          {
            type: "m.room.create",
            content: {
              "m.federate": true,
              pfennigfuchs: true,
            },
            event_id: randomUUID(),
            sender: "@me:blub.com",
            origin_server_ts: 1,
            state_key: "@me:blub.com",
          },
        ]
      },
      summary: {
        "m.heroes": [],
        "m.invited_member_count": 0,
        "m.joined_member_count": 0
      },
      timeline: {
        events: [],
        limited: false
      },
      unread_notifications: {
        highlight_count: 0,
        notification_count: 1
      }
    }
    lastSyncState.rooms!.invite! = {}
    return res(
      ctx.status(200),
      ctx.json({
        room_id: req.params.roomId
      })
    )
  }
);

export const leaveRoom = rest.post("https://matrix-client.matrix.org/_matrix/client/v3/rooms/:roomId/leave",
  (req, res, ctx) => {
    delete lastSyncState.rooms!.join![req.params.roomId as string]
    lastSyncState.rooms!.leave![req.params.roomId as string] = {
      account_data: {
        events: []
      },
      state: {
        events: []
      },
      timeline: {
        events: [],
        limited: false
      }
    };
    return res(ctx.status(200));
  });

let messageMessages: Map<string, Msg[]> = new Map();

export function addMessagesToMessage(roomId: string, msgs: Msg[]) {
  messageMessages.set(roomId, msgs);
}

export const messagesSync = rest.get("https://matrix-client.matrix.org/_matrix/client/v3/rooms/:roomId/messages",
  (req, res, ctx) => {
    const roomId = req.params.roomId as string;
    if (messageMessages.has(roomId)) {
      const resp = {
        chunk: messageMessages.get(roomId),
        start: randomUUID(),
        state: [],
      }
      messageMessages.delete(roomId);
      return res(ctx.status(200), ctx.json(resp));
    }

    return res(ctx.status(200), ctx.json(
      {
        chunk: [],
        start: randomUUID(),
        state: []
      }
    ))
  });

  export const messagePut = rest.put("https://matrix-client.matrix.org/_matrix/client/v3/rooms/:roomId/send/m.room.message/:txnid",
    (req, res, ctx) => {
      return res(ctx.status(200));
    });

export function generateInvite(pfRoom: boolean, name?: string): string {
  const roomId = `!${randomUUID()}`
  const invite: JsonMatrixStrippedStateEvent = {
    sender: "@test:test.com",
    state_key: "",
    type: "m.room.create",
    content: {}
  }
  invite.content = pfRoom ? { "m.federate": true, pfennigfuchs: true } : { "m.federate": true };

  lastSyncState.rooms!.invite! = {
    [roomId]: {
      invite_state: {
        events: [invite]
      }
    }
  }

  if (name) {
    const roomNameEvent = {
      type: "m.room.name",
      state_key: "",
      sender: "",
      content: {
        name: name
      }
    }
    lastSyncState.rooms!.invite![roomId].invite_state.events.push(roomNameEvent)
  }
  return roomId;
};

export function generateAvatarChangedEvent(room: string, user: string) {
  lastSyncState.rooms!.join![room as string].state.events.push({
    type: "m.room.member",
    event_id: randomUUID(),
    sender: user,
    state_key: user,
    origin_server_ts: 0,
    content: {
      avatar_url: "mxc://localhost/GCmhgzMPRjqgpODLsNQzVuHZ#auto",
      membership: "join",
      pfennigfuchs: {
        user_info: {
          avatar_url: "mxc://localhost/GCmhgzMPRjqgpODLsNQzVuHZ#auto"
        }
      }
    }
  });
}

export function addMemberEvent(room: string, user: string, membership: "invite" | "join" | "knock" | "leave" | "ban", userInfo: object = {}, paymentInfo: object = {}) {
  const events = lastSyncState.rooms!.join![room as string].state.events.filter(obj => obj.state_key != user);
  events.push({
    type: "m.room.member",
    event_id: randomUUID(),
    sender: user,
    state_key: user,
    origin_server_ts: 1,
    content: {
      membership: membership,
      pfennigfuchs: {
        user_info: userInfo,
        payment_info: paymentInfo
      }
    }
  });
  lastSyncState.rooms!.join![room as string].state.events = events;
}

function clearState() {
  lastSyncState = {
    account_data: {
      events: []
    },
    next_batch: "",
    presence: {
      events: []
    },
    rooms: {
      join: lastSyncState?.rooms?.join ?? {},
      invite: lastSyncState?.rooms?.invite ?? {},
      leave: lastSyncState?.rooms?.leave ?? {}
    }
  }
}

export const allHandlers = [
  wellKnownHandler,
  versionHandler,
  login,
  validate,
  logout,
  addPaymentInfo,
  createRoom,
  sync,
  putRoomAttribute,
  joinPfRoom,
  messagesSync,
  profile,
  messagePut,
  leaveRoom,
  invite,
  updateRoomInfo,
];
