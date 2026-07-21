<?php

it('expone el estado publico del servidor', function (): void {
    $this->getJson('/api/v1/salud')
        ->assertOk()
        ->assertJson([
            'estado' => 'activo',
            'servicio' => 'ConstructControl API',
        ]);
});
