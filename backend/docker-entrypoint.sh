#!/bin/sh
# Arranque del contenedor de la API.
#
# En produccion /app/src/data es un volumen montado desde la VM. Docker no
# aplica el chown del Dockerfile al volumen: la carpeta llega con el dueno que
# tenga en el host (normalmente root), y el proceso, que corre como "node",
# no puede escribir en ella. Por eso fallaba la subida de imagenes de
# proyectos (y la de la foto y los CV).
#
# Este script arranca como root, deja la carpeta lista y con los permisos
# correctos, y luego lanza la API como el usuario sin privilegios "node".
set -eu

DATA_DIR=/app/src/data

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$DATA_DIR/projects/pending" "$DATA_DIR/cv"
  chown -R node:node "$DATA_DIR"
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

exec "$@"
