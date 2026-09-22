# Production image for Render: PHP's own server behind Render's proxy, PostgreSQL client.
# (Local development still uses Sail — see compose.yaml — this file is deploy-only.)
FROM php:8.2-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev libzip-dev libpng-dev unzip git \
    && docker-php-ext-install pdo pdo_pgsql pgsql zip gd bcmath \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress \
    && chmod -R u+w storage bootstrap/cache

# Render sets $PORT; migrate is safe to run on every boot (already-applied migrations are skipped).
# Config/route caching happens here, at container start, so it picks up the real env vars Render injects.
# SEED_DEMO=true seeds the UCYSS demo programme once; turn it back off afterwards so a restart doesn't re-run it.
CMD php artisan migrate --force --no-interaction \
    && if [ "$SEED_DEMO" = "true" ]; then php artisan db:seed --force --no-interaction; fi \
    && php artisan config:cache \
    && php artisan route:cache \
    && php -S 0.0.0.0:${PORT:-10000} -t public
