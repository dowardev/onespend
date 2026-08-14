#!/usr/bin/env bash

# SPDX-FileCopyrightText: 2026 DowarDev
#
# SPDX-License-Identifier: AGPL-3.0-only

set -euo pipefail

# build-rpm.sh
# Crea un paquete RPM a partir de la carpeta release/linux-unpacked generada por electron-builder.
# Este script asume que ya ejecutaste electron-builder y que la salida sin empaquetar
# está disponible en release/linux-unpacked.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Verificar build sin empaquetar de Electron
if [ ! -d "release/linux-unpacked" ]; then
  echo "❌ Error: 'release/linux-unpacked' no encontrado. Ejecuta primero el build con electron-builder."
  exit 1
fi

# Metadatos desde package.json
VERSION=$(node -p "require('./package.json').version")
PRODUCT_NAME=$(node -p "const p=require('./package.json'); p.build?.productName || p.name")
EXECUTABLE_NAME=$(node -p "const p=require('./package.json'); p.build?.linux?.executableName || p.build?.executableName || p.name")
APP_DIR="/opt/${PRODUCT_NAME}"

echo "🔧 Leyendo metadatos de package.json..."
echo " VERSION: $VERSION"
echo " PRODUCT_NAME: $PRODUCT_NAME"
echo " EXECUTABLE_NAME: $EXECUTABLE_NAME"
echo " APP_DIR: $APP_DIR"

# Preparar mappings de icono para fpm: instalar en hicolor (y fallback en pixmaps)
ICON_MAPPINGS=()
if [ -d "build/icons" ]; then
  # icon.png -> hicolor 256x256 y fallback pixmaps
  if [ -f "build/icons/icon.png" ]; then
    ICON_MAPPINGS+=("build/icons/icon.png=/usr/share/icons/hicolor/256x256/apps/${EXECUTABLE_NAME}.png")
    ICON_MAPPINGS+=("build/icons/icon.png=/usr/share/pixmaps/${EXECUTABLE_NAME}.png")
  fi
  # icon@2x.png -> hicolor 512x512
  if [ -f "build/icons/icon@2x.png" ]; then
    ICON_MAPPINGS+=("build/icons/icon@2x.png=/usr/share/icons/hicolor/512x512/apps/${EXECUTABLE_NAME}.png")
  fi
  if [ -f "build/icons/icon.ico" ]; then
    ICON_MAPPINGS+=("build/icons/icon.ico=/usr/share/pixmaps/${EXECUTABLE_NAME}.ico")
  fi
fi

RPM_NAME="${PRODUCT_NAME}-${VERSION}.x86_64.rpm"
RPM_PATH="release/${RPM_NAME}"

# Verificar que fpm esté instalado
if ! command -v fpm >/dev/null 2>&1; then
  echo "❌ Error: 'fpm' no encontrado. Instala fpm (gem install fpm) para continuar."
  exit 1
fi

# Crear scripts temporales para postinstall/preremove que gestionan el enlace en /usr/bin
POSTINST="/tmp/${EXECUTABLE_NAME}.postinst"
PREREM="/tmp/${EXECUTABLE_NAME}.prerem"

# Los scripts se generan más abajo una vez que determinemos el nombre real del binario dentro de APP_DIR

# Crear un staging directory para controlar el layout final del RPM
STAGING="$(mktemp -d)"
echo "🧰 Creando staging en ${STAGING}..."
mkdir -p "${STAGING}${APP_DIR}"
cp -r release/linux-unpacked/* "${STAGING}${APP_DIR}/"

# Detectar el ejecutable real dentro del APP_DIR (preferir EXECUTABLE_NAME si existe)
BINARY_NAME=""
if [ -x "${STAGING}${APP_DIR}/${EXECUTABLE_NAME}" ]; then
  BINARY_NAME="${EXECUTABLE_NAME}"
else
  # Buscar archivos ejecutables en el directorio raíz de la app
  # Priorizar binarios grandes (>1MB) y excluir libs y ficheros chromium auxiliares
  BINARY_NAME=$(find "${STAGING}${APP_DIR}" -maxdepth 1 -type f -executable -printf '%s %f\n' \
    | awk '$1>1000000{print $2; exit}' || true)
  if [ -z "${BINARY_NAME}" ]; then
    # Fallback: primer ejecutable que no parezca una librería ni un helper de chromium
    BINARY_NAME=$(find "${STAGING}${APP_DIR}" -maxdepth 1 -type f -executable -printf '%f\n' \
      | grep -Ev '^lib|^chrome|\.so$' | head -n1 || true)
  fi
fi

if [ -z "${BINARY_NAME}" ]; then
  echo "❌ No se pudo detectar un ejecutable en ${APP_DIR}. Asegúrate de que release/linux-unpacked contiene el binario."
  rm -rf "${STAGING}"
  exit 1
fi

echo "🔎 Ejecutable detectado dentro de la app: ${BINARY_NAME}"

# Generar archivo .desktop dentro del staging para que fpm lo incluya correctamente
mkdir -p "${STAGING}/usr/share/applications"
cat >"${STAGING}/usr/share/applications/${EXECUTABLE_NAME}.desktop" <<EOF
[Desktop Entry]
Name=${PRODUCT_NAME}
Exec=${APP_DIR}/${BINARY_NAME}
TryExec=${APP_DIR}/${BINARY_NAME}
Terminal=false
StartupNotify=false
Type=Application
Categories=Utility;
Icon=${EXECUTABLE_NAME}
EOF

# Validar .desktop si existe desktop-file-validate
if command -v desktop-file-validate >/dev/null 2>&1; then
  echo "🔧 Validando .desktop..."
  if ! desktop-file-validate "${STAGING}/usr/share/applications/${EXECUTABLE_NAME}.desktop"; then
    echo "❌ desktop-file-validate falló para ${EXECUTABLE_NAME}.desktop"
    rm -rf "${STAGING}"
    exit 1
  fi
fi

# Copiar iconos al staging en sus rutas finales
mkdir -p "${STAGING}/usr/share/pixmaps"
if [ -f "build/icons/icon.png" ]; then
  mkdir -p "${STAGING}/usr/share/icons/hicolor/256x256/apps"
  cp "build/icons/icon.png" "${STAGING}/usr/share/icons/hicolor/256x256/apps/${EXECUTABLE_NAME}.png"
  cp "build/icons/icon.png" "${STAGING}/usr/share/pixmaps/${EXECUTABLE_NAME}.png"
fi
if [ -f "build/icons/icon@2x.png" ]; then
  mkdir -p "${STAGING}/usr/share/icons/hicolor/512x512/apps"
  cp "build/icons/icon@2x.png" "${STAGING}/usr/share/icons/hicolor/512x512/apps/${EXECUTABLE_NAME}.png"
fi
if [ -f "build/icons/icon.ico" ]; then
  cp "build/icons/icon.ico" "${STAGING}/usr/share/pixmaps/${EXECUTABLE_NAME}.ico"
fi

# Ahora que conocemos BINARY_NAME, generamos los scripts postinst/prerem dinámicamente
cat >"${POSTINST}" <<SH
#!/bin/sh
set -e
APP_DIR="${APP_DIR}"
EXECUTABLE_NAME="${EXECUTABLE_NAME}"
BINARY_NAME="${BINARY_NAME}"

# Create symlink only if executable exists and BINARY_NAME is set
if [ -n "${BINARY_NAME}" ] && [ -x "${APP_DIR}/${BINARY_NAME}" ]; then
  ln -sf "${APP_DIR}/${BINARY_NAME}" "/usr/bin/${EXECUTABLE_NAME}"
fi

# Update desktop database if available
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database /usr/share/applications >/dev/null 2>&1 || true
fi

# Update GTK icon cache for hicolor icons if available
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f /usr/share/icons/hicolor >/dev/null 2>&1 || true
fi

# Trigger KDE to rebuild its cache if available
if command -v kbuildsycoca5 >/dev/null 2>&1; then
  kbuildsycoca5 --noincremental >/dev/null 2>&1 || true
fi
SH
chmod +x "${POSTINST}"

cat >"${PREREM}" <<SH
#!/bin/sh
set -e
APP_DIR="${APP_DIR}"
EXECUTABLE_NAME="${EXECUTABLE_NAME}"

# Safety: don't remove root or /usr/bin when EXECUTABLE_NAME is empty
if [ -n "${EXECUTABLE_NAME}" ] && [ "${EXECUTABLE_NAME}" != "/" ]; then
  rm -f "/usr/bin/${EXECUTABLE_NAME}"
fi

# Remove desktop file if present
if [ -n "${EXECUTABLE_NAME}" ]; then
  rm -f "/usr/share/applications/${EXECUTABLE_NAME}.desktop" || true
  rm -f "${HOME}/.local/share/applications/${EXECUTABLE_NAME}.desktop" || true
fi

# Remove icons installed to hicolor and pixmaps
if [ -n "${EXECUTABLE_NAME}" ]; then
  find /usr/share/icons/hicolor -type f -name "${EXECUTABLE_NAME}.*" -delete || true
  rm -f "/usr/share/pixmaps/${EXECUTABLE_NAME}.png" || true
  rm -f "/usr/share/pixmaps/${EXECUTABLE_NAME}.ico" || true
fi

# Update desktop database if available
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database /usr/share/applications >/dev/null 2>&1 || true
fi

# Update GTK icon cache for hicolor icons if available
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f /usr/share/icons/hicolor >/dev/null 2>&1 || true
fi

# Trigger KDE to rebuild its cache if available
if command -v kbuildsycoca5 >/dev/null 2>&1; then
  kbuildsycoca5 --noincremental >/dev/null 2>&1 || true
fi
SH
chmod +x "${PREREM}"

# Si ya existe un RPM previo, eliminarlo para evitar que fpm falle con "File already exists".
if [ -f "${RPM_PATH}" ]; then
  echo "⚠️  ${RPM_PATH} ya existe — eliminando antes de crear uno nuevo"
  rm -f "${RPM_PATH}" || true
fi

# Crear RPM con fpm desde el staging (incluyendo scripts para postinst/prerem)
fpm -s dir -t rpm \
  -n "${PRODUCT_NAME}" \
  -v "${VERSION}" \
  --description "${PRODUCT_NAME}" \
  --license "GPL-3.0-or-later" \
  -d gtk3 -d libnotify -d nss -d libXScrnSaver -d libXtst -d xdg-utils -d at-spi2-core -d libuuid \
  --rpm-os linux \
  --force \
  --package "${RPM_PATH}" \
  --after-install "${POSTINST}" \
  --before-remove "${PREREM}" \
  -C "${STAGING}" \
  ./=/

# Limpiar staging
rm -rf "${STAGING}"

# Limpiar scripts temporales
rm -f "${POSTINST}" "${PREREM}"

echo "✅ RPM creado: ${RPM_PATH}"

