FROM composer:2 AS vendor

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --optimize-autoloader \
    --prefer-dist

COPY . .
RUN composer dump-autoload --no-dev --optimize

FROM php:8.3-apache-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends libonig-dev libpq-dev \
    && docker-php-ext-install -j"$(nproc)" bcmath mbstring opcache pdo_pgsql pgsql \
    && a2enmod headers rewrite \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY --from=vendor --chown=www-data:www-data /app /var/www/html
COPY docker/apache-vhost.conf /etc/apache2/sites-available/000-default.conf
COPY docker/start-container.sh /usr/local/bin/start-container

RUN chmod +x /usr/local/bin/start-container \
    && mkdir -p \
        bootstrap/cache \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
    && chown -R www-data:www-data bootstrap/cache storage

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    PORT=10000

EXPOSE 10000

CMD ["start-container"]
