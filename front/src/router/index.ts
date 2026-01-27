import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { setupNavigationCleanup, removeTemporaryElements } from '@/utils/domCleanup';
// Lazy loaded components for better code splitting
const HomePage = () => import('../views/HomePage.vue');
const BudgetView = () => import('../views/budget/BudgetView.vue');
const TemplatesView = () => import('../views/templates/TemplatesView.vue');
const SuppliersPage = () => import('../views/suppliers/SuppliersPage.vue');
const AccountsPage = () => import('../views/suppliers/accounts/AccountsPage.vue');
const StatisticsPage = () => import('../views/statistics/StatisticsPage.vue');
const StatisticsConfigPage = () => import('../views/statistics/config/StatisticsConfigPage.vue');
const MaintenancePage = () => import('../views/admin/MaintenancePage.vue');
const MigrateDates = () => import('../views/admin/maintenance/MigrateDates.vue');
const MigrateEntries = () => import('../views/admin/maintenance/MigrateEntries.vue');
const PersonalizationPage = () => import('../views/admin/PersonalizationPage.vue');
const SyncView = () => import('../views/sync/SyncView.vue');
const LoginView = () => import('../views/auth/LoginView.vue');
const RegisterView = () => import('../views/auth/RegisterView.vue');
const PerformanceTestPage = () => import('../views/test/PerformanceTestPage.vue');
const CashFlowPage = () => import('../views/statistics/cashFlow/CashFlow.vue');
const PerformancePage = () => import('../views/statistics/performance/PerformancePage.vue');

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
    path: '/statistics',
    name: 'StatisticsPage',
    component: StatisticsPage,
    children: [
      {
        path: 'cash-flow',
        name: 'StatisticsCashFlow',
        component: CashFlowPage,
      },
      {
        path: 'performance',
        name: 'StatisticsPerformance',
        component: PerformancePage,
      },
    ],
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
  const criticalRoutes = [
    'HomePage',
    'BudgetView',
    'AccountsPage',
    'TemplatesView',
  ];

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
