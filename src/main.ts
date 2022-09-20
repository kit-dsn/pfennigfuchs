import { createApp } from "vue";
import { createPinia } from "pinia";
import BootstrapVue3 from "bootstrap-vue-3";

import App from "./PfennigFuchs.vue";
import router from "./router";

import "/assets/bootstrap/css/bootstrap.min.css"; //from BSStudio
import "/assets/fonts/fontawesome-all.min.css"; //from BSStudio
import "bootstrap-vue-3/dist/bootstrap-vue-3.css";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const app = createApp(App);
app.use(BootstrapVue3);

app.use(createPinia());
app.use(router);

app.mount("#app");
