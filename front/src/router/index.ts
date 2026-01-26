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
const PerformanceTestPage = () => import('../views/test/PerformanceTestPage.vue');

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
    path: '/auth/register',
    name: 'Register',
    component: RegisterView,
  },
  {
    path: '/test/performance',
    name: 'PerformanceTest',
    component: PerformanceTestPage,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
