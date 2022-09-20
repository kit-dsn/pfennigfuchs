<script setup lang="ts">
import UserCard from "@/components/user/UserCard.vue";
import MatrixLogout from "@/components/MatrixLogout.vue";
import type { Message, Notification } from "@/PfennigFuchs.vue";
import { useRoomStateStore } from "@/stores/RoomStateStore";
import { computed } from "vue";
import { defined, formatTime } from "@/util/helpers";

const roomState = useRoomStateStore();

const myId = defined(roomState.myId);

const props = defineProps<{
  notifications: Notification[];
  messages: Message[];
  screenWidth: number;
  sidebarHidden: boolean;
}>();

const bigScreen = computed(() => {
  return props.screenWidth >= 768;
});

function calcBadge(id: number): string {
  return id == 0 ? "" : `${id}`;
}

const nativeNotifications = "Notification" in window;

async function requestNotificationPermissions() {
  if (nativeNotifications) {
    await window.Notification.requestPermission();
  }
}
</script>

<template>
  <nav
    class="navbar sticky-top navbar-light navbar-expand bg-light shadow mb-4 topbar static-top"
    style="z-index: 80 !important"
  >
    <div class="container-fluid">
      <button
        class="btn btn-link rounded-circle me-3"
        type="button"
        :hidden="bigScreen"
        @click="$emit('toggle-sidebar-hidden')"
      >
        <i class="fas fa-bars"></i>
      </button>
      <ul class="navbar-nav ms-auto">
        <li class="nav-item mx-1">
          <div class="nav-item alerts">
            <b-dropdown no-caret auto-close="outside" class="nav-link">
              <template #button-content>
                <span class="badge bg-danger badge-counter">{{
                  calcBadge(notifications.length)
                }}</span>
                <i class="fas fa-bell fa-fw"></i>
              </template>
              <b-dropdown-item-button @click="requestNotificationPermissions">
                <div
                  :v-if="nativeNotifications"
                  class="dropdown-item text-center small text-gray-500"
                >
                  Enable Mobile/Browser notifications
                </div>
              </b-dropdown-item-button>
              <b-dropdown-group header="Notifications">
                <b-dropdown-divider></b-dropdown-divider>
                <div style="max-height: 500px; overflow: auto; overflow-x:hidden">
                  <TransitionGroup name="list" tag="div">
                    <b-dropdown-item disabled v-if="notifications.length == 0">
                      <div class="dropdown-item d-flex align-items-center">
                        There are no notifications
                      </div>
                    </b-dropdown-item>
                    <b-dropdown-item
                      disabled
                      v-for="n of props.notifications"
                      :key="n.id"
                    >
                      <div class="dropdown-item d-flex align-items-center">
                        <div>
                          <span class="small text-gray-500">{{ formatTime(n.ts) }}</span>
                          <div style="white-space: normal">{{ n.text }}</div>
                        </div>
                      </div>
                    </b-dropdown-item>
                  </TransitionGroup>
                </div>
                <b-dropdown-divider></b-dropdown-divider>
                <b-dropdown-item-button @click="$emit('clear-notifications')">
                  <div class="dropdown-item text-center small text-gray-500">
                    Clear notifications
                  </div>
                </b-dropdown-item-button>
              </b-dropdown-group>
            </b-dropdown>
          </div>
        </li>
        <li class="nav-item mx-1">
          <div class="nav-item messages">
            <b-dropdown no-caret right auto-close="outside" class="nav-link">
              <template #button-content>
                <span class="badge bg-danger badge-counter">
                  {{ calcBadge(messages.length) }}</span
                >
                <i class="fas fa-envelope fa-fw"></i>
              </template>
              <b-dropdown-group header="Messages">
                <b-dropdown-divider></b-dropdown-divider>
                <div style="max-height: 500px; overflow: auto; overflow-x: hidden">
                  <TransitionGroup name="list" tag="div">
                    <b-dropdown-item disabled v-if="messages.length == 0">
                      <div class="dropdown-item d-flex align-items-center">
                        There are no new messages
                      </div>
                    </b-dropdown-item>
                    <b-dropdown-item disabled v-for="n of messages" :key="n.id">
                      <div class="dropdown-item d-flex align-items-center">
                        <div>
                          <span class="small text-gray-500">{{ formatTime(n.ts) }}</span>
                          <div style="white-space: normal">{{ n.text }}</div>
                        </div>
                      </div>
                    </b-dropdown-item>
                  </TransitionGroup>
                </div>
                <b-dropdown-divider></b-dropdown-divider>
                <b-dropdown-item-button @click="$emit('clear-messages')">
                  <div class="dropdown-item text-center small text-gray-500">
                    Clear Messages
                  </div>
                </b-dropdown-item-button>
              </b-dropdown-group>
            </b-dropdown>
          </div>
        </li>
        <div class="d-none d-sm-block topbar-divider"></div>

        <li>
          <div class="nav-item no-arrow">
            <div class="nav-link profile">
              <b-dropdown no-caret drop-left variant="link">
                <template #button-content>
                  <span>
                    <div class="no-arrow">
                      <UserCard
                        :user-id="myId"
                        :room-id="null"
                        :hide-modal="true"
                        :size="40"
                        :fSize="20"
                        :hide-id="true"
                        :mobile-resp="true"
                      />
                    </div>
                  </span>
                </template>
                <b-dropdown-item>
                  <b-link to="/settings" style="text-decoration: none">
                    <i class="fas fa-cogs fa-sm fa-fw me-2 text-gray-500"></i>
                    Settings
                  </b-link>
                </b-dropdown-item>
                <b-dropdown-item>
                  <MatrixLogout
                    icon-classes="fas fa-sign-out-alt fa-sm fa-fw me-2 text-gray-500"
                  />
                </b-dropdown-item>
              </b-dropdown>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style>
/* TODO fix alert boxes with z-index above sidebar */
.alerts > .btn-group > ul.dropdown-menu.show {
  left: -4rem;
  width: 19rem;
}

.messages > .btn-group > ul.dropdown-menu.show {
  left: -8rem;
  width: 17rem;
}

.profile > .btn-group > ul.dropdown-menu.show {
  left: -5rem;
}

.dropdown-menu p {
  white-space: normal;
}

.nav-item .dropdown-toggle::after {
  display: none !important;
}
</style>
