import type { MessageType } from "@/keys";
import { readonly, ref } from "vue";
import type { Message } from "@/PfennigFuchs.vue";

const msg = ref<Message[]>([]);

export const messageTypeMock: MessageType = {
    messages: readonly(msg),
    pushMessage: () => {
        return;
    },
    clearMessages: () => {
        return;
    }
};
