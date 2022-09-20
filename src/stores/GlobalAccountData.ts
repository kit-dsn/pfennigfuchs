import { ref } from "vue";
import { defineStore } from "pinia";
import type { Replace, ExtractMapValue, TypeObjectToMap } from "@/types/Util";
import type { JsonMatrixPfGlobalData, UUID } from "@/types/Pfennigfuchs";

export type PfGlobalAccountData = Replace<JsonMatrixPfGlobalData, "payment_info", TypeObjectToMap<JsonMatrixPfGlobalData["payment_info"]>>;

export type PaymentInfoType = ExtractMapValue<PfGlobalAccountData["payment_info"]>["type"];

export type PfGlobalAccountDataRaw = Replace<PfGlobalAccountData, "payment_info", {
  [k in UUID]: ExtractMapValue<PfGlobalAccountData["payment_info"]>
}>;

export const useGlobalAccountData = defineStore("pf-global-account-data", () => {
    const data = ref<PfGlobalAccountData>({});

    function forRequest(): Required<PfGlobalAccountDataRaw> {
      return {
        user_info: data.value.user_info ?? {
          avatar_url: "",
          displayname: "",
          email: "",
          phone: "",
        },
        payment_info: Object.fromEntries(data.value.payment_info ?? []),
      }
    }

    return {
      data,
      forRequest
    };
  }
);
