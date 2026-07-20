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
            $table->string('nombres', 100)->nullable();
            $table->string('apellidos', 120)->nullable();
        });

        DB::table('clientes')->orderBy('id')->get()->each(function ($cliente): void {
            $origen = trim((string) ($cliente->contacto ?: $cliente->razon_social));
            $partes = preg_split('/\s+/', $origen, 2) ?: [];
            $nombres = $partes[0] ?? $origen;
            $apellidos = $partes[1] ?? '';
            $nombreCompleto = trim($nombres.' '.$apellidos);

            DB::table('clientes')->where('id', $cliente->id)->update([
                'nombres' => $nombres,
                'apellidos' => $apellidos,
                'razon_social' => $nombreCompleto,
                'updated_at' => now(),
            ]);
            DB::table('ingresos')->where('cliente', $cliente->razon_social)->update([
                'cliente' => $nombreCompleto,
                'updated_at' => now(),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('clientes', function (Blueprint $table): void {
            $table->dropColumn(['nombres', 'apellidos']);
        });
    }
};
