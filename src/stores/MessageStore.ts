import { isJsonMatrixPfInitialMessage, isJsonMatrixPfInitialMessageRaw, isJsonMatrixPfPaymentMessage, type PfInitial, type PfInitialMessage, type PfInitialMessageRaw, type PfMessage, type PfPaymentMessage, type PfPaymentMessageRaw, type RoomName } from "@/types/Pfennigfuchs";
import { defined } from "@/util/helpers";
import { defineStore } from "pinia";
import { computed, readonly, ref, shallowRef, triggerRef, type ShallowRef } from "vue";
import { useRoomStateStore } from "./RoomStateStore";

export const useMessageStore = defineStore("pf-message-store", () => {
    const seenMessageIds = new Map<string,Set<string>>();
    const messages = ref(new Map<RoomName, Array<Array<PfPaymentMessage | PfInitialMessage>>>());
    const trigger = new Map<string,ShallowRef<Record<string,never>>>();

    function clear() {
        seenMessageIds.clear();
        messages.value.clear();
        trigger.clear();
    }

    function filterDuplicates(name: string) {
        let smIds = seenMessageIds.get(name);
        if (!smIds) {
            smIds = new Set<string>();
            seenMessageIds.set(name, smIds);
        }
        const smIds_ = smIds;

        return function(obj : PfPaymentMessageRaw | PfInitialMessageRaw) : boolean {
            if (smIds_.has(obj.event_id)) {
                return false;
            }
            smIds_.add(obj.event_id);
            return true;
        }
    }

    function getTriggerForRoom(roomId: string): ShallowRef<Record<string,never>> {
        let tr = trigger.get(roomId);
        if (!tr) {
            tr = shallowRef({});
            trigger.set(roomId, tr);
        }
        return tr;
    }

    function addMessageBatch(roomName: string, msgs: (PfPaymentMessageRaw | PfInitialMessageRaw)[],
        notifCb: (room: string, m: PfPaymentMessage) => void) {
        const msgs_ = msgs.filter(filterDuplicates(roomName)).map(rawToPfMessage);

        let room = messages.value.get(roomName);
        if (!room) {
            room = [];
            messages.value.set(roomName, room);
        }
        if (msgs_.length > 0) {
            msgs_.filter(isJsonMatrixPfPaymentMessage).forEach((m) => notifCb(roomName, m));
            room.push(msgs_);
            const tr = getTriggerForRoom(roomName);
            triggerRef(tr);
        }
    }

    function leaveRoom(roomName: string) {
        messages.value.delete(roomName);
        seenMessageIds.delete(roomName);
        trigger.delete(roomName);
    }

    function rawToPfMessage(msg: PfInitialMessageRaw | PfPaymentMessageRaw): PfPaymentMessage | PfInitialMessage {
        if (isJsonMatrixPfInitialMessageRaw(msg)) {
            return {
                ...msg,
                content: {
                    ...msg.content,
                    formatted_body: JSON.parse(msg.content.formatted_body) as PfInitial,
                }
            };
        } else {
            return { 
                ...msg,
                content: {
                    ...msg.content,
                    formatted_body: JSON.parse(msg.content.formatted_body) as PfMessage,
                },
            }
        }
    }

    function* processRoomMessages(id: string, room: Array<Array<PfPaymentMessage | PfInitialMessage>>): Generator<[PfMessage["v"][number] | null, PfMessage["v"][number] | null]> {
        for (const m of room.flat()) {
            if (isJsonMatrixPfInitialMessage(m)) {
                continue;
            }
            const fromMe = (m.content.formatted_body.sender ?? m.sender) === id;
            for (const t of m.content.formatted_body.v) {
                if (fromMe && t.user !== id) {
                    yield [t, null];
                } else if (!fromMe && t.user === id) {
                    yield [null, t];
                }
            }
        }
    }

    function getBalanceForRoom(roomName: string, id: string): string {
        const msgs = messages.value.get(roomName);
        let res = 0;
        for (const [l,r] of processRoomMessages(id, msgs ?? [])) {
            if (l) { res -= parseFloat(l.amount); }
            if (r) { res += parseFloat(r.amount); }
        }
        return res.toFixed(2);
    }

    function getAllMessagesForRoom(roomName: string) {
        const msgs = messages.value.get(roomName);
        if(!msgs) {
            return [];
        }
        return msgs.flat().filter(isJsonMatrixPfPaymentMessage);
    }

    function calcTotalAmount(msg: PfPaymentMessage) {
        const amounts = msg.content.formatted_body.v.map(p => Math.abs(parseFloat(p.amount)))
        const ret = amounts.reduce((prev, curr) => prev + curr, 0).toFixed(2);
        return ret;
    }

    function balancesOfRoom(roomId: string) {
        const rooms = useRoomStateStore();
        return rooms.getMembers(roomId).reduce((acc, user) => {
            acc.set(user, getBalanceForRoom(roomId, user));
            return acc;
        }, new Map<string,string>());
    }

    const tabular = computed(() => {
        return Array.from(messages.value.entries()).reduce((acc, [roomName,]) => {
            acc.set(roomName, balancesOfRoom(roomName));
            return acc;
        }, new Map<string, ReturnType<typeof balancesOfRoom>>());
    });

    function getSortedBalancesForRoom(roomName: string) {
        const balances = tabular.value.get(roomName);
        if (!balances) {
            return [];
        }
        return Array.from(balances.entries()).sort(([,r1],[,r2]) => parseFloat(r1) - parseFloat(r2));
    }

    function reduceDebts(roomId: string): [string[],string[][]] {
        const roomStore = useRoomStateStore();
        const members = roomStore.getMembers(roomId);
        const memberMap = new Map(members.map((v,i) => [v,i]))
        const acc = new Array(members.length).fill(0).map(() => new Array<string>(members.length).fill("0.00"));
        const room = messages.value.get(roomId);

        const m = (room ?? []).flat().filter(isJsonMatrixPfPaymentMessage).reduce((acc, cur) => {
            const sender = cur.content.formatted_body.sender ?? cur.sender;
            const senderIdx = memberMap.get(sender);
            if (senderIdx === undefined) {
                return acc;
            }

            cur.content.formatted_body.v.reduce((acc, cur) => {
                const receiverIdx = memberMap.get(cur.user);
                if (receiverIdx === undefined) {
                    return acc;
                }

                acc[senderIdx][receiverIdx] = (parseFloat(acc[senderIdx][receiverIdx]) + parseFloat(cur.amount)).toFixed(2);
                return acc;
            }, acc);
            return acc;
        }, acc);
        return [[...memberMap.keys()], m];
    }

    function hasFullHistory(roomId: string): boolean {
        const pfInit = messages.value.get(roomId)?.at(0)?.at(0);
        return !!pfInit && isJsonMatrixPfInitialMessage(pfInit);
    }

    function simpleOptimize(roomId: string): [string,string,string][] {
        const roomStore = useRoomStateStore();
        const members = roomStore.getMembers(roomId);
        const memberMap = new Map(members.map((v,i) => [v,i]));
        let acc = Array(members.length).fill(0).map(() => new Array<string>(members.length).fill("0.00"));
        acc = messages.value.get(roomId)?.flat()?.filter(isJsonMatrixPfPaymentMessage)?.reduce((acc,cur) => {
            const senderId = defined(memberMap.get(cur.content.formatted_body.sender ?? cur.sender));
            return cur.content.formatted_body.v.reduce((acc,cur) => {
                const receiverId = defined(memberMap.get(cur.user));
                if (senderId === receiverId) {
                    return acc;
                } else if (senderId < receiverId) {
                    acc[senderId][receiverId] = (parseFloat(acc[senderId][receiverId]) - parseFloat(cur.amount)).toFixed(2);
                } else {
                    acc[receiverId][senderId] = (parseFloat(acc[receiverId][senderId]) + parseFloat(cur.amount)).toFixed(2);
                }
                return acc;
            }, acc);
        }, acc) ?? [];
        const revMemberMap = Array.from(memberMap.keys());
        const res = acc.flatMap((arr, idx) => {
            const name1 = revMemberMap[idx];
            return arr.flatMap((amount,idx): [string,string,string][] => {
                const name2 = revMemberMap[idx];
                if (amount === "0.00") {
                    return [];
                }
                if (parseFloat(amount) >= 0) {
                    return [[name1,name2,amount]];
                } else {
                    return [[name2,name1,(-parseFloat(amount)).toFixed(2)]];
                }
            })
        })
        return res;
    }

    return {
        messages: readonly(messages),
        getTriggerForRoom,

        tabular,
        simpleOptimize,
        addMessageBatch,
        getBalanceForRoom,
        getAllMessagesForRoom,
        calcTotalAmount,
        getSortedBalancesForRoom,
        clear,
        reduceDebts,
        leaveRoom,
        hasFullHistory,
    };
});
