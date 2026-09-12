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
        <ion-title>Descargas</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="8" size-lg="6">
            <ion-list :inset="true" class="transparent">
              <ion-item lines="none">
                <ion-icon slot="start" :icon="downloadOutline" color="primary"></ion-icon>
                <ion-label>
                  <h2>Elegí tu plataforma</h2>
                  <p>Seleccioná una opción para ver requisitos y descarga</p>
                </ion-label>
              </ion-item>
            </ion-list>

            <ion-card class="shadow1">
              <ion-item lines="none">
                <ion-icon slot="start" :icon="phonePortraitOutline" color="primary"></ion-icon>

                <ion-label>
                  <h2>Móvil</h2>

                  <p>Tiendas de Android</p>
                </ion-label>
              </ion-item>

              <ion-accordion-group>
                <!-- Google Play -->
                <ion-accordion value="google-play">
                  <ion-item slot="header" lines="none" class="transparent">
                    <svg
                      slot="start"
                      class="brand-icon"
                      viewBox="0 0 24 24"
                      role="img"
                      aria-label="Google Play"
                    >
                      <path
                        d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z"
                        fill="#34A853"
                      />
                    </svg>
                    <ion-label>
                      <h3>Google Play</h3>
                      <p>Android</p>
                    </ion-label>
                    <ion-badge slot="end" color="medium">Próximamente</ion-badge>
                  </ion-item>
                  <div slot="content" class="ac-content">
                    <ion-item class="transparent">
                      <ion-label>
                        <h3>Requisitos:</h3>
                        <p>Android 7.0 (Nougat) o superior · ~30 MB de espacio</p>
                      </ion-label>
                      <ion-button slot="end" fill="clear" disabled>
                        <ion-icon :icon="downloadOutline"></ion-icon>
                      </ion-button>
                    </ion-item>
                  </div>
                </ion-accordion>

                <!-- App Gallery -->
                <ion-accordion value="app-gallery">
                  <ion-item slot="header" lines="none" class="transparent">
                    <svg
                      slot="start"
                      class="brand-icon"
                      viewBox="0 0 24 24"
                      role="img"
                      aria-label="AppGallery"
                    >
                      <path
                        d="M6.734 0C1.804 0 0 1.803 0 6.733v10.535C0 22.198 1.803 24 6.734 24h10.529C22.193 24 24 22.197 24 17.268V6.733C24 1.803 22.197 0 17.266 0zM8 4h.565A3.439 3.439 0 0 0 12 7.435 3.439 3.439 0 0 0 15.435 4H16c0 2.206-1.794 4-4 4S8 6.206 8 4zm6.468 8h.52l.713 2.16.696-2.158h.66l-1.092 3.14h-.532l-.714-2.063-.714 2.063h-.528l-1.095-3.14h.678l.694 2.158zm6.236 0h.629v3.138h-.629zM2.666 12h.638v1.267h1.439V12h.637v3.142h-.637v-1.276h-1.44v1.276h-.637zm5.668 0h.637v1.772c0 .9-.496 1.417-1.36 1.417-.856 0-1.347-.507-1.347-1.39v-1.797H6.9v1.775c0 .524.255.805.719.805.46 0 .714-.273.714-.784zm2.344 0h.563l1.378 3.14h-.668l-.282-.654H10.23l-.286.654h-.651zm6.893.002h2.312v.572H18.2v.643h1.16v.573H18.2v.777h1.744v.573H17.57zm-6.623.793-.48 1.124h.964z"
                        fill="#CE0E2D"
                      />
                    </svg>

                    <ion-label>
                      <h3>App Gallery</h3>
                      <p>Android · Huawei</p>
                    </ion-label>

                    <ion-badge slot="end" color="success">Disponible</ion-badge>
                  </ion-item>

                  <div slot="content" class="ac-content">
                    <ion-item class="transparent">
                      <ion-label>
                        <h3>Requisitos:</h3>
                        <p>Android 7.0 (Nougat) o superior · ~30 MB de espacio</p>
                      </ion-label>
                      <ion-button slot="end" fill="clear">
                        <ion-icon :icon="downloadOutline"></ion-icon>
                      </ion-button>
                    </ion-item>
                  </div>
                </ion-accordion>

                <!-- F-Droid -->
                <ion-accordion value="f-droid">
                  <ion-item slot="header" lines="none" class="transparent">
                    <svg
                      slot="start"
                      class="brand-icon"
                      viewBox="0 0 24 24"
                      role="img"
                      aria-label="F-Droid"
                    >
                      <path
                        d="M20.472,10.081H3.528c-0.877,0-1.589,0.711-1.589,1.589v10.59c0,0.877,0.711,1.589,1.589,1.589h16.944 c0.877,0,1.589-0.711,1.589-1.589V11.67C22.061,10.792,21.349,10.081,20.472,10.081z M12,22.525c-3.066,0-5.56-2.494-5.56-5.56 s2.494-5.56,5.56-5.56c3.066,0,5.56,2.494,5.56,5.56S15.066,22.525,12,22.525z M12,12.411c-2.511,0-4.554,2.043-4.554,4.554 S9.489,21.519,12,21.519s4.554-2.043,4.554-4.554S14.511,12.411,12,12.411z M12,20.274c-1.563,0-2.881-1.103-3.221-2.568h1.67 c0.275,0.581,0.859,0.979,1.551,0.979c0.96,0,1.721-0.761,1.721-1.721c0-0.96-0.761-1.721-1.721-1.721 c-0.649,0-1.2,0.352-1.493,0.874H8.805c0.378-1.412,1.669-2.462,3.195-2.462c1.818,0,3.309,1.491,3.309,3.309 C15.309,18.783,13.818,20.274,12,20.274z M23.849,0.396c-0.001,0.001-0.002,0.002-0.002,0.003 c-0.002-0.002-0.004-0.003-0.006-0.005c0.001-0.001,0.002-0.003,0.004-0.004c-0.116-0.137-0.279-0.231-0.519-0.238 c-0.202,0.005-0.391,0.097-0.512,0.259l-1.818,2.353c-0.164-0.058-0.339-0.095-0.523-0.095H3.528c-0.184,0-0.358,0.038-0.523,0.095 L1.187,0.41c-0.121-0.162-0.31-0.253-0.512-0.259c-0.24,0.006-0.403,0.1-0.519,0.238c0.001,0.001,0.002,0.003,0.004,0.004 C0.157,0.395,0.155,0.397,0.153,0.399C0.153,0.398,0.152,0.397,0.151,0.396C0.085,0.474-0.146,0.822,0.139,1.22l1.909,2.471 C1.981,3.867,1.94,4.057,1.94,4.257v3.707c0,0.877,0.711,1.589,1.589,1.589h16.944c0.877,0,1.589-0.711,1.589-1.589V4.257 c0-0.2-0.041-0.39-0.109-0.566l1.909-2.471C24.146,0.822,23.915,0.474,23.849,0.396z M6.904,8.228c-0.987,0-1.787-0.8-1.787-1.787 s0.8-1.787,1.787-1.787s1.787,0.8,1.787,1.787S7.891,8.228,6.904,8.228z M17.229,8.228c-0.987,0-1.787-0.8-1.787-1.787 s0.8-1.787,1.787-1.787c0.987,0,1.787,0.8,1.787,1.787S18.216,8.228,17.229,8.228z"
                        fill="#75A54B"
                      />
                    </svg>
                    <ion-label>
                      <h3>F-Droid</h3>
                      <p>Android · libre y de código abierto</p>
                    </ion-label>
                    <ion-badge slot="end" color="medium">Próximamente</ion-badge>
                  </ion-item>
                  <div slot="content" class="ac-content">
                    <ion-item class="transparent">
                      <ion-label>
                        <h3>Requisitos:</h3>
                        <p>Android 7.0 (Nougat) o superior · ~30 MB de espacio</p>
                      </ion-label>
                      <ion-button slot="end" fill="clear" disabled>
                        <ion-icon :icon="downloadOutline"></ion-icon>
                      </ion-button>
                    </ion-item>
                    <p class="ac-note">
                      Tienda de aplicaciones libre y de código abierto: sin cuenta, sin
                      publicidad y con verificación independiente de cada versión.
                    </p>
                  </div>
                </ion-accordion>

                <!-- Uptodown -->
                <ion-accordion value="uptodown">
                  <ion-item slot="header" lines="none" class="transparent">
                    <svg
                      slot="start"
                      class="brand-icon"
                      viewBox="0 0 24 24"
                      role="img"
                      aria-label="Uptodown"
                    >
                      <path
                        d="m23.7261 11.3154-2.7589-2.759a.974.974 0 0 0-1.377 0l-2.759 2.759a.974.974 0 0 1-1.3782 0l-2.7589-2.759a.974.974 0 0 0-1.3782 0l-2.759 2.759a.974.974 0 0 1-1.377 0L4.421 8.5564a.974.974 0 0 0-1.377 0l-2.759 2.759a.974.974 0 0 0 0 1.377l3.4439 3.4439 4.1324 4.1323 3.4438 3.4438a.974.974 0 0 0 1.3782 0l3.4439-3.4438 4.1323-4.1323 3.4438-3.4439a.974.974 0 0 0 .0228-1.377zM11.3303 7.1818a.974.974 0 0 0 1.377 0l2.759-2.7589a.974.974 0 0 0 0-1.377l-2.759-2.759a.974.974 0 0 0-1.377 0l-2.759 2.759a.974.974 0 0 0 0 1.377z"
                        fill="#00AAD5"
                      />
                    </svg>

                    <ion-label>
                      <h3>Uptodown</h3>

                      <p>Android · tienda alternativa</p>
                    </ion-label>

                    <ion-badge slot="end" color="medium">Próximamente</ion-badge>
                  </ion-item>

                  <div slot="content" class="ac-content">
                    <ion-item class="transparent">
                      <ion-label>
                        <h3>Requisitos:</h3>

                        <p>Android 7.0 (Nougat) o superior · ~30 MB de espacio</p>
                      </ion-label>

                      <ion-button slot="end" fill="clear" disabled>
                        <ion-icon :icon="downloadOutline"></ion-icon>
                      </ion-button>
                    </ion-item>

                    <p class="ac-note">
                      Tienda alternativa de aplicaciones: descarga directa del APK,
                      sin cuenta y sin publicidad.
                    </p>
                  </div>
                </ion-accordion>
              </ion-accordion-group>
            </ion-card>

            <ion-card class="shadow1">
              <ion-item lines="none">
                <ion-icon slot="start" :icon="globeOutline" color="primary"></ion-icon>

                <ion-label>
                  <h2>Web</h2>

                  <p>Navegador + instalable</p>
                </ion-label>
              </ion-item>

              <ion-accordion-group>
                <!-- PWA -->
                <ion-accordion value="pwa">
                  <ion-item slot="header" lines="none" class="transparent">
                    <svg
                      slot="start"
                      class="brand-icon"
                      viewBox="0 0 24 24"
                      role="img"
                      aria-label="PWA"
                    >
                      <path
                        d="M20.5967 7.482L24 16.518h-2.5098l-.5816-1.6184h-3.2452l.6933-1.7532h2.0019l-.95-2.6597 1.1881-3.0047zm-8.111 0l1.7722 5.8393L16.75 7.482h2.4154l-3.6433 9.036h-2.3833l-1.6395-5.2366-1.7196 5.2366h-2.377l-1.233-2.1161 1.2144-3.7415 1.342 2.6609 1.9029-5.8393h1.8566zm-8.7453 0c1.0635 0 1.8713.3055 2.4234.9166a2.647 2.647 0 01.2806.3684l-1.0753 3.3128-.3847 1.1854c-.352.1006-.7533.1509-1.204.1509H2.2928v3.102H0V7.482zm-.5816 1.7532h-.866v2.4276h.8597c.5577 0 .9406-.1194 1.1485-.3582.1896-.215.2845-.5058.2845-.8724 0-.364-.1079-.6544-.3235-.8714-.2157-.217-.5834-.3256-1.1032-.3256z"
                        fill="#5A0FC8"
                      />
                    </svg>
                    <ion-label>
                      <h3>PWA (Web)</h3>
                      <p>Navegador + instalable</p>
                    </ion-label>
                    <ion-badge slot="end" color="success">Disponible</ion-badge>
                  </ion-item>
                  <div slot="content" class="ac-content">
                    <ion-item class="transparent">
                      <ion-label>
                        <h3>Requisitos:</h3>
                        <p>Chrome, Edge o Safari actual · funciona offline</p>
                      </ion-label>
                      <ion-button slot="end" fill="clear" @click="openPwa">
                        <ion-icon :icon="globeOutline"></ion-icon>
                      </ion-button>
                    </ion-item>
                  </div>
                </ion-accordion>
              </ion-accordion-group>
            </ion-card>

            <ion-card class="shadow1">
              <ion-item lines="none">
                <ion-icon slot="start" :icon="desktopOutline" color="primary"></ion-icon>

                <ion-label>
                  <h2>Escritorio</h2>

                  <p>Instalador por sistema operativo</p>
                </ion-label>
              </ion-item>

              <ion-accordion-group>
                <!-- Linux -->
                <ion-accordion value="linux">
                  <ion-item slot="header" lines="none" class="transparent">
                    <svg
                      slot="start"
                      class="brand-icon"
                      viewBox="0 0 24 24"
                      role="img"
                      aria-label="Linux"
                    >
                      <path
                      d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.043c-.06-.003-.12 0-.18 0h-.016c.151-.467-.182-.825-1.065-1.224-.915-.4-1.646-.336-1.77.465-.008.043-.013.066-.018.135-.068.023-.139.053-.209.064-.43.268-.662.669-.793 1.187-.13.533-.17 1.156-.205 1.869v.003c-.02.334-.17.838-.319 1.35-1.5 1.072-3.58 1.538-5.348.334a2.645 2.645 0 00-.402-.533 1.45 1.45 0 00-.275-.333c.182 0 .338-.03.465-.067a.615.615 0 00.314-.334c.108-.267 0-.697-.345-1.163-.345-.467-.931-.995-1.788-1.521-.63-.4-.986-.87-1.15-1.396-.165-.534-.143-1.085-.015-1.645.245-1.07.873-2.11 1.274-2.763.107-.065.037.135-.408.974-.396.751-1.14 2.497-.122 3.854a8.123 8.123 0 01.647-2.876c.564-1.278 1.743-3.504 1.836-5.268.048.036.217.135.289.202.218.133.38.333.59.465.21.201.477.335.876.335.039.003.075.006.11.006.412 0 .73-.134.997-.268.29-.134.52-.334.74-.4h.005c.467-.135.835-.402 1.044-.7zm2.185 8.958c.037.6.343 1.245.882 1.377.588.134 1.434-.333 1.791-.765l.211-.01c.315-.007.577.01.847.268l.003.003c.208.199.305.53.391.876.085.4.154.78.409 1.066.486.527.645.906.636 1.14l.003-.007v.018l-.003-.012c-.015.262-.185.396-.498.595-.63.401-1.746.712-2.457 1.57-.618.737-1.37 1.14-2.036 1.191-.664.053-1.237-.2-1.574-.898l-.005-.003c-.21-.4-.12-1.025.056-1.69.176-.668.428-1.344.463-1.897.037-.714.076-1.335.195-1.814.12-.465.308-.797.641-.984l.045-.022zm-10.814.049h.01c.053 0 .105.005.157.014.376.055.706.333 1.023.752l.91 1.664.003.003c.243.533.754 1.064 1.189 1.637.434.598.77 1.131.729 1.57v.006c-.057.744-.48 1.148-1.125 1.294-.645.135-1.52.002-2.395-.464-.968-.536-2.118-.469-2.857-.602-.369-.066-.61-.2-.723-.4-.11-.2-.113-.602.123-1.23v-.004l.002-.003c.117-.334.03-.752-.027-1.118-.055-.401-.083-.71.043-.94.16-.334.396-.4.69-.533.294-.135.64-.202.915-.47h.002v-.002c.256-.268.445-.601.668-.838.19-.201.38-.336.663-.336zm7.159-9.074c-.435.201-.945.535-1.488.535-.542 0-.97-.267-1.28-.466-.154-.134-.28-.268-.373-.335-.164-.134-.144-.333-.074-.333.109.016.129.134.199.2.096.066.215.2.36.333.292.2.68.467 1.167.467.485 0 1.053-.267 1.398-.466.195-.135.445-.334.648-.467.156-.136.149-.267.279-.267.128.016.034.134-.147.332a8.097 8.097 0 01-.69.468zm-1.082-1.583V5.64c-.006-.02.013-.042.029-.05.074-.043.18-.027.26.004.063 0 .16.067.15.135-.006.049-.085.066-.135.066-.055 0-.092-.043-.141-.068-.052-.018-.146-.008-.163-.065zm-.551 0c-.02.058-.113.049-.166.066-.047.025-.086.068-.14.068-.05 0-.13-.02-.136-.068-.01-.066.088-.133.15-.133.08-.031.184-.047.259-.005.019.009.036.03.03.05v.02h.003z"
                      fill="#333333"
                      />
                    </svg>

                    <ion-label>
                      <h3>Linux</h3>

                      <p>AppImage · DEB · OBS · Flathub · AUR</p>
                    </ion-label>

                    <ion-badge slot="end" color="medium">Próximamente</ion-badge>
                  </ion-item>

                  <div slot="content" class="ac-content">
                    <!-- Nota interna: compilar el AppImage siempre en la distro más
                      vieja soportada (Debian/Ubuntu LTS). La glibc solo es compatible
                      hacia adelante: un AppImage armado en Arch/glibc nueva no abre
                      en Debian estable. Pendiente: builds de release en contenedor. -->
                    <ion-item class="transparent">
                      <ion-label>
                        <h3>AppImage</h3>

                        <p>Universal — funciona en cualquier distribución, sin instalar</p>
                      </ion-label>

                      <ion-button slot="end" fill="clear" disabled>
                        <ion-icon :icon="downloadOutline"></ion-icon>
                      </ion-button>
                    </ion-item>

                    <ion-item class="transparent">
                      <ion-label>
                        <h3>DEB</h3>

                        <p>Debian · Ubuntu · Mint</p>
                      </ion-label>

                      <ion-button slot="end" fill="clear" disabled>
                        <ion-icon :icon="downloadOutline"></ion-icon>
                      </ion-button>
                    </ion-item>

                    <ion-item class="transparent">
                      <ion-label>
                        <h3>OBS (Open Build Service)</h3>

                        <p>Repositorio · openSUSE · Fedora</p>
                      </ion-label>

                      <ion-button slot="end" fill="clear" disabled>
                        <ion-icon :icon="downloadOutline"></ion-icon>
                      </ion-button>
                    </ion-item>

                    <ion-item class="transparent">
                      <ion-label>
                        <h3>Flathub</h3>

                        <p>Flatpak · sandboxeado</p>
                      </ion-label>

                      <ion-button slot="end" fill="clear" disabled>
                        <ion-icon :icon="downloadOutline"></ion-icon>
                      </ion-button>
                    </ion-item>

                    <ion-item class="transparent">
                      <ion-label>
                        <h3>AUR</h3>

                        <p>Arch Linux · paquete -bin</p>
                      </ion-label>

                      <ion-button slot="end" fill="clear" disabled>
                        <ion-icon :icon="downloadOutline"></ion-icon>
                      </ion-button>
                    </ion-item>
                  </div>
                </ion-accordion>

                <!-- Windows -->
                <ion-accordion value="windows">
                  <ion-item slot="header" lines="none" class="transparent">
                    <svg
                      slot="start"
                      class="brand-icon"
                      viewBox="0 0 24 24"
                      role="img"
                      aria-label="Windows"
                    >
                      <path
                      d="M0,3.449L9.75,2.1v9.451H0m10.949-9.602L21,2.1v9.451h-9.051M0,12.6h9.75v9.451L0,20.699M10.949,12.6H21v9.4l-10.051-1.4"
                      fill="#0078D4"
                      />
                    </svg>

                    <ion-label>
                      <h3>Windows</h3>

                      <p>Instalador · 64 bits</p>
                    </ion-label>

                    <ion-badge slot="end" color="medium">Próximamente</ion-badge>
                  </ion-item>

                  <div slot="content" class="ac-content">
                    <ion-item class="transparent">
                      <ion-label>
                        <h3>Instalador NSIS (.exe)</h3>

                        <p>Windows 10 y 11 · 64 bits</p>
                      </ion-label>

                      <ion-badge slot="end" color="medium">Próximamente</ion-badge>
                    </ion-item>

                    <ion-item class="transparent">
                      <ion-label>
                        <h3>Winget</h3>

                        <p>Instalación por terminal · sin cuenta</p>
                      </ion-label>

                      <ion-badge slot="end" color="medium">Próximamente</ion-badge>
                    </ion-item>

                    <ion-item class="transparent">
                      <ion-label>
                        <h3>Uptodown</h3>

                        <p>Descarga directa · sin cuenta</p>
                      </ion-label>

                      <ion-badge slot="end" color="medium">Próximamente</ion-badge>
                    </ion-item>
                  </div>
                </ion-accordion>

                <!-- macOS -->
                <ion-accordion value="macos">
                  <ion-item slot="header" lines="none" class="transparent">
                    <svg
                      slot="start"
                      class="brand-icon"
                      viewBox="0 0 24 24"
                      role="img"
                      aria-label="macOS"
                    >
                      <path
                      d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                      fill="#000000"
                      />
                    </svg>

                    <ion-label>
                      <h3>macOS</h3>

                      <p>Apple Silicon e Intel</p>
                    </ion-label>

                    <ion-badge slot="end" color="medium">Próximamente</ion-badge>
                  </ion-item>

                  <div slot="content" class="ac-content">
                    <ion-item class="transparent">
                      <ion-label>
                        <h3>Instalador (.dmg)</h3>

                        <p>macOS · Apple Silicon e Intel</p>
                      </ion-label>

                      <ion-button slot="end" fill="clear" disabled>
                        <ion-icon :icon="downloadOutline"></ion-icon>
                      </ion-button>
                    </ion-item>
                  </div>
                </ion-accordion>
              </ion-accordion-group>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// 1. Imports (ionic/vue/ionicons)
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonItem,
  IonLabel,
  IonCard,
  IonAccordionGroup,
  IonAccordion,
  IonIcon,
  IonButtons,
  IonMenuButton,
  IonBadge,
  IonButton,
} from '@ionic/vue';
import { desktopOutline, downloadOutline, globeOutline, phonePortraitOutline } from 'ionicons/icons';

// 2. Controllers / Composables

// 3. Components

// 4. Interface and types imports

// 5. Main (props, emits, etc.)

// 6. Vars and const
// End Vars

// 7. Watch

// 8. Computed

// 9. OnMounted

// 10. Functions
function openPwa() {
  // Install from wherever the app is currently served
  window.open(window.location.origin, '_blank', 'noopener');
}
// End Functions
</script>

<style>
.brand-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}
.ac-content {
  padding: 4px 16px 16px;
}
.ac-note {
  margin: 12px 0 0;
  font-size: 12px;
  font-style: italic;
  color: var(--ion-color-medium);
}
</style>
