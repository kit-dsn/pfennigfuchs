import { splitMXCUrl } from "@/util/helpers";
import type { AxiosInstance } from "axios";
import { defineStore } from "pinia";
import { ref, toRaw, watch, type Ref } from "vue";


const registry = new FinalizationRegistry<string>(url => {
    URL.revokeObjectURL(url);
    // triggerRef(avatars);
});

export const useAvatarStore = defineStore("pf-avatar-store", () => {
    const avatarMap = ref(new Map<string,{ mxc: string }>());
    const avatars = ref(new WeakMap<{ mxc: string }, Promise<() => string>>());

    function clear() {
        avatarMap.value.clear();
    }

    async function loadAvatar(axios: AxiosInstance, mxcUrl: string): Promise<Blob> {
        const [domain, path] = splitMXCUrl(mxcUrl);
        const res = await axios.get<Blob>(`/_matrix/media/v3/download/${encodeURIComponent(domain)}/${encodeURIComponent(path)}`,
            {
              responseType: "blob",
            }
          );
        return res.data;
    }

    async function fetchAvatar(axios: AxiosInstance, id: string) {
        const desc = toRaw(avatarMap.value.get(id));
        if (!desc || !desc.mxc) {
            return null;
        }

        const p = avatars.value.get(desc);
        if (p) {
            return await p;
        }

        try {
            const p_ = loadAvatar(axios, desc.mxc).then(p => {
                const url = URL.createObjectURL(p);
                registry.register(desc, url);
                return () => { return {url, desc}.url };
            });
            avatars.value.set(desc, p_);
            const res = await p_;
            // triggerRef(avatars);
            return res;
        } catch {
            avatars.value.delete(desc);
            return null;
        }
    }

    function fetchAvatarEffect(axios: AxiosInstance, id: string, avatarBlobUrl: Ref<string>) {
        watch(
            () => avatarMap.value.get(id),
            async () => {
                avatarBlobUrl.value = (await fetchAvatar(axios, id))?.() ?? "";
            },
            {
                immediate: true
            }
        )
        return;
    }

    return {
        avatarMap,
        fetchAvatarEffect,
        clear,
    }
});
