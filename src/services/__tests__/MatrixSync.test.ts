import { setupServer } from "msw/node";
import { addMessagesToSync, allHandlers, generateInvite, type Msg, addMessagesToMessage, createRoom, generateAvatarChangedEvent, addMemberEvent } from "@/mocks/matrix";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import axios from "axios";
import MatrixSync from "@/services/MatrixSync";
import { createPinia, setActivePinia } from "pinia";
import { useRoomStateStore } from "@/stores/RoomStateStore";
import { useGlobalAccountData, type PfGlobalAccountDataRaw } from "@/stores/GlobalAccountData";
import type { PfMessage, PfPaymentMessageRaw } from "@/types/Pfennigfuchs";
import { useMessageStore } from "@/stores/MessageStore";
import { useMatrixAuthStore } from "@/stores/MatrixAuthStore";
import { randomUUID } from "@/util/randomuuid";
import { messageTypeMock } from "@/mocks/MessageTypeMock";
import { notifierTypeMock } from "@/mocks/NotifierMock";
import type { JsonMatrixRoomNameEvent } from "@/types/Matrix";
import { useAvatarStore } from "@/stores/AvatarStore";

const server = setupServer(...allHandlers);
const axs = axios.create({
    baseURL: "https://matrix-client.matrix.org/",
    headers: {
      Authorization: `Bearer test-auth-token-1`,
    },
});

const testUser = "@test:test.com";

let syncer: MatrixSync
let roomStateStore: ReturnType<typeof useRoomStateStore>;
let msgStore: ReturnType<typeof useMessageStore>;
let globalAccountDataStore: ReturnType<typeof useGlobalAccountData>;
let authStore: ReturnType<typeof useMatrixAuthStore>;
let avatarStore: ReturnType<typeof useAvatarStore>

describe("Matrix sync", () => {
    beforeAll(() => {
        setActivePinia(createPinia());
        server.listen({ onUnhandledRequest: "error" });
        roomStateStore = useRoomStateStore();
        globalAccountDataStore = useGlobalAccountData();
        msgStore = useMessageStore();
        authStore = useMatrixAuthStore();
        avatarStore = useAvatarStore();
        authStore.authStore.identity = "@me:blub.com";
        syncer = new MatrixSync(roomStateStore, msgStore, globalAccountDataStore, axs, messageTypeMock, notifierTypeMock);
    });
    afterAll(() => server.close());
    afterEach(() => server.resetHandlers());

    it("applying global data", async () => {
        const newPaymentInfo = {
            [randomUUID()]: {
                type: "IBAN",
                address: "DE87349879823923",
                tag: "",
            }
        }
        await axs.put(`/_matrix/client/v3/user/${testUser}/account_data/pfennigfuchs`, {
            payment_info: newPaymentInfo
        });
        await syncer.matrixSync();
        expect(newPaymentInfo).toEqual(Object.fromEntries(globalAccountDataStore.data.payment_info ?? []));
    });

    it("applying multiple global data", async () => {
        const firstId = randomUUID();
        const secondId = randomUUID();
        const newPaymentInfo1 = {
            [firstId]: {
                type: "IBAN",
                address: "DE87349879823923",
                tag: "",
            }
        }
        await axs.put(`/_matrix/client/v3/user/${testUser}/account_data/pfennigfuchs`, {
            payment_info: newPaymentInfo1
        });
        await syncer.matrixSync();
        const newPaymentInfo2 = {
            ...newPaymentInfo1,
            [secondId]: {
                type: "PAYPAL",
                address: "test@blub.com",
                tag: "",
            }
        }
        await axs.put(`/_matrix/client/v3/user/${testUser}/account_data/pfennigfuchs`, {
            payment_info: newPaymentInfo2
        });
        await syncer.matrixSync();
        expect(Object.fromEntries(globalAccountDataStore.data.payment_info ?? []).firstId).toEqual(newPaymentInfo1.firstId);
        expect(Object.fromEntries(globalAccountDataStore.data.payment_info ?? []).secondId).toEqual(newPaymentInfo2.secondId);
    });

    it("creating room and applying room state",async () => {
       const roomId = await MatrixSync.createRoom(axs, "TestRoom", ["@test:blub.com"])
       await syncer.matrixSync();
       expect(roomStateStore.getAllRooms).toContain(roomId);
    });

    it("creating space", async () => {
        await syncer.matrixSync();
        await syncer.matrixSync();
        expect(roomStateStore.space).toBeDefined()
    });

    it("joining invited pf room", async () => {
        const roomId = generateInvite(true);
        await syncer.matrixSync();
        await syncer.matrixSync();
        expect(roomStateStore.getAllRooms).toContain(roomId);
    });

    function createMessage(body: PfMessage, sender: string): PfPaymentMessageRaw & Msg  {
        return {
            content: {
                body: "",
                msgtype: "m.text",
                format: "pf.payment_data",
                formatted_body: JSON.stringify(body),
            },
            type: "m.room.message",
            event_id: randomUUID(),
            origin_server_ts: Math.random(),
            sender: sender
        }
    }

    it("message retrieval", async () => {
        const roomId = await MatrixSync.createRoom(axs, "TestRoom", ["@me:blub.com"])
        await syncer.matrixSync();
        addMessagesToSync(roomId, [
            createMessage({v:[{amount: "1.0", user: "@me:blub.com"}], subject: "", sender: "@other:id.com"}, "@other:id.com")
        ]);
        await syncer.matrixSync();
        expect(msgStore.getBalanceForRoom(roomId, "@me:blub.com")).toBe("1.00");
    });

    it("test reply cache", async () => {
        const roomId = await MatrixSync.createRoom(axs, "TestRoom", ["@me:blub.com"])
        await syncer.matrixSync();
        const o = createMessage({v:[{amount: "1.0", user: "@me:blub.com"}], subject: "", sender: "@other:id.com"}, "other@id.com")
        addMessagesToSync(roomId, [o, o]);
        await syncer.matrixSync();
        expect(msgStore.getBalanceForRoom(roomId, "@me:blub.com")).toBe("1.00");
    });

    it("test leaving room", async () => {
        const roomId = await MatrixSync.createRoom(axs, "Test", []);
        await syncer.matrixSync();
        expect(roomStateStore.getAllRooms).toContain(roomId);
        const status = await MatrixSync.leaveRoomRaw(axs, roomId);
        await syncer.matrixSync();
        expect(status).toBe(200);
        expect(roomStateStore.getAllRooms).not.toContain(roomId);
    });

    it("test invitations", async () => {
        // Test invitation to non pf rooms
        const roomId = generateInvite(false);
        await syncer.matrixSync();
        await syncer.matrixSync();
        expect(roomStateStore.getAllRooms).not.toContain(roomId);

        // Test invitation to pf rooms with name
        const roomId2 = generateInvite(true, "Test");
        await syncer.matrixSync();
        await syncer.matrixSync();
        expect(roomStateStore.getAllRooms).toContain(roomId2);
    });

    it("test specific room creation", async () => {
        const roomId1 = await MatrixSync.createRoom(axs, "Test", [], true);
        const roomId2 = await MatrixSync.createRoom(axs, "Test", [], false, "This is a test room");
        await syncer.matrixSync();
        await syncer.matrixSync();
        expect(roomStateStore.getAllRooms).toContain(roomId1);
        expect(roomStateStore.getAllRooms).toContain(roomId2);
        expect(roomStateStore.isPfOneOnOne(roomId1)).toBeTruthy();
    });

    it("test inviting", async () => {
        const invitee = "@friend:blub.com";
        const roomId = await MatrixSync.createRoom(axs, "Test", []);
        await syncer.matrixSync();
        expect(roomStateStore.getMembers(roomId)).not.toContain(invitee);
        await MatrixSync.inviteRaw(axs, roomId, invitee);
        await syncer.matrixSync();
        expect(roomStateStore.getMembers(roomId)).toContain(invitee);
    });

    it("test updating room", async () => {
        const roomId = await MatrixSync.createRoom(axs, "Test", []);
        await syncer.matrixSync();
        expect(roomStateStore.getDisplayRoomName(roomId)).toEqual(roomId);
        expect(roomStateStore.getRoomDescription(roomId)).toBeUndefined();
        const oldState = roomStateStore.forRequestRoom(roomId);
        const newData: JsonMatrixRoomNameEvent["content"] = {
            ...oldState,
            name: "Hallo",
            pf_room_description: "This is a test room"
        }
        await MatrixSync.updateRoomInfo(axs, roomId, newData);
        await syncer.matrixSync();
        expect(roomStateStore.getDisplayRoomName(roomId)).toEqual("Hallo");
        expect(roomStateStore.getRoomDescription(roomId)).toEqual("This is a test room");
    });

    it("test avatar syncing", async () => {
        const roomId = await MatrixSync.createRoom(axs, "Test", []);
        await syncer.matrixSync();
        const oldState = roomStateStore.forRequestRoom(roomId);
        const newData: JsonMatrixRoomNameEvent["content"] = {
            ...oldState,
            name: "Hallo",
            pf_room_description: "This is a test room",
            pf_avatar_url: "mxc://localhost/GCmhgzMPRjqgpODLsNQzVuHZ#auto"
        }
        await MatrixSync.updateRoomInfo(axs, roomId, newData);
        await syncer.matrixSync();
        expect(roomStateStore.roomState.get(roomId)?.get("m.room.name")?.get("")?.content).toStrictEqual(newData);
        expect(roomStateStore.getDisplayRoomName(roomId)).toEqual("Hallo");
        expect(roomStateStore.getRoomDescription(roomId)).toEqual("This is a test room");
        expect(roomStateStore.getRoomAvatar(roomId)).toEqual("mxc://localhost/GCmhgzMPRjqgpODLsNQzVuHZ#auto");
        expect(avatarStore.avatarMap.get("@friend:blub.com")).toBeUndefined();
        generateAvatarChangedEvent(roomId, "@friend:blub.com");
        await syncer.matrixSync();
        expect(avatarStore.avatarMap.get("@friend:blub.com")?.mxc).toBeDefined();
    });

    it("test avatar uploading", async () => {
        const infos = globalAccountDataStore.forRequest();
        const newInfo: PfGlobalAccountDataRaw = {
            ...infos,
            user_info: {
                displayname: "TestUser",
                avatar_url: "mxc://localhost/GCmhgzMP",
                email: "test-user@gmail.com",
                phone: "+49913846"
            }
        };
        await MatrixSync.updateUserInfo(axs, testUser, newInfo);
        await syncer.matrixSync();
        expect(globalAccountDataStore.data.user_info).toStrictEqual(newInfo.user_info);
        expect(avatarStore.avatarMap.get("@me:blub.com")?.mxc).toEqual("mxc://localhost/GCmhgzMP")
    });

    it("test room member info syncing", async () => {
        const roomId = await MatrixSync.createRoom(axs, "Test", []);
        await syncer.matrixSync();
        const userInfo = {
            displayname: "TestUser",
            avatar_url: "mxc://localhost/GCmhgzMP",
            email: "test-user@gmail.com",
            phone: "+49913846"
        };
        const paymentInfo = {
            [randomUUID()]: {
                type: "IBAN",
                tag: "",
                address: "DE667587098"
            },
            [randomUUID()]: {
                type: "PAYPAL",
                tag: "",
                address: "blub@gmail.com"
            }
        }
        addMemberEvent(roomId, "@me:blub.com", "join", userInfo, paymentInfo);
        await syncer.matrixSync();
        expect(roomStateStore.getJoinedMembers(roomId)).toContain("@me:blub.com");
        expect(roomStateStore.getPfContactInformation(roomId, "@me:blub.com")).toStrictEqual(userInfo);
        const updateInfo = {
            displayname: "Blub",
            avatar_url: "mxc://localhost/GCmhgzMP",
            email: "blub@gmail.com",
            phone: "+32456"
        };
        addMemberEvent(roomId, "@me:blub.com", "join", updateInfo, paymentInfo);
        await syncer.matrixSync();
        expect(roomStateStore.getPfContactInformation(roomId, "@me:blub.com")).toStrictEqual(updateInfo);
    });

    it("test message feedback simple", async () => {
        const roomId = await MatrixSync.createRoom(axs, "TestRoom", ["@me:blub.com"])
        await syncer.matrixSync();
        addMessagesToSync(roomId, [
            createMessage({v:[{amount: "3.0", user: "@me:blub.com"}], subject: "", sender: "@other:id.com"}, "other@id.com")
        ]);
        addMessagesToMessage(roomId, [
            createMessage({v:[{amount: "1.0", user: "@me:blub.com"}], subject: "", sender: "@other:id.com"}, "other@id.com")
        ]);
        await syncer.matrixSync();
        expect(msgStore.getBalanceForRoom(roomId, "@me:blub.com")).toBe("4.00");
    });
});
