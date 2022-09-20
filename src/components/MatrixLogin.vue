<script setup lang="ts">
import { onBeforeMount, onMounted, ref } from "vue";
import axios from "axios";
import {
  validateToken,
  login,
  discoverWellKnownAndVersion,
} from "@/services/MatrixAuth";

import { useMatrixAuthStore } from "@/stores/MatrixAuthStore";
import type { AuthStore } from "@/stores/MatrixAuthStore";
import { splitMatrixId } from "@/util/helpers";

const emit = defineEmits<{
  (e: 'authenticated-ok'): void;
  (e: 'authenticated-fail'): void;
  (e: 'authenticated-error'): void;
}>();

const validating = ref(true);
const username = ref("");
const password = ref("");
const errmsg = ref<string>();

const authStore = useMatrixAuthStore();

authStore.$subscribe(
  (mutation, state) => {
    localStorage.setItem("matrix-auth", JSON.stringify(state.authStore));
  },
  { detached: true }
);

async function pfLogin(matrixId: string, password: string, homeserver: string) {
  const user = splitMatrixId(matrixId)[0];
  const loginResult = await login(new URL(homeserver), user, password);
  authStore.$state = {
    authStore: {
      identity: matrixId,
      homeserver_base_url: homeserver,
      device_id: loginResult.deviceId,
      auth_token: loginResult.authToken,
    }
  };
  emit("authenticated-ok");
}

window._pf_login = pfLogin;

async function _submit() {
  const [user, domain] = username.value.split(":");
  if (!user || !domain) {
    errmsg.value = `Please enter valid Matrix account details`;
    return;
  }
  let server;
  try {
    server = await discoverWellKnownAndVersion(domain);
  } catch (err) {
    server = { homeBaseUrl: new URL(`https://${domain}/`) };
  }
  const deviceId = localStorage.getItem("device_id");
  const loginResult = await login(
    server.homeBaseUrl,
    user.slice(1),
    password.value,
    deviceId
  );
  authStore.$state = {
    authStore: {
      identity: username.value,
      homeserver_base_url: server.homeBaseUrl.href,
      identityserver_base_url: server.identityBaseUrl?.href,
      device_id: loginResult.deviceId,
      auth_token: loginResult.authToken,
    },
  };
  emit("authenticated-ok");
}

async function submit() {
  try {
    await _submit();
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const errMsg = (err.response?.data as { error: string } | undefined)?.error;
      if (errMsg) {
        // did the server signal the error?
        errmsg.value = `${err.message}: ${errMsg}`;
      } else {
        errmsg.value = err.message;
      }
    } else {
      // what else should we do?
      throw err;
    }
  }
}

function validateAuthStore(obj: object): obj is Required<AuthStore> {
  return "homeserver_base_url" in obj && "auth_token" in obj;
}

async function validateLocalStorage(): Promise<AuthStore | null> {
  const authStoreStr = localStorage.getItem("matrix-auth");
  if (!authStoreStr) {
    return null;
  }

  const auth = JSON.parse(authStoreStr) as object;
  // TODO: check if all elements non-undefined?
  if (!validateAuthStore(auth)) {
    return null;
  }

  try {
    await validateToken(new URL(auth.homeserver_base_url), auth.auth_token);
    return auth;
  } catch (err) {
    // 401 == Unauthorized
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      return null;
    } else if (axios.isAxiosError(err) && (err.code === "ERR_NETWORK" || err.code === "ERR_BAD_RESPONSE")) {
      return null;
    } else {
      throw err;
    }
  }
}

onBeforeMount(async () => {
  const ok = await validateLocalStorage();
  if (ok) {
    authStore.$state = { authStore: ok };
    emit("authenticated-ok");
  } else {
    authStore.$state = { authStore: {} };
    validating.value = false;
  }
});

onMounted(() => {
  window.document.body.style.paddingLeft = "0";
});
</script>

<template>
  <div class="centered" v-if="validating">
    <b-spinner>Loading...</b-spinner>
  </div>
  <template v-else>
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-9 col-lg-12 col-xl-10">
          <div class="card shadow-lg o-hidden border-0 my-5">
            <div class="card-body p-0">
              <div class="row">
                <div class="col-lg-6 d-none d-lg-flex">
                  <div class="flex-grow-1 bg-login-image"></div>
                </div>
                <div class="col-lg-6">
                  <div class="p-5">
                    <div class="text-center">
                      <h4 class="text-dark mb-4">Pfennigfuchs</h4>
                    </div>
                    <form class="user">
                      <div class="mb-3">
                        <input class="form-control form-control-user" type="text" id="username"
                          placeholder="@username:matrix.org" data-cy="userField" v-model="username" name="username"
                          autocomplete="username" required />
                      </div>

                      <div class="mb-3">
                        <input class="form-control form-control-user" type="password" id="password"
                          placeholder="Password" name="password" data-cy="pwField" v-model="password"
                          autocomplete="current-password" required />
                        <div v-if="errmsg">
                          <small data-cy="errormsg">{{ errmsg }}</small>
                        </div>
                      </div>
                      <!-- <div class="mb-3">
                        <div class="custom-control custom-checkbox small">
                          <div class="form-check">
                            <input
                              class="form-check-input custom-control-input"
                              type="checkbox"
                              id="formCheck-1"
                            /><label
                              class="form-check-label custom-control-label"
                              for="formCheck-1"
                              >Remember Me</label
                            >
                          </div>
                        </div>
                      </div> -->
                      <button class="btn btn-primary d-block btn-user w-100" @click="submit" data-cy="submitbutton"
                        type="button" :disabled="!username || !password">
                        Login
                      </button>
                      <!-- <div class="text-center"><a class="small" href="forgot-password.html">Forgot Password?</a></div>
                                    <div class="text-center"><a class="small" href="register.html">Create an Account!</a></div> -->
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
</template>

<style scoped>
.bg-login-image {
  background: url(/assets/img/fox_007.png) center / contain no-repeat;
}

.centered {
  position: fixed; /* or absolute */
  top: 50%;
  left: 50%;
}
</style>
