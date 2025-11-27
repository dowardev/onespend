import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import HomePage from '../views/HomePage.vue';
import BudgetView from '../views/budget/BudgetView.vue';
import TemplatesView from '../views/templates/TemplatesView.vue';
import SuppliersPage from '../views/suppliers/SuppliersPage.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/budget',
  },
  {
    path: '/home',
    name: 'Home',
    component: HomePage,
  },
  {
    path: '/budget',
    name: 'Budget',
    component: BudgetView,
  },
  {
    path: '/templates',
    name: 'Templates',
    component: TemplatesView,
  },
  {
    path: '/suppliers',
    name: 'SuppliersPage',
    component: SuppliersPage,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
