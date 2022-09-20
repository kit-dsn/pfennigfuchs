import { createRouter, createWebHistory } from "vue-router";
import DashBoard from "@/components/DashBoard.vue";
import ContactList from "@/components/ContactList.vue";
import NewRoom from "@/components/NewRoom.vue";
import MainSettings from "@/components/user/MainSettings.vue";
import RoomEntries from "@/components/room/RoomEntries.vue";
import RoomBalances from "@/components/room/RoomBalances.vue";
import RoomSettings from "@/components/room/RoomSettings.vue";
import PerformanceEval from "@/components/PerformanceEval.vue";
import OptBalances from "@/components/room/OptBalances.vue";
import RoomDebug from "@/components/room/RoomDebug.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "Main",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      component: DashBoard,
    },
    {
      path: "/new",
      name: "New Room",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      component: NewRoom,
    },
    {
      path: "/settings",
      name: "Settings",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      component: MainSettings,
    },
    {
      path: "/contacts",
      name: "Contacts",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      component: ContactList,
    },
    {
      path: "/rooms/:id/entries",
      name: "RoomEntries",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      component: RoomEntries,
    },
    {
      path: "/rooms/:id/balances",
      name: "RoomBalances",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      component: RoomBalances,
    },
    {
      path: "/rooms/:id/settings",
      name: "RoomSettings",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      component: RoomSettings,
    },
    {
      path: "/rooms/:id/debug",
      name: "RoomDebug",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      component: RoomDebug,
    },
    {
      path: "/perftest",
      name: "PerformanceTests",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      component: PerformanceEval,
    },
    {
      path: "/rooms/:id/optbalances",
      name: "OptBalances",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      component: OptBalances,
    },
  ],
});

export default router;
