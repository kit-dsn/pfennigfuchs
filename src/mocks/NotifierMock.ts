import type { NotificationType } from "@/keys";
import { readonly, ref } from "vue";
import type { Notification } from "@/PfennigFuchs.vue";

const msg = ref<Notification[]>([]);

export const notifierTypeMock: NotificationType = {
    notifications: readonly(msg),
    pushNotification() {
        return;
    },
    clearNotifications() {
        return;
    }
};
