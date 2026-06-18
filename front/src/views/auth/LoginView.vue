<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/budget"></ion-back-button>
        </ion-buttons>
        <ion-title>Iniciar Sesión</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div class="auth-container">
        <div class="logo-section">
          <h1>oneSpend</h1>
          <p>Inicia sesión para continuar</p>
        </div>

        <form class="auth-form" @submit.prevent="handleLogin">
          <ion-item>
            <ion-label position="stacked">Email o Usuario</ion-label>
            <ion-input
              v-model="login"
              type="text"
              required
              placeholder="tu@email.com o usuario"
            ></ion-input>
            <div v-if="v$.login?.$error" class="validation-error">
              <span v-if="v$.login?.required?.$invalid">El email o usuario es obligatorio</span>
            </div>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Contraseña</ion-label>
            <ion-input
              v-model="password"
              type="password"
              required
              placeholder="Tu contraseña"
            ></ion-input>
            <div v-if="v$.password?.$error" class="validation-error">
              <span v-if="v$.password?.required?.$invalid">La contraseña es obligatoria</span>
              <span v-else-if="v$.password?.minLength?.$invalid">La contraseña debe tener al menos 6 caracteres</span>
            </div>
          </ion-item>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>

          <ion-button type="submit" expand="block" :disabled="isLoading" class="auth-button">
            <ion-spinner v-if="isLoading" name="lines"></ion-spinner>
            <span v-else>Iniciar Sesión</span>
          </ion-button>
        </form>

        <div class="auth-footer">
          <p>¿No tienes cuenta? <a href="/register">Regístrate</a></p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Imports
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonSpinner,
  alertController,
} from '@ionic/vue';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { required, minLength } from '@vuelidate/validators';
import { useVuelidate } from '@vuelidate/core';
import authController from '@/controllers/authController';

// End Imports

// Components

// Vars
const router = useRouter();

const login = ref('');
const password = ref('');
const error = ref<string | null>(null);
const isLoading = ref(false);

// End Vars

// Computed
const rules = computed(() => ({
  login: { required },
  password: { required, minLength: minLength(6) },
}))

const v$ = useVuelidate(rules, { login, password }) as any
// End Computed

// Functions
async function handleLogin() {
  error.value = null;

  const isValid = await v$.value.$validate()
  if (!isValid) return

  isLoading.value = true;

  try {
    const result = await authController.login({
      login: login.value,
      password: password.value,
    });

    if (result.error) {
      error.value = result.error;
    } else if (result.user) {
      const alert = await alertController.create({
        header: 'Bienvenido',
        message: `Hola ${result.user.name}, has iniciado sesión correctamente.`,
        buttons: ['OK'],
      });
      await alert.present();
      router.push('/budget');
    }
  } catch (e) {
    error.value = 'Error al conectar con el servidor';
  } finally {
    isLoading.value = false;
  }
}
// End Functions
</script>

<style scoped>
.auth-container {
  max-width: 400px;
  margin: 0 auto;
  padding-top: 40px;
}

.logo-section {
  text-align: center;
  margin-bottom: 40px;
}

.logo-section h1 {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 8px;
}

.logo-section p {
  color: var(--ion-color-medium);
  margin: 0;
}

.auth-form {
  margin-bottom: 24px;
}

.auth-button {
  margin-top: 24px;
  height: 48px;
}

.error-message {
  color: var(--ion-color-danger);
  padding: 12px;
  margin-top: 12px;
  border-radius: 8px;
  background: rgba(var(--ion-color-danger-rgb), 0.1);
  font-size: 14px;
}

.auth-footer {
  text-align: center;
  color: var(--ion-color-medium);
}

.auth-footer a {
  color: var(--ion-color-primary);
  text-decoration: none;
  font-weight: 500;
}
</style>
