import type {
  JsonMatrixClientEventWithoutRoomId,
  JsonMatrixRoomCreateEvent,
  JsonMatrixRoomMemberEvent,
  JsonMatrixRoomNameEvent,
} from "@/types/Matrix";
import { createPinia, setActivePinia, storeToRefs } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { useRoomStateStore } from "../RoomStateStore";
import { useMatrixAuthStore } from "../MatrixAuthStore";
import { randomUUID } from "@/util/randomuuid";
import { splitMatrixId } from "@/util/helpers";
import type { PfRoomMember } from "@/types/Pfennigfuchs";
import { useMessageStore } from "../MessageStore";
import type { PaymentInfoType, PfGlobalAccountDataRaw } from "../GlobalAccountData";

export function sampleRoomCreateEvent({
  pfroom,
  event_id,
  space,
  pf_oneonone
}: {
  pfroom?: boolean;
  event_id?: string;
  space?: boolean;
  pf_oneonone?: boolean;
}): JsonMatrixClientEventWithoutRoomId & JsonMatrixRoomCreateEvent {
  return {
    type: "m.room.create",
    event_id: event_id ?? randomUUID(),
    state_key: "",
    origin_server_ts: 1234,
    sender: "@asdf:asdf.org",
    content: {
      creator: "adsasds",
      "m.federate": true,
      room_version: "9",
      ...(space && { type: "m.space" }),
      ...(pfroom && { pfennigfuchs: true }),
      ...(pf_oneonone && { pf_oneonone: true })
    }
  };
}

type MemberShip = JsonMatrixRoomMemberEvent["content"]["membership"];
export function sampleRoomMemberEvent({
  displayname,
  membership,
  pi,
  avatar_url,
  email,
  phone,
}: {
  displayname: string;
  membership: MemberShip;
  pi?: PfGlobalAccountDataRaw["payment_info"]
  avatar_url?: string,
  email?: string,
  phone?: string,
}): JsonMatrixClientEventWithoutRoomId & JsonMatrixRoomMemberEvent & PfRoomMember {
  return {
    type: "m.room.member",
    event_id: randomUUID(),
    state_key: "",
    origin_server_ts: 1234,
    sender: "@asdf:asdf.org",
    content: {
      membership: membership,
      pfennigfuchs: {
        user_info: {
          displayname: displayname,
          avatar_url: avatar_url ?? "",
          email: email ?? "",
          phone: phone ?? "",
        },
        payment_info: pi ?? {}
      }
    },
  };
}

describe("Room state store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const auth = useMatrixAuthStore();
    auth.authStore.identity = "@me:me.com"
  });

  function sampleRoomNameEvent({
    name,
    event_id,
    description
  }: {
    name: string;
    event_id?: string;
    description?: string;
  }): JsonMatrixClientEventWithoutRoomId & JsonMatrixRoomNameEvent {
    return {
      type: "m.room.name",
      event_id: event_id ?? randomUUID(),
      state_key: "",
      origin_server_ts: 1234,
      sender: "@asdf:asdf.org",
      content: {
        name: name,
        ...(description && {pf_room_description: description})
      },
    };
  }

  it("get my id", () => {
    const store = useRoomStateStore();
    expect(store.myId).toStrictEqual("@me:me.com");
  })

  it("get my domain", () => {
    const store = useRoomStateStore();
    expect(store.myDomain).toStrictEqual("me.com");
  })

  it("get my domain undefined", () => {
    const auth = useMatrixAuthStore();
    auth.authStore.identity = undefined;
    const store = useRoomStateStore();
    expect(() => store.myDomain).toThrowError();
  })

  it("initial room creation", () => {
    const store = useRoomStateStore();
    store.addStateEvent(
      "pf-room-1",
      "m.room.create",
      "",
      sampleRoomCreateEvent({})
    );
    expect(Array.from(store.roomState.keys())).toStrictEqual(["pf-room-1"]);
    expect(store.isPfRoom("pf-room-1")).toBe(false);
  });

  it("initial pf room creation", () => {
    const store = useRoomStateStore();
    store.addStateEvent(
      "pf-room-1",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    expect(Array.from(store.roomState.keys())).toStrictEqual(["pf-room-1"]);
    expect(store.isPfRoom("pf-room-1")).toBe(true);
  });

  it("deduplication room creation", () => {
    const store = useRoomStateStore();
    store.addStateEvent(
      "pf-room-1",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true, event_id: "ev123" })
    );
    store.addStateEvent(
      "pf-room-1",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: false, event_id: "ev123" })
    );
    expect(store.roomState.size).toBe(1);
    expect(store.isPfRoom("pf-room-1")).toBe(true);
  });

  it("Room name and update", () => {
    const store = useRoomStateStore();
    store.addStateEvent(
      "pf-room-1",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true, event_id: "ev123" })
    );
    expect(store.getDisplayRoomName("pf-room-1")).toBe("pf-room-1");
    store.addStateEvent(
      "pf-room-1",
      "m.room.name",
      "",
      sampleRoomNameEvent({ name: "nice-pf-name-1" })
    );
    expect(store.getDisplayRoomName("pf-room-1")).toBe("nice-pf-name-1");
    store.addStateEvent(
      "pf-room-1",
      "m.room.name",
      "",
      sampleRoomNameEvent({ name: "nice-pf-name-2" })
    );
    expect(store.getDisplayRoomName("pf-room-1")).toBe("nice-pf-name-2");
  });

  it("List all rooms", () => {
    const store = useRoomStateStore();
    store.addStateEvent(
      "pf-room-1",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    store.addStateEvent(
      "pf-room-2",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    expect(store.getAllRooms).toStrictEqual(["pf-room-1", "pf-room-2"]);
    store.addStateEvent(
      "pf-room-1",
      "m.room.name",
      "",
      sampleRoomNameEvent({ name: "nice-pf-name-1" })
    );
    store.addStateEvent(
      "pf-room-2",
      "m.room.name",
      "",
      sampleRoomNameEvent({ name: "nice-pf-name-2" })
    );
    expect(store.getAllRooms.map(store.getDisplayRoomName)).toStrictEqual([
      "nice-pf-name-1",
      "nice-pf-name-2",
    ]);
  });

  it("Test room members", () => {
    const store = useRoomStateStore();
    store.addStateEvent(
      "pf-room-1",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    store.addStateEvent(
      "pf-room-1",
      "m.room.member",
      "@pfennigfuchs:pf.org",
      sampleRoomMemberEvent({ displayname: "PF", membership: "join" })
    );
    expect(store.getJoinedMembers("pf-room-1")).toStrictEqual([
      "@pfennigfuchs:pf.org",
    ]);
    expect(
      store
        .getJoinedMembers("pf-room-1")
        .map((v) => store.getMemberDisplayName("pf-room-1", v))
    ).toStrictEqual(["PF"]);
    store.addStateEvent(
      "pf-room-1",
      "m.room.member",
      "@pfennigfuchs:pf.org",
      sampleRoomMemberEvent({ displayname: "PF", membership: "leave" })
    );
    expect(store.getJoinedMembers("pf-room-1")).toStrictEqual([]);
    store.addStateEvent(
      "pf-room-1",
      "m.room.member",
      "@pfennigfuchs:pf.org",
      sampleRoomMemberEvent({ displayname: "PF", membership: "join" })
    );
    expect(store.getJoinedMembers("pf-room-1")).toStrictEqual([
      "@pfennigfuchs:pf.org",
    ]);
    expect(
      store
        .getJoinedMembers("pf-room-1")
        .map((v) => store.getMemberDisplayName("pf-room-1", v))
    ).toStrictEqual(["PF"]);
  });

  it("Find space", () => {
    const store = useRoomStateStore();
    store.addStateEvent(
      "pf-room-1",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    expect(store.space).toBe(undefined);
    store.addStateEvent(
      "pf-space",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true, space: true })
    );
    expect(store.space).toBe("pf-space");
    store.addStateEvent(
      "pf-space",
      "m.room.name",
      "",
      sampleRoomNameEvent({ name: "pfennigfuchs-space" })
    );
    expect(store.space).toBe("pf-space");
    expect(store.getDisplayRoomName(store.space!)).toBe("pfennigfuchs-space");
    store.addStateEvent(
      "other-space",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: false, space: true })
    );
    expect(store.space).toBe("pf-space");
    expect(store.getDisplayRoomName(store.space!)).toBe("pfennigfuchs-space");
    store.addStateEvent(
      "pf-room-2",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true, space: false })
    );
    expect(store.getPfRooms).toStrictEqual(["pf-room-1", "pf-room-2"]);
  });

  it("Rooms are sorted", () => {
    const store = useRoomStateStore();
    store.addStateEvent(
      "pf-room-2",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    store.addStateEvent(
      "pf-room-2",
      "m.room.name",
      "",
      sampleRoomNameEvent({name: "nice-pf-room-2"})
    )
    store.addStateEvent(
      "pf-room-3",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    store.addStateEvent(
      "pf-room-3",
      "m.room.name",
      "",
      sampleRoomNameEvent({name: "nice-pf-room-3"})
    )
    store.addStateEvent(
      "pf-room-1",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    store.addStateEvent(
      "pf-room-1",
      "m.room.name",
      "",
      sampleRoomNameEvent({name: "nice-pf-room-1"})
    )
    expect(store.getPfRooms.map(store.getDisplayRoomName)).toStrictEqual(["nice-pf-room-1", "nice-pf-room-2", "nice-pf-room-3"]);
  });

  it("Discover users", () => {
    const store = useRoomStateStore();
    const auth = useMatrixAuthStore();
    expect(store.getAllContacts).toStrictEqual(new Set([]));
    store.addStateEvent(
      "pf-room-1",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    store.addStateEvent(
      "non-pf-room-2",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: false })
    );
    store.addStateEvent(
      "pf-room-1",
      "m.room.member",
      "@u1:asd",
      sampleRoomMemberEvent({ displayname: "u1", membership: "join" })
    );
    store.addStateEvent(
      "non-pf-room-2",
      "m.room.member",
      "@u2:fdg",
      sampleRoomMemberEvent({ displayname: "u2", membership: "join" })
    );
    store.addStateEvent(
      "pf-room-1",
      "m.room.member",
      "@u3:fdg",
      sampleRoomMemberEvent({ displayname: "u3", membership: "leave" })
    );
    store.addStateEvent(
      "non-pf-room-2",
      "m.room.member",
      "@u4:jkl",
      sampleRoomMemberEvent({ displayname: "u4", membership: "leave" })
    );
    expect(store.getAllContacts).toStrictEqual(
      new Set(["@u1:asd"])
    );
    // don't discover myself
    auth.authStore.identity = "@u1:asd";
    expect(store.getAllContacts).toStrictEqual(new Set());
  });

  it("No discovery of users from large rooms", () => {
    const store = useRoomStateStore();
    const auth = useMatrixAuthStore();
    store.addStateEvent(
      "non-pf-room-1",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: false })
    );
    for (let i = 0; i <= 5; i++) {
      store.addStateEvent(
        "non-pf-room-1",
        "m.room.member",
        `@u${i}:asd`,
        sampleRoomMemberEvent({ displayname: `u${i}`, membership: "join" })
      )
    }
    expect(store.getAllContacts).toStrictEqual(new Set());
  })

  it("Discovery of users from large pf rooms", () => {
    const store = useRoomStateStore();
    const auth = useMatrixAuthStore();
    store.addStateEvent(
      "non-pf-room-1",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    const res = new Set();
    for (let i = 0; i <= 5; i++) {
      store.addStateEvent(
        "non-pf-room-1",
        "m.room.member",
        `@u${i}:asd`,
        sampleRoomMemberEvent({ displayname: `u${i}`, membership: "join" })
      )
      res.add(`@u${i}:asd`);
    }
    expect(store.getAllContacts).toStrictEqual(res);
  })


  it("Discovery of users from one-on-one non-pf rooms", () => {
    const store = useRoomStateStore();
    const auth = useMatrixAuthStore();
    auth.authStore.identity = "@me:asd";
    store.addStateEvent(
      "non-pf-room-1",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    store.addStateEvent(
      "non-pf-room-1",
      "m.room.member",
      "@me:asd",
      sampleRoomMemberEvent({ displayname: "me", membership: "join" })
    );
    store.addStateEvent(
      "non-pf-room-1",
      "m.room.member",
      "@u1:asd",
      sampleRoomMemberEvent({ displayname: "u1", membership: "join" })
    );
    expect(store.getAllContacts).toStrictEqual(new Set(["@u1:asd"]));
  })

  it("Check pfennigfuchs space", () => {
    const store = useRoomStateStore();
    store.addStateEvent(
      "pf-space",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true, space: true })
    );
    store.addStateEvent(
      "pf-room-1",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    expect(store.space).toBe("pf-space");
    expect(store.pfRoomsMissingFromSpace).toStrictEqual(["pf-room-1"]);
    store.addStateEvent("pf-space", "m.space.child", "pf-room-1", {
      event_id: randomUUID(),
      content: {},
      origin_server_ts: 0,
      sender: "asdfdsa",
      state_key: "pf-room-1",
      type: "m.space.child",
    });
    expect(store.pfRoomsMissingFromSpace).toStrictEqual([]);
    store.addStateEvent(
      "pf-room-2",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: false })
    );
    expect(store.pfRoomsMissingFromSpace).toStrictEqual([]);
    store.addStateEvent(
      "pf-room-2",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    expect(store.pfRoomsMissingFromSpace).toStrictEqual(["pf-room-2"]);
    store.addStateEvent("pf-space", "m.space.child", "pf-room-2", {
      event_id: randomUUID(),
      content: {},
      origin_server_ts: 0,
      sender: "asdfdsa",
      state_key: "pf-room-2",
      type: "m.space.child",
    });
    expect(store.pfRoomsMissingFromSpace).toStrictEqual([]);
  });

  it("Check room names", () => {
    const room = "#asdasdasd@matrix.org";
    const store = useRoomStateStore();
    store.addStateEvent(
      room,
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    store.addStateEvent(
      room,
      "m.room.name",
      "",
      sampleRoomNameEvent({ name: "nice-pf-name-1" })      
    )
    store.addStateEvent(room, "m.room.member", "user1",
      sampleRoomMemberEvent({displayname: "user1", membership: "join"}));
      store.addStateEvent(room, "m.room.member", "user2",
      sampleRoomMemberEvent({displayname: "user2", membership: "join"}));
      store.addStateEvent(room, "m.room.member", "user3",
      sampleRoomMemberEvent({displayname: "user3", membership: "join"}));
    expect(store.getDisplayRoomName(room)).toBe("nice-pf-name-1");
    store.addStateEvent(
      room,
      "m.room.name",
      "",
      sampleRoomNameEvent({ name: "" })
    )
    expect(store.getDisplayRoomName(room)).toBe("user1,user2,user3");
  });

  it("split matrix id", () => {
    expect(() => splitMatrixId()).toThrowError();
    expect(() => splitMatrixId("a@b.com")).toThrowError();
    expect(() => splitMatrixId("@:")).toThrowError();
    expect(() => splitMatrixId("@a:")).toThrowError();
    expect(() => splitMatrixId("@:b")).toThrowError();
    expect(splitMatrixId("@a:b")).toStrictEqual(["a","b"]);
  });

  it("not pf room", () => {
    const store = useRoomStateStore();
    expect(store.isPfRoom("a@b.com")).toStrictEqual(false);
  });

  it("leave room", () => {
    const store = useRoomStateStore();
    store.addStateEvent(
      "a@b.com",
      "m.room.create",
      "",
      sampleRoomCreateEvent({})
    );
    expect(store.getAllRooms).toStrictEqual(["a@b.com"]);
    store.leaveRoom("a@b.com");
    expect(store.getAllRooms).toStrictEqual([]);
  });

  it("name of nonmember", () => {
    const store = useRoomStateStore();
    expect(store.getMemberDisplayName("non@exist.ent", "@ghost:ghost.com")).toStrictEqual("@ghost:ghost.com");
  });

  it("pf display rooms", () => {
    const store = useRoomStateStore();
    store.addStateEvent(
      "a@b.com",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    store.addStateEvent(
      "a@b.com",
      "m.room.name",
      "",
      sampleRoomNameEvent({ name: "nice-pf-name-1" })      
    );
    expect(store.getPfDisplayRooms).toStrictEqual(new Set(["nice-pf-name-1"]));
  })

  it("clear room", () => {
    const store = useRoomStateStore();
    store.addStateEvent(
      "a@b.com",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    expect(store.roomState.get("a@b.com")).toBeDefined();
    store.clear();
    expect(store.roomState.get("a@b.com")).toBeUndefined();
  })

  it("test one on one rooms", () => {
    const store = useRoomStateStore();
    store.addStateEvent(
      "oneoneone@b.com",
      "m.room.create",
      "",
      sampleRoomCreateEvent({pfroom: true, pf_oneonone: true})
    );
    store.addStateEvent(
      "b@a.com",
      "m.room.create",
      "",
      sampleRoomCreateEvent({pfroom: true, pf_oneonone: false})
    );
    expect(store.isPfRoom("oneoneone@b.com")).toBeTruthy();
    expect(store.isPfOneOnOne("oneoneone@b.com")).toBeTruthy();
    expect(store.isPfRoom("b@a.com")).toBeTruthy();
    expect(store.isPfOneOnOne("b@a.com")).toBeFalsy();
    store.addStateEvent(
      "c@a.com",
      "m.room.create",
      "",
      sampleRoomCreateEvent({pfroom: false})
    );
    expect(store.isPfOneOnOne("c@a.com")).toBeFalsy();
    expect(store.isPfOneOnOne("nonExistent")).toBeFalsy();
  });

  it("test spaces", () => {
    const store = useRoomStateStore();
    store.addStateEvent(
      "space@a.com",
      "m.room.create",
      "",
      sampleRoomCreateEvent({pfroom: true, space: true})
    );
    expect(store.isPfRoom("space@a.com")).toBeFalsy();
    expect(store.isPfOneOnOne("space@a.com")).toBeFalsy();
  })

  it("get room avatar", () => {
    const store = useRoomStateStore();
    expect(store.getRoomAvatar("avatar@a.com")).toBeUndefined();
    store.addStateEvent(
      "avatar@a.com",
      "m.room.create",
      "",
      sampleRoomCreateEvent({pfroom: true, space: true})
    );
    expect(store.getRoomAvatar("avatar@a.com")).toBeUndefined();
    store.addStateEvent(
      "avatar@a.com",
      "m.room.name",
      "",
      {
        event_id: randomUUID(),
        origin_server_ts: Math.random(),
        sender: "u1@a.com",
        state_key: "",
        type: "m.room.name",
        content: {
          name: "avatar channel #1",
          pf_avatar_url: "mxc://foobar"
        } as JsonMatrixRoomNameEvent["content"]
      });
      expect(store.getRoomAvatar("avatar@a.com")).toStrictEqual("mxc://foobar");
  })

  it("get payment information", () => {
    const store = useRoomStateStore();
    store.addStateEvent(
      "pf-room-1",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    store.addStateEvent(
      "pf-room-1",
      "m.room.member",
      "@me:asd",
      sampleRoomMemberEvent({ displayname: "me", membership: "join" })
    );
    expect(store.getPfPaymentInformation("a@b.com", "@me:asd")).toBeUndefined();

      const pi = {
        "uuid1": {
          address: "CH1234567890",
          tag: "personal",
          type: "IBAN" as const
        },
        "uuid2": {
          address: "a@b.com",
          tag: "business",
          type: "PAYPAL" as const
        },
        "uuid3": {
          address: "asdasdas",
          tag: "other",
          type: "Other" as const
        }
      };

    store.addStateEvent(
      "pf-room-1",
      "m.room.member",
      "@me:asd",
      sampleRoomMemberEvent({ displayname: "me", membership: "join", pi })
    );
    const pimap = new Map(Object.entries(pi))
    expect(store.getPfPaymentInformation("pf-room-1", "@me:asd")).toStrictEqual(pimap);
  });

  it("get contact information", () => {
    const store = useRoomStateStore();
    store.addStateEvent(
      "pf-room-1",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    store.addStateEvent(
      "pf-room-1",
      "m.room.member",
      "@me:asd",
      sampleRoomMemberEvent({ displayname: "me", membership: "join" })
    );
    expect(store.getPfContactInformation("a@b.com", "@me:asd")).toBeUndefined();

    const ci = {
      displayname: "me",
      avatar_url: "mxc://avatar-url",
      email: "a@b.com",
      phone: "+41 123456789",
    };

    store.addStateEvent(
      "pf-room-1",
      "m.room.member",
      "@me:asd",
      sampleRoomMemberEvent({ membership: "join", ...ci  })
    );
    expect(store.getPfContactInformation("pf-room-1", "@me:asd")).toStrictEqual(ci);
  });

  it("get room description", () => {
    const store = useRoomStateStore();
    store.addStateEvent(
      "pf-room-1",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    expect(store.getRoomDescription("pf-room-1")).toBeUndefined();
    store.addStateEvent(
      "pf-room-1",
      "m.room.name",
      "",
      sampleRoomNameEvent({
        name: "foo name",
        description: "room description #1"
    }));
    expect(store.getRoomDescription("pf-room-1")).toStrictEqual("room description #1");
  });

  it("test CoW forRequestRoom", () => {
    const store = useRoomStateStore();
    store.addStateEvent(
      "pf-room-1",
      "m.room.create",
      "",
      sampleRoomCreateEvent({ pfroom: true })
    );
    expect(store.forRequestRoom("pf-room-1")).toStrictEqual({
      name: ""
    });
    store.addStateEvent(
      "pf-room-1",
      "m.room.name",
      "",
      sampleRoomNameEvent({
        name: "name #1",
        description: "some desc",
      }));
      expect(store.forRequestRoom("pf-room-1")).toStrictEqual({
        name: "name #1",
        pf_room_description: "some desc",
      });
    });


    it("find one member who left the room", () => {
      const store = useRoomStateStore();
      store.addStateEvent(
        "pf-room-1",
        "m.room.create",
        "",
        sampleRoomCreateEvent({ pfroom: true })
      );
      expect(store.getOneOnOneLeftMember("pf-room-1")).toBeUndefined();
      store.addStateEvent(
        "pf-room-1",
        "m.room.member",
        "@u1:asd.com",
        sampleRoomMemberEvent({
          displayname: "u1",
          membership: "join"
        })
      );
      expect(store.getOneOnOneLeftMember("pf-room-1")).toBeUndefined();
      store.addStateEvent(
        "pf-room-1",
        "m.room.member",
        "@u1:asd.com",
        sampleRoomMemberEvent({
          displayname: "u1",
          membership: "leave"
        })
      );
      expect(store.getOneOnOneLeftMember("pf-room-1")).toStrictEqual("@u1:asd.com");
      store.addStateEvent(
        "pf-room-1",
        "m.room.member",
        "@u2:asd.com",
        sampleRoomMemberEvent({
          displayname: "u2",
          membership: "leave"
        })
      );
      expect(() => store.getOneOnOneLeftMember("pf-room-1")).toThrowError();
      store.addStateEvent(
        "pf-room-1",
        "m.room.member",
        "@u2:asd.com",
        sampleRoomMemberEvent({
          displayname: "u2",
          membership: "join"
        })
      );
      expect(store.getOneOnOneLeftMember("pf-room-1")).toStrictEqual("@u1:asd.com");
    })

    it("getOneonOneOther", () => {
      const authStore = useMatrixAuthStore();
      authStore.authStore.identity = "@me:asd.com";
      const store = useRoomStateStore();
      store.addStateEvent(
        "pf-room-1",
        "m.room.create",
        "",
        sampleRoomCreateEvent({ pfroom: true })
      );
      expect(store.getOneonOneOther("pf-room-1")).toBeUndefined();
      store.addStateEvent(
        "pf-room-1",
        "m.room.member",
        "@me:asd.com",
        sampleRoomMemberEvent({
          displayname: "me",
          membership: "join",
        })
      );
      expect(store.getOneonOneOther("pf-room-1")).toBeUndefined();
      store.addStateEvent(
        "pf-room-1",
        "m.room.member",
        "@u1:asd.com",
        sampleRoomMemberEvent({
          displayname: "u1",
          membership: "join"
        })
      );
      expect(store.getOneonOneOther("pf-room-1")).toStrictEqual("@u1:asd.com");
      store.addStateEvent(
        "pf-room-1",
        "m.room.member",
        "@u1:asd.com",
        sampleRoomMemberEvent({
          displayname: "u1",
          membership: "leave"
        })
      );
      expect(store.getOneonOneOther("pf-room-1")).toStrictEqual("@u1:asd.com");
    });

    it("test lazy loading of members", () => {
      const store = useRoomStateStore();
      store.addStateEvent(
        "pf-room-1",
        "m.room.create",
        "",
        sampleRoomCreateEvent({ pfroom: true })
      );
      store.addStateEvent(
        "pf-room-1",
        "m.room.member",
        "@u1:asd.com",
        sampleRoomMemberEvent({
          displayname: "u1",
          membership: "leave"
        })
      );
      expect(store.getMemberDisplayName("pf-room-1", "@u1:asd.com")).toStrictEqual("u1");
      store.addStateEvent(
        "pf-room-1",
        "m.room.member",
        "@u1:asd.com",
        sampleRoomMemberEvent({
          displayname: "u1-invisible",
          membership: "leave"
        }),
        true
      );
      expect(store.getMemberDisplayName("pf-room-1", "@u1:asd.com")).toStrictEqual("u1");
    });

    it("getMembers test", () => {
      const store = useRoomStateStore();
      store.addStateEvent(
        "pf-room-1",
        "m.room.create",
        "",
        sampleRoomCreateEvent({ pfroom: true })
      );

      let idx = 0;
      const states: MemberShip[] = ["join", "invite", "knock", "leave", "ban"];
      for (const state of states) {
        idx++;
        store.addStateEvent(
          "pf-room-1",
          "m.room.member",
          `@u${idx}:asd.com`,
          sampleRoomMemberEvent({
            displayname: `u${idx}`,
            membership: state
          }),
          true
        );
      }
      expect(new Set([...store.getMembers("pf-room-1")])).toStrictEqual(new Set(["@u1:asd.com", "@u2:asd.com", "@u4:asd.com"]));
    });
});
