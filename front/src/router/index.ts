// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { setupNavigationCleanup, removeTemporaryElements } from '@/utils/domCleanup';
// Static imports (no relative paths) — match original file structure but using '@' alias
import HomePage from '@/views/HomePage.vue';
import BudgetView from '@/views/budget/BudgetView.vue';
import HistorialView from '@/views/budget/agenda/HistorialView.vue';
import SuppliersPage from '@/views/suppliers/SuppliersPage.vue';
import AccountsPage from '@/views/suppliers/accounts/AccountsPage.vue';
import StatisticsConfigPage from '@/views/statistics/performance/config/StatisticsConfigPage.vue';
import MaintenancePage from '@/views/admin/MaintenancePage.vue';
import PersonalizationPage from '@/views/admin/PersonalizationPage.vue';
import SyncView from '@/views/sync/SyncView.vue';
import DLQView from '@/views/sync/DLQView.vue';
import LoginView from '@/views/auth/LoginView.vue';
import RegisterView from '@/views/auth/RegisterView.vue';
import AuthCallbackPage from '@/views/auth/AuthCallbackPage.vue';
import PerformanceTestPage from '@/views/test/PerformanceTestPage.vue';
import PerformancePage from '@/views/statistics/performance/PerformancePage.vue';
import CashFlow from '@/views/statistics/cashFlow/CashFlow.vue';

import ProviderEditPage from '@/views/budget/suppliers/ProviderEditPage.vue';
import EntryEditPage from '@/views/budget/entries/EntryEditPage.vue';
import RecurringPage from '@/views/recurring/RecurringPage.vue';
import RecurringEditPage from '@/views/recurring/RecurringEditPage.vue';
import PrivacyPolicyPage from '@/views/info/PrivacyPolicyPage.vue';
import DownloadsPage from '@/views/info/DownloadsPage.vue';

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
    path: '/budget/historial',
    name: 'BudgetHistorial',
    component: HistorialView,
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
    path: '/recurring',
    name: 'RecurringPage',
    component: RecurringPage,
  },
  {
    path: '/recurring/edit',
    name: 'RecurringEdit',
    component: RecurringEditPage,
  },
  {
    path: '/statistics/cash-flow',
    name: 'CashFlow',
    component: CashFlow,
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
    path: '/sync',
    name: 'SyncView',
    component: SyncView,
  },
  {
    path: '/sync/dlq',
    name: 'DLQView',
    component: DLQView,
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
    path: '/auth/callback',
    name: 'AuthCallback',
    component: AuthCallbackPage,
  },
  {
    path: '/test/performance',
    name: 'PerformanceTest',
    component: PerformanceTestPage,
  },
  {
    path: '/privacy-policy',
    name: 'PrivacyPolicyPage',
    component: PrivacyPolicyPage,
  },
  {
    path: '/downloads',
    name: 'DownloadsPage',
    component: DownloadsPage,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  removeTemporaryElements();

  if (from.path === '/test/performance') {
    setTimeout(() => {
      removeTemporaryElements();
    }, 100);
  }

  next();
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
router.beforeResolve(async (to, _from) => {
  // Disable prefetching to prevent component contamination
  // Only prefetch on production builds
  if (import.meta.env.DEV) return;

  // Define critical routes to prefetch (excluding statistics to prevent issues)
  const criticalRoutes = ['HomePage', 'BudgetView', 'AccountsPage'];

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
        await (component as () => Promise<unknown>)();
        console.debug(`[Router] Prefetched critical route: ${String(to.name)}`);
      } catch (error) {
        console.warn(`[Router] Failed to prefetch route: ${String(to.name)}`, error);
      }
    }
  }
});

export default router;
