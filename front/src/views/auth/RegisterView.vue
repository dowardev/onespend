<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/budget"></ion-back-button>
        </ion-buttons>
        <ion-title>Registrarse</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div class="auth-container">
        <div class="logo-section">
          <h1>oneSpend</h1>
          <p>Crea tu cuenta</p>
        </div>

        <form @submit.prevent="handleRegister" class="auth-form">
          <ion-item>
            <ion-label position="stacked">Nombre</ion-label>
            <ion-input
              v-model="form.name"
              type="text"
              required
              placeholder="Tu nombre"
              @ionBlur="v$.name.$touch()"
            ></ion-input>
          </ion-item>
          <div v-if="v$.name.$error" class="field-error">
            <span v-if="v$.name.required.$invalid">El nombre es obligatorio</span>
          </div>

          <ion-item>
            <ion-label position="stacked">Usuario</ion-label>
            <ion-input
              v-model="form.user"
              type="text"
              required
              placeholder="Tu usuario"
              @ionBlur="v$.user.$touch()"
            ></ion-input>
          </ion-item>
          <div v-if="v$.user.$error" class="field-error">
            <span v-if="v$.user.required.$invalid">El usuario es obligatorio</span>
          </div>

          <ion-item>
            <ion-label position="stacked">Email</ion-label>
            <ion-input
              v-model="form.email"
              type="email"
              required
              placeholder="tu@email.com"
              @ionBlur="v$.email.$touch()"
            ></ion-input>
          </ion-item>
          <div v-if="v$.email.$error" class="field-error">
            <span v-if="v$.email.required.$invalid">El email es obligatorio</span>
            <span v-else-if="v$.email.email.$invalid">Ingresa un email válido</span>
          </div>

          <ion-item>
            <ion-label position="stacked">Contraseña</ion-label>
            <ion-input
              v-model="form.password"
              type="password"
              required
              placeholder="Mínimo 8 caracteres"
              @ionBlur="v$.password.$touch()"
            ></ion-input>
          </ion-item>
          <div v-if="v$.password.$error" class="field-error">
            <span v-if="v$.password.required.$invalid">La contraseña es obligatoria</span>
            <span v-else-if="v$.password.minLength.$invalid">Mínimo 8 caracteres</span>
          </div>

          <ion-item>
            <ion-label position="stacked">Confirmar Contraseña</ion-label>
            <ion-input
              v-model="form.passwordConfirmation"
              type="password"
              required
              placeholder="Repite tu contraseña"
              @ionBlur="v$.passwordConfirmation.$touch()"
            ></ion-input>
          </ion-item>
          <div v-if="v$.passwordConfirmation.$error" class="field-error">
            <span v-if="v$.passwordConfirmation.required.$invalid">Confirma tu contraseña</span>
            <span v-else-if="v$.passwordConfirmation.sameAs.$invalid">Las contraseñas no coinciden</span>
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>

          <ion-button
            v-if="isDev"
            type="button"
            expand="block"
            fill="outline"
            @click="generateRandomData"
            class="generate-button"
          >
            Generar datos de prueba
          </ion-button>

          <ion-button
            type="submit"
            expand="block"
            :disabled="isLoading || !isFormValid"
            class="auth-button"
          >
            <ion-spinner v-if="isLoading" name="lines"></ion-spinner>
            <span v-else>Crear Cuenta</span>
          </ion-button>
        </form>

        <div class="auth-footer">
          <p>¿Ya tienes cuenta? <a href="/login">Inicia Sesión</a></p>
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
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { required, email, minLength, sameAs, helpers } from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';
import { faker } from '@faker-js/faker';
import authController from '@/controllers/authController';

// End Imports

// Components

// Vars
const router = useRouter();

const form = reactive({
  name: '',
  user: '',
  email: '',
  password: '',
  passwordConfirmation: '',
});

const error = ref<string | null>(null);
const isLoading = ref(false);

// End Vars

// Computed
const formRules = computed(() => ({
  name: {
    required: helpers.withMessage('El nombre es obligatorio', required),
  },
  user: {
    required: helpers.withMessage('El usuario es obligatorio', required),
  },
  email: {
    required: helpers.withMessage('El email es obligatorio', required),
    email: helpers.withMessage('Ingresa un email válido', email),
  },
  password: {
    required: helpers.withMessage('La contraseña es obligatoria', required),
    minLength: minLength(8),
  },
  passwordConfirmation: {
    required: helpers.withMessage('Confirma tu contraseña', required),
    sameAs: sameAs(form.password, 'contraseña'),
  },
}));

const v$ = useVuelidate(formRules, form);

const isFormValid = computed(() => {
  return !v$.value.$invalid;
});

const isDev = computed(() => import.meta.env.DEV);

// End Computed

// Functions
function generateRandomData() {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  
  form.name = `${firstName} ${lastName}`;
  form.user = faker.internet.username();
  form.email = faker.internet.email({ firstName, lastName });
  form.password = 'Test1234';
  form.passwordConfirmation = 'Test1234';
  
  v$.value.$validate();
}

async function handleRegister() {
  const isValid = await v$.value.$validate();
  if (!isValid) {
    error.value = 'Por favor completa todos los campos correctamente';
    return;
  }

  error.value = null;
  isLoading.value = true;

  try {
    const result = await authController.register({
      name: form.name,
      user: form.user,
      email: form.email,
      password: form.password,
      password_confirmation: form.passwordConfirmation,
    });

    if (result.error) {
      error.value = result.error;
    } else if (result.user) {
      const alert = await alertController.create({
        header: 'Cuenta Creada',
        message: `Bienvenido ${result.user.name}, tu cuenta ha sido creada exitosamente.`,
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

.generate-button {
  margin-top: 12px;
  height: 40px;
  font-size: 14px;
}

.field-error {
  color: var(--ion-color-danger);
  font-size: 12px;
  padding-left: 16px;
  margin-top: -8px;
  margin-bottom: 8px;
}

.field-error span {
  display: block;
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
