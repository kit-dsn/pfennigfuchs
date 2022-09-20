import { setupServer } from "msw/node";
import { allHandlers } from "@/mocks/matrix";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import axios from "axios";
import { createPinia, setActivePinia, type Pinia, type Store } from "pinia";
import { useGlobalAccountData } from "@/stores/GlobalAccountData";
import UserSettingsVue from "@/components/user/UserSettings.vue";
import { mount } from "@vue/test-utils";
import { axiosKey, notificationKey } from "@/keys";
import { BootstrapVue3 } from "bootstrap-vue-3";
import { useMatrixAuthStore } from "@/stores/MatrixAuthStore";

const server = setupServer(...allHandlers);
const axs = axios.create({
    baseURL: "https://matrix-client.matrix.org/",
    headers: {
      Authorization: `Bearer test-auth-token-1`,
    },
});

function mountUserSettings() {
    return mount(UserSettingsVue, {
        global: {
            provide: {
                [axiosKey as symbol]: axs,
                [notificationKey as symbol]: {
                    notifications: [],
                    pushNotification: () => { return; }
                }
            },
            plugins: [pinia, BootstrapVue3]
        }
    });
}

const emptyUi = {
    displayname: "",
    email: "",
    avatar_url: "",
    phone: ""
};

let authStore: ReturnType<typeof useMatrixAuthStore>;
let globalAccountDataStore: ReturnType<typeof useGlobalAccountData>;
const pinia: Pinia = createPinia();
setActivePinia(pinia);
let userSettings: ReturnType<typeof mountUserSettings>;

describe("User Settings", () => {
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterAll(() => server.close());
    afterEach(() => server.resetHandlers());
    beforeEach(() => {
        authStore = useMatrixAuthStore();
        authStore.authStore.identity = "@a:b.com";
        globalAccountDataStore = useGlobalAccountData();
        globalAccountDataStore.data.user_info = emptyUi;
        userSettings = mountUserSettings();
    });


    it("updating user infos", async () => {
        // @ts-ignore
        userSettings.vm.emailNew = "test@blub.com";
        // @ts-ignore
        userSettings.vm.phoneNew = "+4923847065";
        // @ts-ignore
        userSettings.vm.updateInfos()
        expect(globalAccountDataStore.data.user_info).toStrictEqual(emptyUi);
    });

    it("updating displayname", async () => {
        // @ts-ignore
        userSettings.vm.displayname = "TestName";
        // @ts-ignore
        await userSettings.vm.updateInfos();
        // @ts-ignore
        expect(userSettings.vm.displayname).toEqual("");
        // @ts-ignore
        expect(userSettings.vm.displayname).toEqual("");
    });

    it("getting profile infos", async () => {
        // @ts-ignore
        userSettings.vm.displaynameNew = "TestName";
        // @ts-ignore
        userSettings.vm.emailNew = "test@blub.com";
        // @ts-ignore
        userSettings.vm.phoneNew = "+4923847065";
        // @ts-ignore
        await userSettings.vm.updateInfos();
        // @ts-ignore
        expect(globalAccountDataStore.data.user_info).toStrictEqual(emptyUi);
        // @ts-ignore
        expect(userSettings.vm.displayname).toEqual("");
    });
});
