import { ref } from "vue";
import { defineStore } from "pinia";

export type AuthStore = {
  identity?: string;
  homeserver_base_url?: string;
  identityserver_base_url?: string;
  device_id?: string;
  auth_token?: string;
};

export const useMatrixAuthStore = defineStore("pf-matrix-auth-store", () => {
  const authStore = ref<AuthStore>({});

  return {
    authStore,
  };
});
