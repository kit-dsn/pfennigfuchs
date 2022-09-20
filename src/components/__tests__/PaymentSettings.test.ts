import { setupServer } from "msw/node";
import { allHandlers } from "@/mocks/matrix";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import axios from "axios";
import { createPinia, setActivePinia, type Pinia, type Store } from "pinia";
import { useRoomStateStore } from "@/stores/RoomStateStore";
import { useGlobalAccountData } from "@/stores/GlobalAccountData";
import { mount } from "@vue/test-utils";
import { axiosKey, notificationKey } from "@/keys";
import PaymentSettingsVue from "@/components/user/PaymentSettings.vue";
import { useMatrixAuthStore } from "@/stores/MatrixAuthStore";
import MatrixSync from "@/services/MatrixSync";
import { useMessageStore } from "@/stores/MessageStore";
import { BootstrapVue3 } from "bootstrap-vue-3";
import { randomUUID } from "@/util/randomuuid";
import { messageTypeMock } from "@/mocks/MessageTypeMock";
import { notifierTypeMock } from "@/mocks/NotifierMock";

const server = setupServer(...allHandlers);
const axs = axios.create({
    baseURL: "https://matrix-client.matrix.org/",
    headers: {
      Authorization: `Bearer test-auth-token-1`,
    },
});
const testUser = "@test:test.com"

let roomStateStore: ReturnType<typeof useRoomStateStore>;
let msgStore: ReturnType<typeof useMessageStore>;
let globalAccountDataStore: ReturnType<typeof useGlobalAccountData>;
let authStore: ReturnType<typeof useMatrixAuthStore>;
const pinia = createPinia();
setActivePinia(pinia);


let userSettings: ReturnType<typeof mountPaymentSettings>;

function mountPaymentSettings() {
    return mount(PaymentSettingsVue, {
    global: {
        provide: {
            [axiosKey as symbol]: axs,
            [notificationKey as symbol]: {
                notifications: [],
                pushNotification: () => {
                    return;
                }
            },
        },
        plugins: [pinia, BootstrapVue3]
    }
    })
}

let syncer: MatrixSync;

describe("Payment Settings", () => {

    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterAll(() => server.close());
    afterEach(() => server.resetHandlers());
    beforeEach(() => {
        roomStateStore = useRoomStateStore();
        globalAccountDataStore = useGlobalAccountData();
        authStore = useMatrixAuthStore();
        msgStore = useMessageStore();
        authStore.authStore.identity = "@test:blub.com";
        userSettings = mountPaymentSettings();
        syncer = new MatrixSync(roomStateStore, msgStore, globalAccountDataStore, axs, messageTypeMock, notifierTypeMock);
    });
    
    it("adding payment info", async () => {
        // @ts-ignore
        userSettings.vm.pi_type = "IBAN";
        // @ts-ignore
        userSettings.vm.pi_address = "DE23984756987";
        // @ts-ignore
        userSettings.vm.pi_tag = "";
        // @ts-ignore
        await userSettings.vm.add();
        await syncer.matrixSync();
        
        expect(globalAccountDataStore.data.payment_info?.values().next().value).toContain({
            type: "IBAN",
            address: "DE23984756987",
            tag: ""
        });
    });

    it("removing payment info", async () => {
        const paymentId = randomUUID();
        const newPaymentInfo = {
            [paymentId]: {
                type: "IBAN",
                address: "DE87349879823923",
                tag: "",
            }
        }
        await axs.put(`/_matrix/client/v3/user/${testUser}/account_data/pfennigfuchs`, {
            payment_info: newPaymentInfo
        });
        await syncer.matrixSync();
        expect(Object.fromEntries(globalAccountDataStore.data.payment_info ?? [])).toEqual(newPaymentInfo);
        // @ts-ignore
        await userSettings.vm.removePi(paymentId);
        await syncer.matrixSync();
        expect(Object.fromEntries(globalAccountDataStore.data.payment_info ?? [])).toEqual({});
    });
});