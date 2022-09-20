<script setup lang="ts">
import { computed, inject } from "vue";
import MatrixLogout from "@/components/MatrixLogout.vue";
import { installKey } from "@/keys";
import { defined } from "@/util/helpers";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const props = defineProps<{
  sidebarHidden: boolean;
  isOpened: boolean;
  screenWidth: number;
}>();

const installPrompt = defined(inject(installKey));
async function doInstall() {
  if (!installPrompt.value) {
    return;
  }
  await installPrompt.value.prompt();
  installPrompt.value = undefined;
}

const bigScreenAndTouch = computed(() => {
  return (
    props.screenWidth >= 768 && ("ontouchstart" in window || navigator.maxTouchPoints > 0)
  );
});
</script>

<template>
  <!-- :hidden="sidebarHidden" -->
  <div
    :class="['sidebarA', { open: isOpened }]"
    :style="sidebarHidden ? 'transform: translate(-78px)' : ''"
  >
    <div class="logo-details" style="margin: 6px 14px 0 14px">
      <img
        src="/assets/img/fox_007.png"
        alt="menu-logo"
        class="menu-logo icon"
        :style="[
          isOpened ? '' : 'transform: translate(-7px);',
          bigScreenAndTouch ? 'opacity: 0;' : 'opacity: 1;',
        ]"
        @click="router.push({path: `/`})"
      />
      <div
        class="logo_name"
        :style="[
          isOpened
            ? bigScreenAndTouch
              ? 'transform: translate(-30px)'
              : 'transform: translate(0px)'
            : 'transform: translate(-150px)',
        ]"
        @click="router.push({path: `/`})"
      >
        Pfennigfuchs
      </div>
      <i
        style="z-index: 200"
        class="fas"
        :class="isOpened ? 'fa-angle-left' : 'fa-bars'"
        id="btn"
        @click="$emit('toggle-opened')"
        :hidden="!bigScreenAndTouch"
      />
    </div>

    <div
      style="
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        flex-grow: 1;
        max-height: calc(100% - 60px);
      "
    >
      <div id="my-scroll" style="margin: 6px 14px 0 14px">
        <ul class="nav-list" style="overflow: visible">
          <li>
            <b-link to="/" :class="route.path == '/' ? 'isSelected' : ''">
              <i class="fas fa-users"></i>
              <span class="links_name">Rooms</span>
            </b-link>
          </li>
          <li>
            <b-link to="/contacts" :class="route.path == '/contacts' ? 'isSelected' : ''">
              <i class="fas fa-address-book"></i>
              <span class="links_name">Contacts</span>
            </b-link>
          </li>
          <li>
            <b-link to="/settings" :class="route.path == '/settings' ? 'isSelected' : ''">
              <i class="fas fa-cog"></i>
              <span class="links_name">Settings</span>
            </b-link>
          </li>
          <li>
            <a href="#" v-show="installPrompt" @click="doInstall">
              <i class="fas fa-download"></i>
              <span class="links_name">Install</span>
            </a>
          </li>
          <li>
            <MatrixLogout icon-classes="fas fa-sign-out-alt" />
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style>
body {
  transition: all 0.5s ease;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
.menu-logo {
  width: 30px;
  margin: 0 10px 0 10px;
}
.menu-logo:hover, .logo_name:hover {
  cursor: pointer;
}
.sidebarA {
  position: relative;
  display: flex;
  flex-direction: column;
  position: fixed;
  width: 78px !important;
  left: 0;
  top: 0;
  height: 130%;
  min-height: min-content;
  background: var(--bs-primary);
  z-index: 99;
  transition: all 0.5s ease;
}
.sidebarA.open {
  width: 230px !important;
}
.sidebarA .logo-details {
  height: 60px;
  display: flex;
  align-items: center;
  position: relative;
}

.sidebarA .logo-details .logo_name {
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  opacity: 0;
  transition: all 0.5s ease;
}

.sidebarA.open .logo-details .logo_name {
  opacity: 1;
}
.sidebarA .logo-details #btn {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  font-size: 22px;
  text-align: center;
  cursor: pointer;
  transition: all 0.5s ease;
}

.sidebarA .logo-details .icon {
  transition: all 0.5s ease;
}

.sidebarA.open .logo-details #btn {
  text-align: right;
}
.sidebarA i {
  color: #fff;
  height: 60px;
  min-width: 50px;
  font-size: 28px;
  text-align: center;
  line-height: 60px;
}
.sidebarA .nav-list {
  margin-top: 0px;
  padding-left: 0 !important;
}
.sidebarA li {
  position: relative;
  margin: 4px 0;
  list-style: none;
}
.sidebarA li a {
  display: flex;
  height: 100%;
  width: 100%;
  border-radius: 12px;
  align-items: center;
  text-decoration: none;
  transition: all 0.4s ease;
  background: var(--bs-primary);
}
.sidebarA li a:hover {
  background: var(--bs-tertiary);
}
.sidebarA li .isSelected {
  background: var(--bs-secondary);
}
.sidebarA li a .links_name {
  color: #fff;
  font-size: 15px;
  font-weight: 400;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: 0.4s;
}
.sidebarA.open li a .links_name {
  opacity: 1;
  pointer-events: auto;
}
.sidebarA li a:hover .links_name,
.sidebarA li a:hover i {
  transition: all 0.5s ease;
  color: white;
}
.sidebarA li i {
  height: 50px;
  line-height: 50px;
  font-size: 18px;
  border-radius: 12px;
}
.sidebarA div img {
  height: 45px;
  width: 45px;
  object-fit: cover;
  border-radius: 6px;
  margin-right: 10px;
}
</style>
