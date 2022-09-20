import type { AxiosInstance } from "axios";
import type { DeepReadonly, InjectionKey } from "vue";
import type { Ref } from "vue";
import type { Notification } from "./PfennigFuchs.vue";

export type NotificationType = {
  notifications: DeepReadonly<Ref<Readonly<Notification[]>>>;
  pushNotification: (text: string) => void;
  clearNotifications: () => void;
};

export type MessageType = {
  messages: DeepReadonly<Ref<Readonly<Notification[]>>>;
  pushMessage: (text: string) => void;
  clearMessages: () => void;
};

export type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoise: Promise<'accepted' | 'dismissed'>;
}

export function isInstallEvent(e: Event): e is InstallEvent {
  return 'prompt' in e && 'userChoice' in e;
}

// axiosKey provides an axios instance configured for the current matrix session
// to all descendents of the router
export const axiosKey = Symbol("axiosKey") as InjectionKey<AxiosInstance>;
export const notificationKey = Symbol("notificationKey") as InjectionKey<NotificationType>;
export const messageKey = Symbol("messageKey") as InjectionKey<MessageType>;
export const installKey = Symbol("installKey") as InjectionKey<Ref<InstallEvent | undefined>>;
