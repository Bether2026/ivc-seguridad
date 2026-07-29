#!/bin/bash
# deploy.sh — IVC Seguridad
# Uso: bash deploy.sh "mensaje del commit"
# Actualiza el timestamp en sw.js para forzar recarga en todos los dispositivos,
# luego commitea y pushea index.html + sw.js juntos.

set -e

MSG="${1:-Deploy automático}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Actualizar LAST_BUILD en sw.js (fuerza reinstalación del SW en todos los dispositivos)
sed -i "s|// LAST_BUILD:.*|// LAST_BUILD: $TIMESTAMP|" sw.js

echo "✓ sw.js actualizado con timestamp: $TIMESTAMP"

git add index.html sw.js
git commit -m "$MSG"
git push

echo "✓ Deploy completado"
