import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { setupNavigationCleanup, removeTemporaryElements } from '@/utils/domCleanup';
// Static imports (no relative paths) — match original file structure but using '@' alias
import HomePage from '@/views/HomePage.vue';
import BudgetView from '@/views/budget/BudgetView.vue';
import TemplatesView from '@/views/templates/TemplatesView.vue';
import SuppliersPage from '@/views/suppliers/SuppliersPage.vue';
import AccountsPage from '@/views/suppliers/accounts/AccountsPage.vue';
import StatisticsPage from '@/views/statistics/StatisticsPage.vue';
import StatisticsConfigPage from '@/views/statistics/performance/config/StatisticsConfigPage.vue';
import MaintenancePage from '@/views/admin/MaintenancePage.vue';
import MigrateDates from '@/views/admin/maintenance/MigrateDates.vue';
import MigrateEntries from '@/views/admin/maintenance/MigrateEntries.vue';
import PersonalizationPage from '@/views/admin/PersonalizationPage.vue';
import SyncView from '@/views/sync/SyncView.vue';
import LoginView from '@/views/auth/LoginView.vue';
import RegisterView from '@/views/auth/RegisterView.vue';
import PerformanceTestPage from '@/views/test/PerformanceTestPage.vue';
import CashFlowPage from '@/views/statistics/cashFlow/CashFlow.vue';
import PerformancePage from '@/views/statistics/performance/PerformancePage.vue';

import ProviderEditPage from '@/views/budget/suppliers/ProviderEditPage.vue';
import EntryEditPage from '@/views/budget/entries/EntryEditPage.vue';

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
    name: 'BudgetView',
    component: BudgetView,
  },
  {
    path: '/budget/provider/new',
    name: 'BudgetProviderNew',
    component: ProviderEditPage,
  },
  {
    path: '/budget/provider/edit',
    name: 'BudgetProviderEdit',
    component: ProviderEditPage,
  },
  {
    path: '/budget/entry/new',
    name: 'BudgetEntryNew',
    component: EntryEditPage,
  },
  {
    path: '/budget/entry/edit',
    name: 'BudgetEntryEdit',
    component: EntryEditPage,
  },
  {
    path: '/statistics/cash-flow',
    name: 'StatisticsCashFlow',
    component: CashFlowPage,
  },
  {
    path: '/statistics/performance',
    name: 'StatisticsPerformance',
    component: PerformancePage,
  },
  {
    path: '/suppliers',
    name: 'SuppliersPage',
    component: SuppliersPage,
  },
  {
    path: '/accounts',
    name: 'AccountsPage',
    component: AccountsPage,
  },
  {
    path: '/templates',
    name: 'TemplatesView',
    component: TemplatesView,
  },
  {
    path: '/sync',
    name: 'SyncView',
    component: SyncView,
  },
  {
    path: '/admin/personalization',
    name: 'PersonalizationPage',
    component: PersonalizationPage,
  },
  {
    path: '/admin/maintenance',
    name: 'MaintenancePage',
    component: MaintenancePage,
  },
  {
    path: '/admin/maintenance/dates',
    name: 'MigrateDates',
    component: MigrateDates,
  },
  {
    path: '/admin/maintenance/entries',
    name: 'MigrateEntries',
    component: MigrateEntries,
  },
  {
    path: '/admin/maintenance/statistics-fields',
    name: 'StatisticsConfigPage',
    component: StatisticsConfigPage,
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
    path: '/test/performance',
    name: 'PerformanceTest',
    component: PerformanceTestPage,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// Setup automatic cleanup on route navigation
setupNavigationCleanup(router);

// Additional cleanup for performance test route
router.beforeEach((to, from, next) => {
  // Clean up temporary elements on every navigation
  removeTemporaryElements();

  // Additional cleanup when leaving performance test
  if (from.path === '/test/performance') {
    setTimeout(() => {
      removeTemporaryElements();
    }, 100); // Delay to ensure cleanup after route change
  }

  next();
});

// Prefetch critical routes for better performance
router.beforeResolve(async (to, from) => {
  // Disable prefetching to prevent component contamination
  // Only prefetch on production builds
  if (import.meta.env.DEV) return;

  // Define critical routes to prefetch (excluding statistics to prevent issues)
  const criticalRoutes = ['HomePage', 'BudgetView', 'AccountsPage', 'TemplatesView'];

  // Add safety check to prevent prefetching statistics routes
  if (String(to.name).includes('Statistics') || String(to.name).includes('Performance')) {
    return;
  }

  // Prefetch if navigating to these routes
  if (criticalRoutes.includes(String(to.name))) {
    const matchedRoute = to.matched[0];
    const component = matchedRoute?.components?.default;

    if (component && typeof component === 'function') {
      try {
        // Prefetch the component
        await component();
        console.debug(`[Router] Prefetched critical route: ${to.name}`);
      } catch (error) {
        console.warn(`[Router] Failed to prefetch route: ${to.name}`, error);
      }
    }
  }
});

export default router;
