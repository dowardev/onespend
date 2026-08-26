<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Política de Privacidad</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="8" size-lg="6">
            <ion-card class="shadow1 transparent">
              <ion-card-header>
                <ion-card-title>Política de Privacidad</ion-card-title>
                <ion-card-subtitle>Última actualización: 24 de agosto de 2026</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <p>
                  OneSpend ("la aplicación") es un gestor de gastos y presupuestos desarrollado por
                  DowarDev ("nosotros", "nuestro"). Esta política explica qué información maneja la
                  aplicación y cómo la protegemos.
                </p>
              </ion-card-content>
            </ion-card>

            <ion-card class="shadow1 transparent">
              <ion-card-header>
                <ion-card-title>1. Información que recopilamos</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p><strong>Datos de cuenta.</strong> Para sincronizar tus datos entre dispositivos,
                la aplicación utiliza un servicio de inicio de sesión propio. Recopilamos tu nombre
                de usuario y dirección de correo electrónico.</p>
                <p><strong>Datos financieros que ingresás.</strong> Gastos, ingresos, presupuestos,
                cuentas, proveedores, productos y notas que cargás voluntariamente en la aplicación.</p>
                <p><strong>Adjuntos.</strong> Imágenes u otros archivos que adjuntes a tus registros
                (por ejemplo, fotos de productos).</p>
                <p><strong>No recopilamos:</strong> datos de ubicación, contactos, información de
                dispositivos con fines publicitarios, ni utilizamos herramientas de análisis de
                terceros.</p>
              </ion-card-content>
            </ion-card>

            <ion-card class="shadow1 transparent">
              <ion-card-header>
                <ion-card-title>2. Cómo almacenamos tu información</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p><strong>En tu dispositivo:</strong> la aplicación funciona sin conexión y guarda
                tus datos localmente en el almacenamiento de tu dispositivo.</p>
                <p><strong>En nuestros servidores:</strong> si iniciás sesión, tus datos se
                sincronizan de forma cifrada con nuestros servidores (dowar.xyz) únicamente para
                habilitar la sincronización entre tus propios dispositivos y las copias de
                seguridad.</p>
                <p><strong>No vendemos ni compartimos</strong> tu información personal con terceros
                con fines publicitarios o comerciales.</p>
              </ion-card-content>
            </ion-card>

            <ion-card class="shadow1 transparent">
              <ion-card-header>
                <ion-card-title>3. Uso de la información</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>La información se utiliza exclusivamente para:</p>
                <ul>
                  <li>Proveer la funcionalidad de la aplicación (registro de gastos, presupuestos,
                  estadísticas)</li>
                  <li>Sincronizar tus datos entre tus dispositivos</li>
                  <li>Brindarte soporte cuando lo solicites</li>
                </ul>
              </ion-card-content>
            </ion-card>

            <ion-card class="shadow1 transparent">
              <ion-card-header>
                <ion-card-title>4. Retención y eliminación de datos</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>Podés eliminar tus datos locales borrando los registros dentro de la aplicación
                o desinstalando la aplicación.</p>
                <p>Para eliminar tu cuenta y todos los datos almacenados en nuestros servidores,
                contactanos a <strong>vortinext@dowar.xyz</strong> y procesaremos la eliminación en
                un plazo máximo de 30 días.</p>
              </ion-card-content>
            </ion-card>

            <ion-card class="shadow1 transparent">
              <ion-card-header>
                <ion-card-title>5. Seguridad</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>La comunicación entre la aplicación y nuestros servidores utiliza cifrado TLS.
                El acceso a los servidores está restringido y los datos se almacenan de forma
                cifrada.</p>
              </ion-card-content>
            </ion-card>

            <ion-card class="shadow1 transparent">
              <ion-card-header>
                <ion-card-title>6. Menores de edad</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>La aplicación no está dirigida a menores de 13 años y no recopilamos
                deliberadamente información de ellos.</p>
              </ion-card-content>
            </ion-card>

            <ion-card class="shadow1 transparent">
              <ion-card-header>
                <ion-card-title>7. Cambios a esta política</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>Podemos actualizar esta política ocasionalmente. Los cambios se publicarán en
                esta página con una nueva fecha de actualización.</p>
              </ion-card-content>
            </ion-card>

            <ion-card class="shadow1 transparent">
              <ion-card-header>
                <ion-card-title>8. Contacto</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>Si tenés preguntas sobre esta política o querés ejercer derechos sobre tus datos
                (acceso, rectificación, eliminación):</p>
                <p><strong>DowarDev</strong> — vortinext@dowar.xyz<br />
                Código fuente: https://gitlab.com/dowardev/onespend</p>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// 1. Imports (ionic/vue/ionicons)
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonButtons, IonMenuButton } from '@ionic/vue';

// 2. Controllers / Composables

// 3. Components

// 4. Interface and types imports

// 5. Main (props, emits, etc.)

// 6. Vars and const

// 7. Watch

// 8. Computed

// 9. OnMounted

// 10. Functions
</script>

<style>
.shadow1 {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
</style>
