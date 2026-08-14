// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface User {
  id: number;
  name: string;
  user: string;
  email: string;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value);
  const userName = computed(() => user.value?.name || '');
  const userEmail = computed(() => user.value?.email || '');
  const userUsername = computed(() => user.value?.user || '');

  function setUser(u: User | null) {
    user.value = u;
  }

  function setIsLoading(loading: boolean) {
    isLoading.value = loading;
  }

  function setError(e: string | null) {
    error.value = e;
  }

  function clearError() {
    error.value = null;
  }

  function logout() {
    user.value = null;
    error.value = null;
  }

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    userName,
    userEmail,
    userUsername,
    setUser,
    setIsLoading,
    setError,
    clearError,
    logout,
  };
});
