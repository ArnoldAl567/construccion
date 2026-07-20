<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cargos', function (Blueprint $table): void {
            $table->id();
            $table->string('codigo', 40)->unique();
            $table->string('nombre', 90)->unique();
            $table->decimal('sueldo', 10, 2)->default(0);
            $table->string('estado', 20)->default('activo');
            $table->timestamps();
        });

        $now = now();
        foreach ([
            ['codigo' => 'ayudante', 'nombre' => 'Ayudante', 'sueldo' => 1800],
            ['codigo' => 'oficial', 'nombre' => 'Oficial', 'sueldo' => 2600],
            ['codigo' => 'operario', 'nombre' => 'Operario', 'sueldo' => 2200],
        ] as $cargo) {
            DB::table('cargos')->insert([
                ...$cargo,
                'estado' => 'activo',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('cargos');
    }
};
