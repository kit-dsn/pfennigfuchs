<script setup lang="ts">
import { axiosKey, notificationKey } from "@/keys";
import { inject, onUnmounted, ref } from "vue";
import { defined } from "@/util/helpers";
import { useAvatarStore } from "@/stores/AvatarStore";
import type { JsonMatrixMediaUpload } from "@/types/Matrix";

const axios = defined(inject(axiosKey));
const notify = defined(inject(notificationKey));

const avatarStore = useAvatarStore();

const upload_ongoing = ref(false);
const avatarUrl = ref(""); //mxc url
const avatarBlobUrl = ref(""); //blob that is displayed when there is no upload
const uploadedBlob = ref(""); //blob that is displayed when there is a upload ongoing

const avatar_uploaded = ref<boolean | null>(null);

const emit = defineEmits<{
    (e: "avatar-uploaded", url: string): void;
    (e: "avatar-cleared"): void;
}>();
const props = defineProps<{ id: string }>();

avatarStore.fetchAvatarEffect(axios, props.id, avatarBlobUrl);

onUnmounted(() => {
    uploadedBlob.value && URL.revokeObjectURL(uploadedBlob.value);
})

async function upload(e: Event) {
    avatar_uploaded.value = null;
    upload_ongoing.value = true;
    const files = (e.target as HTMLInputElement | null)?.files;
    if (!files?.[0]) {
        avatar_uploaded.value = false;
        return;
    }
    if (files[0].type != "image/png" && files[0].type != "image/jpeg") {
        notify.pushNotification("invalid image format");
        avatar_uploaded.value = false;
        return;
    }
    const resizedImage = await resizeImage(files[0], 640);
    uploadedBlob.value && URL.revokeObjectURL(uploadedBlob.value);
    uploadedBlob.value = URL.createObjectURL(resizedImage as File);
    try {
        const response = await axios.post<JsonMatrixMediaUpload>("/_matrix/media/v3/upload/", resizedImage, {
            headers: {
                "Content-Type": files[0].type,
            },
        });
        //saving the mxc:// url to use for avatar_url later
        avatarUrl.value = response?.data["content_uri"];
        avatar_uploaded.value = true;
    } catch {
        avatar_uploaded.value = false;
        upload_ongoing.value = false;
        notify.pushNotification("Failed File Upload");
    }
}

function cancelUpload() {
    uploadedBlob.value && URL.revokeObjectURL(uploadedBlob.value);
    uploadedBlob.value = "";
    upload_ongoing.value = false;
    avatar_uploaded.value = null;
}

function clearAvatar() {
    cancelUpload();
    avatarUrl.value = "";
    emit("avatar-cleared");
    notify.pushNotification("cleared avatar");
}

function confirmUpload() {
    uploadedBlob.value && URL.revokeObjectURL(uploadedBlob.value);
    uploadedBlob.value = "";
    upload_ongoing.value = false;
    avatar_uploaded.value = null;
    emit('avatar-uploaded', avatarUrl.value);
}

function resizeImage(file: File, maxSize: number) {
    const reader = new FileReader();
    const image = new Image();
    const canvas = document.createElement("canvas");
    const dataURItoBlob = (dataURI: string) => {
        const bytes =
            dataURI.split(",")[0].indexOf("base64") >= 0
                ? window.atob(dataURI.split(",")[1])
                : decodeURI(dataURI.split(",")[1]);
        const mime = dataURI.split(",")[0].split(":")[1].split(";")[0];
        const max = bytes.length;
        const ia = new Uint8Array(max);
        for (let i = 0; i < max; i++) ia[i] = bytes.charCodeAt(i);
        return new Blob([ia], { type: mime });
    };
    const resize = () => {
        let width = image.width;
        let height = image.height;
        if (width > height) {
            if (width > maxSize) {
                height *= maxSize / width;
                width = maxSize;
            }
        } else {
            if (height > maxSize) {
                width *= maxSize / height;
                height = maxSize;
            }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        return dataURItoBlob(dataUrl);
    };
    return new Promise((ok, no) => {
        if (!file.type.match(/image.*/)) {
            no(new Error("Not an image"));
            return;
        }
        reader.onload = (readerEvent) => {
            image.onload = () => ok(resize());
            image.src = readerEvent.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
}
</script>

<template>
    <div class="card mb-3 shadow">
        <div class="card-header py-3">
            <p class="text-primary m-0 fw-bold">Avatar</p>
        </div>
        <div class="card-body text-center">
            <div v-if="upload_ongoing && avatar_uploaded == null" class="mb-3 mt-4">
                <b-spinner style="width: 200px; height: 200px" />
            </div>
            <div v-else>
                <img v-if="uploadedBlob || avatarBlobUrl" class="rounded-circle mb-3 mt-4" style="object-fit: cover"
                    :src="uploadedBlob || avatarBlobUrl" height="200" width="200" />
                <img v-else class="rounded-circle mb-3 mt-4" style="object-fit: cover"
                    src="/assets/img/avatars/placeholder_avatar.png" height="200" width="200" />
            </div>
            <div class="mb-3">
                <div v-if="upload_ongoing">
                    <input class="btn btn-success btn-sm" type="submit" value="Confirm Upload" @click="
                    confirmUpload()" style="margin-right: 5px;" />
                    <input class="btn btn-danger btn-sm" type="submit" value="Cancel Upload" @click="cancelUpload()" />
                </div>
                <label data-cy="selectAvatar" class="btn btn-primary btn-sm" v-else>
                    <input id="file_input" type="file" accept="image/png, image/jpeg" @change="e => upload(e)"
                        hidden="true" />
                    Select File
                </label>
            </div>
            <div data-cy="clearAvatar" class="mb-3">
                <input class="btn btn-primary btn-sm" type="submit" value="Clear Avatar" @click="clearAvatar()" />
            </div>
            <div class="mb-3">
            </div>
            <b-form-invalid-feedback :state="avatar_uploaded ?? true">
                Upload Failed
            </b-form-invalid-feedback>
        </div>
    </div>
</template>

<style scoped>
.btn {
    width: 125px;
}
</style>
