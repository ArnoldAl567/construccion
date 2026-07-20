<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clientes', function (Blueprint $table): void {
            $table->string('estado', 20)->default('activo');
        });

        Schema::create('categorias_gasto', function (Blueprint $table): void {
            $table->id();
            $table->string('nombre', 90)->unique();
            $table->string('estado', 20)->default('activo');
            $table->timestamps();
        });

        Schema::create('tipos_ingreso', function (Blueprint $table): void {
            $table->id();
            $table->string('nombre', 80)->unique();
            $table->string('estado', 20)->default('activo');
            $table->timestamps();
        });

        $now = now();
        $categorias = DB::table('gastos')->pluck('categoria')
            ->merge(['Materiales', 'Mano de obra', 'Servicios', 'Transporte', 'Equipos', 'Otros'])
            ->filter()
            ->unique();
        foreach ($categorias as $nombre) {
            DB::table('categorias_gasto')->insertOrIgnore([
                'nombre' => $nombre,
                'estado' => 'activo',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $tipos = DB::table('ingresos')->pluck('tipo')
            ->merge(['Valorizacion', 'Valorizacion mensual', 'Pago parcial por avance de obra', 'Adelanto de obra', 'Liquidacion final de contrato'])
            ->filter()
            ->unique();
        foreach ($tipos as $nombre) {
            DB::table('tipos_ingreso')->insertOrIgnore([
                'nombre' => $nombre,
                'estado' => 'activo',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tipos_ingreso');
        Schema::dropIfExists('categorias_gasto');
        Schema::table('clientes', function (Blueprint $table): void {
            $table->dropColumn('estado');
        });
    }
};
