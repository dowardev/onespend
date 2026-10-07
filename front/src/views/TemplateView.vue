<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

templa
<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolvar>
        <ion-title>{{ t('common.template') }}</ion-title>
      </ion-toolvar>
    </ion-header>

    <ion-content>
      <!-- content -->
      <!-- end content -->

      <!-- modals -->
      <!-- end modals -->

      <!-- popovers -->
      <!-- end popovers  -->

      <!-- alerts -->
      <!-- end alerts -->
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
// imports
import { useLocale } from '@/composables/useLocale';
// Ejemplo: ionic,vue,ionicons
// end

// controllers
// end controllers

// components
// end components

// interface and types imports
// end interface and types imports

// main
// this section will contain elements that are necessary for the component such as props, emits, etc.
// end main

// vars and const
const { t } = useLocale();
// end vars and const

// watch
// end

// computed
// end computed

// onmounted
// end onmounted

// functions
// NOTE: functions must follow the structure of named parameters
// The parameters of the function must be accessed using object destructuring
// Example
// function prueba(params:{nombre:string,apellido:string,edad:number}) {
// const {nombre,apellido,edad}=params
// }
// end functions
</script>
