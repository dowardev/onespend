import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";
import HomePage from "../views/HomePage.vue";
import BudgetView from "../views/BudgetView.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: "/budget",
  },
  {
    path: "/home",
    name: "Home",
    component: HomePage,
  },
  {
    path: "/budget",
    name: "Budget",
    component: BudgetView,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
