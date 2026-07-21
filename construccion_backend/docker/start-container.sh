#!/usr/bin/env sh
set -eu

PORT="${PORT:-10000}"

sed -ri "s/^Listen [0-9]+$/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

if [ -z "${APP_KEY:-}" ]; then
    echo "APP_KEY no esta configurada. Genera una con: php artisan key:generate --show" >&2
    exit 1
fi

php artisan migrate --force
php artisan config:cache
php artisan view:cache

exec apache2-foreground
