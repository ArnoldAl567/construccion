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
            $table->string('ruc', 11)->nullable()->change();
            $table->string('contacto', 120)->nullable()->change();
            $table->string('telefono', 20)->nullable()->change();
            $table->string('email', 160)->nullable()->change();
            $table->string('direccion', 240)->nullable()->change();
        });

        DB::table('clientes')->where('contacto', 'No registrado')->update(['contacto' => null]);
        DB::table('clientes')->where('telefono', 'No registrado')->update(['telefono' => null]);
        DB::table('clientes')->where('email', 'like', '%@sin-correo.local')->update(['email' => null]);
    }

    public function down(): void
    {
        DB::table('clientes')->whereNull('contacto')->update(['contacto' => 'Sin contacto']);
        DB::table('clientes')->whereNull('telefono')->update(['telefono' => '']);
        DB::table('clientes')->whereNull('email')->update(['email' => '']);
        DB::table('clientes')->whereNull('direccion')->update(['direccion' => '']);

        DB::table('clientes')->whereNull('ruc')->orderBy('id')->get(['id'])->each(function ($cliente): void {
            DB::table('clientes')->where('id', $cliente->id)->update([
                'ruc' => '900'.str_pad((string) $cliente->id, 8, '0', STR_PAD_LEFT),
            ]);
        });

        Schema::table('clientes', function (Blueprint $table): void {
            $table->string('ruc', 11)->nullable(false)->change();
            $table->string('contacto', 120)->nullable(false)->change();
            $table->string('telefono', 20)->nullable(false)->change();
            $table->string('email', 160)->nullable(false)->change();
            $table->string('direccion', 240)->nullable(false)->change();
        });
    }
};
