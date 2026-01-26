import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';

// Lazy loaded components for better code splitting
const HomePage = () => import('../views/HomePage.vue');
const BudgetView = () => import('../views/budget/BudgetView.vue');
const TemplatesView = () => import('../views/templates/TemplatesView.vue');
const SuppliersPage = () => import('../views/suppliers/SuppliersPage.vue');
const AccountsPage = () => import('../views/suppliers/accounts/AccountsPage.vue');
const StatisticsPage = () => import('@/views/statistics/StatisticsPage.vue');
const StatisticsConfigPage = () => import('@/views/statistics/config/StatisticsConfigPage.vue');
const MaintenancePage = () => import('@/views/admin/MaintenancePage.vue');
const MigrateDates = () => import('@/views/admin/maintenance/MigrateDates.vue');
const MigrateEntries = () => import('@/views/admin/maintenance/MigrateEntries.vue');
const PersonalizationPage = () => import('@/views/admin/PersonalizationPage.vue');
const SyncView = () => import('@/views/sync/SyncView.vue');
const LoginView = () => import('../views/auth/LoginView.vue');
const RegisterView = () => import('../views/auth/RegisterView.vue');

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
    path: '/sync',
    name: 'Sync',
    component: SyncView,
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
