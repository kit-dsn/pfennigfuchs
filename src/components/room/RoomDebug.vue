<script setup lang="ts">
import { useMessageStore } from '@/stores/MessageStore';
import { useRoomStateStore } from '@/stores/RoomStateStore';
import { useRoute } from 'vue-router';

const rooms = useRoomStateStore();
const msgs = useMessageStore();
const route = useRoute();
const roomId = route.params.id as string;

function replaces(key: string, value: object): object | object[] {
    if (typeof value === "object") {
        if (value instanceof Map) {
            return Object.fromEntries<object>(value.entries());
        } else if (value instanceof Set) {
            return Object.fromEntries<object>(value.entries());
        }
        return value;
    }
    return value;
}


</script>

<template>
    <div class="debuggrid">
        <div>{{ roomId }}</div>

        <div>RoomStateStore:</div>
        <pre>
{{ JSON.stringify([rooms.roomState.get(roomId)], replaces, '\t') }}
        </pre>

        <div>MessageStore:</div>
        <pre>
{{ JSON.stringify([msgs.messages.get(roomId)], replaces, '\t') }}
        </pre>

    </div>
</template>

<style scoped>
.debuggrid {
    padding-left: 1em;
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: start;
}
</style>
