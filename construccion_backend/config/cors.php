<?php

$allowedOrigins = array_map(
    fn (string $value): string => rtrim(trim($value), '/'),
    explode(',', (string) env(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:4200,http://127.0.0.1:4200'
    )),
);

return [
    'paths' => ['api/*', 'up'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_filter($allowedOrigins)),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 86400,
    'supports_credentials' => false,
];
