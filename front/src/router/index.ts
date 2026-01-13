import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import HomePage from '../views/HomePage.vue';
import BudgetView from '../views/budget/BudgetView.vue';
import TemplatesView from '../views/templates/TemplatesView.vue';
import SuppliersPage from '../views/suppliers/SuppliersPage.vue';
import AccountsPage from '../views/suppliers/accounts/AccountsPage.vue';
import StatisticsPage from '@/views/statistics/StatisticsPage.vue';
import StatisticsConfigPage from '@/views/statistics/config/StatisticsConfigPage.vue';
import MaintenancePage from '@/views/admin/MaintenancePage.vue';
import MigrateDates from '@/views/admin/maintenance/MigrateDates.vue';
import MigrateEntries from '@/views/admin/maintenance/MigrateEntries.vue';
import PersonalizationPage from '@/views/admin/PersonalizationPage.vue';
import LoginView from '../views/auth/LoginView.vue';
import RegisterView from '../views/auth/RegisterView.vue';

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
    path: '/login',
    name: 'Login',
    component: LoginView,
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterView,
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
  {
    path: '/suppliers/accounts',
    name: 'SuppliersAccounts',
    component: AccountsPage,
  },
  {
    path: '/admin/maintenance',
    name: 'MaintenancePage',
    component: MaintenancePage,
  },
  {
    path: '/admin/maintenance/migrate-dates',
    name: 'MigrateDates',
    component: MigrateDates,
  },
  {
    path: '/admin/maintenance/migrate-entries',
    name: 'MigrateEntries',
    component: MigrateEntries,
  },
  {
    path: '/admin/personalization',
    name: 'PersonalizationPage',
    component: PersonalizationPage,
  },
  {
    path: '/admin/migrate-dates',
    redirect: '/admin/maintenance/migrate-dates',
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: StatisticsPage,
    children: [
      {
        path: 'cash-flow',
        name: 'StatisticsCashFlow',
        component: StatisticsPage,
      },
      {
        path: 'performance',
        name: 'StatisticsPerformance',
        component: StatisticsPage,
      },
      {
        path: 'config',
        name: 'StatisticsConfigPage',
        component: StatisticsConfigPage,
      },
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
