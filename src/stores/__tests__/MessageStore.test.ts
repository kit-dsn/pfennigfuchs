import type { PfMessage } from "@/types/Pfennigfuchs";
import { randomUUID } from "@/util/randomuuid";
import { registerRuntimeHelpers } from "@vue/compiler-core";
import { createPinia, setActivePinia, storeToRefs } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { useMatrixAuthStore } from "../MatrixAuthStore";
import { useMessageStore } from "../MessageStore";
import { useRoomStateStore } from "../RoomStateStore";
import { sampleRoomCreateEvent, sampleRoomMemberEvent } from "./RoomStateStore.test";

describe("Message Store test", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        const p = useMatrixAuthStore();
        p.authStore.identity = "me@me.com";
    });

    function addSingleTx(store: ReturnType<typeof useMessageStore>, roomName: string, user: string, amount: string, sender: string) {
        store.addMessageBatch(roomName, [
            {
                content: {
                    body: "me@me schuldet 1",
                    format: "pf.payment_data",
                    formatted_body: `{"subject": "Food", "sender": "${sender}", "v":[{"user": "${user}", "amount": "${amount}"}]}`,
                    msgtype: "m.text",
                },
                type: "m.room.message",
                event_id: randomUUID(),
                origin_server_ts: Math.random(),
                sender,
            }
        ], () => { return; });
    }

    function addInitialTx(store: ReturnType<typeof useMessageStore>, roomName: string, sender: string) {
        store.addMessageBatch(roomName, [
            {
                type: "m.room.message",
                event_id: randomUUID(),
                origin_server_ts: Math.random(),
                sender,
                content: {
                    body: "foo",
                    msgtype: "m.text",
                    format: "pf.initial",
                    formatted_body: JSON.stringify({pf_initial: true})
                }
            }
        ], () => { return; });
    }

    function addMultipleTx(store: ReturnType<typeof useMessageStore>, roomName: string, msgs: PfMessage[]) {
        store.addMessageBatch(roomName,
            msgs.map(el => { return {
                content: {
                    body: "",
                    format: "pf.payment_data",
                    formatted_body: JSON.stringify(el),
                    msgtype: "m.text",
                },
                event_id: randomUUID(),
                origin_server_ts: Math.round(Math.random() * 1000),
                sender: "@foo:bar.com",
                type: "m.room.message",
            }}), () => { return; });
    }

    it("no entries, then empty balance", () => {
        const store = useMessageStore();
        expect(store.getBalanceForRoom("foo@bar.com", "me@me.com")).toBe("0.00");
    });

    it("one entry, not me, zero balance", () => {
        const store = useMessageStore();
        const room = useRoomStateStore()
        addSingleTx(store, "a@b.com", "notme@me.com", "1", "other@me.com");
        expect(store.getBalanceForRoom("a@b.com", "me@me.com")).toBe("0.00");
    })

    it("one entry, one balance", () => {
        const store = useMessageStore();
        addSingleTx(store, "a@b.com", "me@me.com", "1", "other@me.com");
        expect(store.getBalanceForRoom("a@b.com", "me@me.com")).toBe("1.00");
    });

    it("two entries, one balance", () => {
        const store = useMessageStore();
        addSingleTx(store, "a@b.com", "me@me.com", "1", "other@me.com");
        addSingleTx(store, "a@b.com", "me@me.com", "1", "other@me.com");
        expect(store.getBalanceForRoom("a@b.com", "me@me.com")).toBe("2.00");
    });

    it("two entries, balanced", () => {
        const store = useMessageStore();
        addSingleTx(store, "a@b.com", "me@me.com", "1", "other@me.com");
        addSingleTx(store, "a@b.com", "me@me.com", "-1", "other@me.com");
        expect(store.getBalanceForRoom("a@b.com", "me@me.com")).toBe("0.00");
    });

    it("two entries, mixed", () => {
        const store = useMessageStore();
        addSingleTx(store, "a@b.com", "me@me.com", "1", "other@me.com");
        addSingleTx(store, "a@b.com", "me@me.com", "1", "me@me.com");
        addSingleTx(store, "a@b.com", "other@me.com", "-1", "me@me.com");
        addSingleTx(store, "a@b.com", "other@me.com", "2", "me@me.com");
        expect(store.getBalanceForRoom("a@b.com", "me@me.com")).toBe("0.00");
    })

    it("tabular format", () => {
        const attrStore = useRoomStateStore();
        for (const roomName of ["a@b.com", "b@c.com", "c@d.com"]) {
            attrStore.addStateEvent(
                roomName,
                "m.room.create",
                "",
                sampleRoomCreateEvent({ pfroom: true })
            );
        }

        for (const userName of ["@user1:dom", "@user2:dom", "@user3:dom"]) {
            attrStore.addStateEvent(
                "a@b.com",
                "m.room.member",
                userName,
                sampleRoomMemberEvent({displayname: userName, membership: "join" }),
            )
        }

        attrStore.addStateEvent(
            "c@d.com",
            "m.room.member",
            "@user4:dom",
            sampleRoomMemberEvent({displayname: "@user4:dom", membership: "join" }),
        )

        const store = useMessageStore();
        addMultipleTx(store, "a@b.com",[
            {
                subject: "tx1",
                sender: "@foo:bar.com",
                v: [
                    {
                        user: "@user1:dom",
                        amount: "1"
                    },
                    {
                        user: "@user1:dom",
                        amount: "1"
                    }
                ]
            },
            {
                subject: "tx2",
                sender: "@foo:bar.com",
                v: [
                    {
                        user: "@user1:dom",
                        amount: "2"
                    },
                    {
                        user: "@user2:dom",
                        amount: "4"
                    },
                    {
                        user: "@user3:dom",
                        amount: "4"
                    }
                ]
            },
            {
                subject: "tx3",
                sender: "@foo:bar.com",
                v: [
                    {
                        user: "@user3:dom",
                        amount: "-4"
                    }
                ]
            }
        ]);
        addMultipleTx(store, "b@c.com", []);
        addMultipleTx(store, "c@d.com", [
            {
                subject: "tx4",
                sender: "@foo:bar.com",
                v: [
                    {
                        user: "@user4:dom",
                        amount: "4"
                    },
                    {
                        user: "@user4:dom",
                        amount: "-4"
                    }
                ]
            }
        ]);
        expect(store.tabular.get("a@b.com")).toStrictEqual(new Map([
            ["@user1:dom", "4.00"],
            ["@user2:dom", "4.00"],
            ["@user3:dom", "0.00"]
        ]));
        expect(store.tabular.get("b@c.com")).toStrictEqual(new Map([]));
        expect(store.tabular.get("c@d.com")).toStrictEqual(new Map([
            ["@user4:dom", "0.00"]
        ]));
    });

    it("test sorting", () => {
        const attrStore = useRoomStateStore();
        attrStore.addStateEvent(
            "a@b.com",
            "m.room.create",
            "",
            sampleRoomCreateEvent({ pfroom: true })
        );
        for (const userName of ["@user1:dom", "@user2:dom", "@user3:dom"]) {
            attrStore.addStateEvent(
                "a@b.com",
                "m.room.member",
                userName,
                sampleRoomMemberEvent({ displayname: userName, membership: "join" })
            );
        }
        const store = useMessageStore();
        addMultipleTx(store, "a@b.com",[
            {
                subject: "tx2",
                sender: "@foo:bar.com",
                v: [
                    {
                        user: "@user1:dom",
                        amount: "8"
                    },
                    {
                        user: "@user2:dom",
                        amount: "4"
                    },
                    {
                        user: "@user3:dom",
                        amount: "2"
                    }
                ]
            },
            {
                subject: "tx1",
                sender: "@foo:bar.com",
                v: [
                    {
                        user: "@user1:dom",
                        amount: "1"
                    },
                    {
                        user: "@user1:dom",
                        amount: "1"
                    }
                ]
            },
            {
                subject: "tx3",
                sender: "@foo:bar.com",
                v: [
                    {
                        user: "@user3:dom",
                        amount: "-8"
                    }
                ]
            }
        ]);

        addMultipleTx(store, "b@c.com", []);

        expect(store.getSortedBalancesForRoom("a@b.com")).toStrictEqual([
            [ '@user3:dom', '-6.00' ],
            [ '@user2:dom', '4.00' ],
            [ '@user1:dom', '10.00' ],
        ]);

        expect(store.getSortedBalancesForRoom("b@c.com")).toStrictEqual([]);
    });

    it("get all messages", () => {
        const store = useMessageStore();
        expect(store.getAllMessagesForRoom("a@b.com")).toStrictEqual([]);
        const attrStore = useRoomStateStore();
        attrStore.addStateEvent(
            "a@b.com",
            "m.room.create",
            "",
            sampleRoomCreateEvent({ pfroom: true })
        );
        for (const userName of ["@user1:dom", "@user2:dom", "@user3:dom"]) {
            attrStore.addStateEvent(
                "a@b.com",
                "m.room.member",
                userName,
                sampleRoomMemberEvent({ displayname: userName, membership: "join" })
            );
        }
        addMultipleTx(store, "a@b.com",[
            {
                subject: "tx2",
                sender: "@foo:bar.com",
                v: [
                    {
                        user: "@user1:dom",
                        amount: "8"
                    },
                    {
                        user: "@user2:dom",
                        amount: "4"
                    },
                    {
                        user: "@user3:dom",
                        amount: "2"
                    }
                ]
            },
            {
                subject: "tx1",
                sender: "@foo:bar.com",
                v: [
                    {
                        user: "@user1:dom",
                        amount: "1"
                    },
                    {
                        user: "@user1:dom",
                        amount: "1"
                    }
                ]
            },
            {
                subject: "tx3",
                sender: "@foo:bar.com",
                v: [
                    {
                        user: "@user3:dom",
                        amount: "-8"
                    }
                ]
            }
        ]);
        expect(store.getAllMessagesForRoom("a@b.com").length).toStrictEqual(3);
    });

    it("sorted balances for no room", () => {
        const store = useMessageStore();
        expect(store.getSortedBalancesForRoom("nonexistent")).toStrictEqual([]);
    });

    it("balance overview", () => {
        const store = useMessageStore();
        expect(store.getAllMessagesForRoom("a@b.com")).toStrictEqual([]);
        const attrStore = useRoomStateStore();
        attrStore.addStateEvent(
            "a@b.com",
            "m.room.create",
            "",
            sampleRoomCreateEvent({ pfroom: true })
        );
        for (const userName of ["@user1:dom", "@user2:dom", "@user3:dom"]) {
            attrStore.addStateEvent(
                "a@b.com",
                "m.room.member",
                userName,
                sampleRoomMemberEvent({ displayname: userName, membership: "join" })
            );
        }
        addMultipleTx(store, "a@b.com",[
            {
                subject: "tx2",
                sender: "@foo:bar.com",
                v: [
                    {
                        user: "@user1:dom",
                        amount: "8"
                    },
                    {
                        user: "@user2:dom",
                        amount: "4"
                    },
                    {
                        user: "@user3:dom",
                        amount: "2"
                    }
                ]
            },
            {
                subject: "tx1",
                sender: "@foo:bar.com",
                v: [
                    {
                        user: "@user1:dom",
                        amount: "1"
                    },
                    {
                        user: "@user1:dom",
                        amount: "1"
                    }
                ]
            },
            {
                subject: "tx3",
                sender: "@foo:bar.com",
                v: [
                    {
                        user: "@user3:dom",
                        amount: "-8"
                    }
                ]
            }
        ]);
        const msgs = store.getAllMessagesForRoom("a@b.com");
        expect(msgs.length).toStrictEqual(3);
        expect(store.calcTotalAmount(msgs[0])).toStrictEqual("14.00");
        expect(store.calcTotalAmount(msgs[1])).toStrictEqual("2.00");
        expect(store.calcTotalAmount(msgs[2])).toStrictEqual("8.00");
    });

    it("test duplicates", () => {
        const store = useMessageStore();
        const eventId = randomUUID();
        const el = {
            subject: "tx3",
            v: [
                {
                    user: "@user3:dom",
                    amount: "-8"
                }
            ]
        };
        store.addMessageBatch("a@b.com", [
            {
                content: {
                    body: "",
                    format: "pf.payment_data",
                    formatted_body: JSON.stringify(el),
                    msgtype: "m.text",
                },
                event_id: eventId,
                origin_server_ts: Math.round(Math.random() * 1000),
                sender: "@foo:bar.com",
                type: "m.room.message",
        }], () => { return; });
        store.addMessageBatch("a@b.com", [
                {
                    content: {
                        body: "",
                        format: "pf.payment_data",
                        formatted_body: JSON.stringify(el),
                        msgtype: "m.text",
                    },
                    event_id: eventId,
                    origin_server_ts: Math.round(Math.random() * 1000),
                    sender: "@foo:bar.com",
                    type: "m.room.message",
        }], () => { return; });
        expect(store.getAllMessagesForRoom("a@b.com").length).toStrictEqual(1);
    });

    it("test expenses order", () => {
        const store = useMessageStore();
        addSingleTx(store, "a@b.com", "me@me.com", "10", "other@me.com");
        addSingleTx(store, "a@b.com", "me@me.com", "20", "other@me.com");
        expect(store.getAllMessagesForRoom("a@b.com").map(m => m.content.formatted_body)).toStrictEqual([
            { subject:"Food", sender: "other@me.com", v: [ { user: "me@me.com", amount: "10" } ] },
            { subject:"Food", sender: "other@me.com", v: [ { user: "me@me.com", amount: "20" } ] }
        ])
    });

    it("test hasFullHistory valid", () => {
        const attrStore = useRoomStateStore();
        const msgStore = useMessageStore();
        attrStore.addStateEvent(
            "a@b.com",
            "m.room.create",
            "",
            sampleRoomCreateEvent({ pfroom: true })
        );
        expect(msgStore.hasFullHistory("@@b.com")).toStrictEqual(false);
        addInitialTx(msgStore, "a@b.com", "@me:asd.com");
        expect(msgStore.hasFullHistory("a@b.com")).toStrictEqual(true);
    })


    it("test hasFullHistory invalid", () => {
        const attrStore = useRoomStateStore();
        const msgStore = useMessageStore();
        attrStore.addStateEvent(
            "a@b.com",
            "m.room.create",
            "",
            sampleRoomCreateEvent({ pfroom: true })
        );
        expect(msgStore.hasFullHistory("@@b.com")).toStrictEqual(false);
        addSingleTx(msgStore, "a@b.com", "@user2:dom", "10", "@user1:dom");
        addInitialTx(msgStore, "a@b.com", "@me:asd.com");
        expect(msgStore.hasFullHistory("a@b.com")).toStrictEqual(false);
    })

    it("test displayment of all memebers", () => {
        const attrStore = useRoomStateStore();
        const msgStore = useMessageStore();
        attrStore.addStateEvent(
            "a@b.com",
            "m.room.create",
            "",
            sampleRoomCreateEvent({ pfroom: true })
        );
        addInitialTx(msgStore, "a@b.com", "@me:asd.com");
        for (const userName of ["@user1:dom", "@user2:dom", "@user3:dom"]) {
            attrStore.addStateEvent(
                "a@b.com",
                "m.room.member",
                userName,
                sampleRoomMemberEvent({ displayname: userName, membership: "join" })
            );
        }
        addSingleTx(msgStore, "a@b.com", "@user2:dom", "10", "@user1:dom");
        expect(msgStore.getSortedBalancesForRoom("a@b.com")).toStrictEqual([
            [ '@user1:dom', '-10.00' ],
            [ '@user3:dom', '0.00' ],
            [ '@user2:dom', '10.00' ]
        ]);
    });

    it("reduce debts", () => {
        const attrStore = useRoomStateStore();
        const msgStore = useMessageStore();
        attrStore.addStateEvent(
            "a@b.com",
            "m.room.create",
            "",
            sampleRoomCreateEvent({ pfroom: true })
        );
        
        for (const userName of ["@user1:dom", "@user2:dom", "@user3:dom"]) {
            attrStore.addStateEvent(
                "a@b.com",
                "m.room.member",
                userName,
                sampleRoomMemberEvent({ displayname: userName, membership: "join" })
            );
        }
        addInitialTx(msgStore, "a@b.com", "@user1:dom");

        expect(msgStore.reduceDebts("a@b.com")).toStrictEqual([
            [
                "@user1:dom",
                "@user2:dom",
                "@user3:dom",
            ],
            [
                [ "0.00", "0.00", "0.00" ],
                [ "0.00", "0.00", "0.00" ],
                [ "0.00", "0.00", "0.00" ]
            ]    
        ]);

        addSingleTx(msgStore, "a@b.com", "@user2:dom", "10.00", "@user1:dom");
        addSingleTx(msgStore, "a@b.com", "@user3:dom", "10.00", "@user2:dom");
        addSingleTx(msgStore, "a@b.com", "@user1:dom", "10.00", "@user3:dom");
        addSingleTx(msgStore, "a@b.com", "@user2:dom", "10.00", "@user1:dom");
        addSingleTx(msgStore, "a@b.com", "@user1:dom", "10.00", "@user3:dom");
        addSingleTx(msgStore, "a@b.com", "@user1:dom", "10.00", "@user2:dom");
        addSingleTx(msgStore, "a@b.com", "@illegaluser1:dom", "10.00", "@user1:dom");
        addSingleTx(msgStore, "a@b.com", "@user1:dom", "10.00", "@illegaluser1:dom");

        expect(msgStore.reduceDebts("a@b.com")).toStrictEqual([
        [
            "@user1:dom",
            "@user2:dom",
            "@user3:dom",
        ],
        [
            [
                "0.00",
                "20.00",
                "0.00",
            ],
            [
                "10.00",
                "0.00",
                "10.00",
            ],
            [
                "20.00",
                "0.00",
                "0.00",
            ]
        ]
        ]);

        addSingleTx(msgStore, "a@b.com", "@user2:dom", "-10.00", "@user1:dom");
        addSingleTx(msgStore, "a@b.com", "@user3:dom", "-10.00", "@user2:dom");
        addSingleTx(msgStore, "a@b.com", "@user1:dom", "-10.00", "@user3:dom");
        addSingleTx(msgStore, "a@b.com", "@user2:dom", "-10.00", "@user1:dom");
        addSingleTx(msgStore, "a@b.com", "@user1:dom", "-10.00", "@user3:dom");
        addSingleTx(msgStore, "a@b.com", "@user1:dom", "-10.00", "@user2:dom");
        addSingleTx(msgStore, "a@b.com", "@illegaluser1:dom", "-10.00", "@user1:dom");
        addSingleTx(msgStore, "a@b.com", "@user1:dom", "-10.00", "@illegaluser1:dom");

        expect(msgStore.reduceDebts("a@b.com")).toStrictEqual([
            [
                "@user1:dom",
                "@user2:dom",
                "@user3:dom"
            ],
            [
                [ "0.00", "0.00", "0.00" ],
                [ "0.00", "0.00", "0.00" ],
                [ "0.00", "0.00", "0.00" ]
            ]    
        ]);
    })

    it("reduce debts but no room", () => {
        const msgStore = useMessageStore();
        expect(msgStore.reduceDebts("!nonexistent-room:dom.com")).toStrictEqual([[],[]]);
    });

    it("clear store", () => {
        const msgStore = useMessageStore();
        addSingleTx(msgStore, "a@b.com", "@user1:dom", "10.00", "@user2:dom");
        expect(msgStore.getAllMessagesForRoom("a@b.com").length).toStrictEqual(1);
        msgStore.clear();
        expect(msgStore.getAllMessagesForRoom("a@b.com").length).toStrictEqual(0);
    })

    it("simple optimizer", () => {
        const attrStore = useRoomStateStore();
        const msgStore = useMessageStore();
        attrStore.addStateEvent(
            "a@b.com",
            "m.room.create",
            "",
            sampleRoomCreateEvent({ pfroom: true })
        );
        for (const userName of Array(4).fill(0).map((_,idx) => `user${idx+1}`)) {
            attrStore.addStateEvent(
                "a@b.com",
                "m.room.member",
                userName,
                sampleRoomMemberEvent({ displayname: userName, membership: "join" })
            );
        }
        addInitialTx(msgStore, "a@b.com", "@user1:dom");
        expect(msgStore.simpleOptimize("a@b.com")).toStrictEqual([]);
        addSingleTx(msgStore, "a@b.com", "user1", "10.00", "user2");
        expect(msgStore.simpleOptimize("a@b.com")).toStrictEqual([["user1","user2","10.00"]]);
        addSingleTx(msgStore, "a@b.com", "user1", "10.00", "user3");
        expect(msgStore.simpleOptimize("a@b.com")).toStrictEqual([["user1","user2","10.00"],["user1","user3","10.00"]]);
        addSingleTx(msgStore, "a@b.com", "user3", "10.00", "user1");
        expect(msgStore.simpleOptimize("a@b.com")).toStrictEqual([["user1","user2","10.00"]]);
        addSingleTx(msgStore, "a@b.com", "user3", "10.00", "user1");
        expect(msgStore.simpleOptimize("a@b.com")).toStrictEqual([["user1","user2","10.00"],["user3", "user1", "10.00"]]);
        addSingleTx(msgStore, "a@b.com", "user2", "10.00", "user1");
        addSingleTx(msgStore, "a@b.com", "user1", "10.00", "user3");
        expect(msgStore.simpleOptimize("a@b.com")).toStrictEqual([]);

        addSingleTx(msgStore, "a@b.com", "user1", "7.00", "user2");
        addSingleTx(msgStore, "a@b.com", "user1", "7.00", "user4");
        addSingleTx(msgStore, "a@b.com", "user2", "4.00", "user3");
        addSingleTx(msgStore, "a@b.com", "user3", "3.00", "user1");
        addSingleTx(msgStore, "a@b.com", "user3", "6.00", "user4");
        addSingleTx(msgStore, "a@b.com", "user4", "2.00", "user2");
        expect(msgStore.simpleOptimize("a@b.com")).toStrictEqual([
            ["user1","user2","7.00"],
            ["user3","user1","3.00"],
            ["user1","user4","7.00"],
            ["user2","user3","4.00"],
            ["user4","user2","2.00"],
            ["user3","user4","6.00"],
        ]);

        addSingleTx(msgStore, "a@b.com", "user1", "-7.00", "user2");
        addSingleTx(msgStore, "a@b.com", "user1", "-7.00", "user4");
        addSingleTx(msgStore, "a@b.com", "user2", "-4.00", "user3");
        addSingleTx(msgStore, "a@b.com", "user3", "-3.00", "user1");
        addSingleTx(msgStore, "a@b.com", "user3", "-6.00", "user4");
        addSingleTx(msgStore, "a@b.com", "user4", "-2.00", "user2");
        expect(msgStore.simpleOptimize("a@b.com")).toStrictEqual([]);

        addSingleTx(msgStore, "a@b.com", "user1", "10.00", "user1");
        expect(msgStore.simpleOptimize("a@b.com")).toStrictEqual([]);
    });
})
