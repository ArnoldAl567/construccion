<?php

it('permite solicitudes desde el frontend configurado', function () {
    $this->withHeader('Origin', 'https://construct-control.vercel.app')
        ->get('/up')
        ->assertOk()
        ->assertHeader('Access-Control-Allow-Origin', 'https://construct-control.vercel.app');
});

it('no autoriza origenes que no estan configurados', function () {
    $this->withHeader('Origin', 'https://sitio-no-autorizado.example')
        ->get('/up')
        ->assertOk()
        ->assertHeader('Access-Control-Allow-Origin', 'https://construct-control.vercel.app');
});

it('responde las solicitudes preflight de la API', function () {
    $this->withHeaders([
        'Origin' => 'https://construct-control.vercel.app',
        'Access-Control-Request-Method' => 'POST',
    ])->options('/api/v1/autenticacion/iniciar-sesion')
        ->assertNoContent()
        ->assertHeader('Access-Control-Allow-Origin', 'https://construct-control.vercel.app')
        ->assertHeader('Access-Control-Allow-Methods', 'POST');
});
