<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('usuarios', function (Blueprint $table): void {
            $table->string('usuario', 80)->nullable()->unique()->after('nombre');
        });

        $usados = [];
        DB::table('usuarios')->orderBy('id')->get(['id', 'email'])->each(function ($registro) use (&$usados): void {
            $base = $registro->email
                ? Str::lower(Str::before($registro->email, '@'))
                : 'usuario'.$registro->id;
            $base = preg_replace('/[^a-z0-9._-]/', '', $base) ?: 'usuario'.$registro->id;
            $usuario = $base;
            $sufijo = 1;

            while (isset($usados[$usuario])) {
                $usuario = $base.$sufijo;
                $sufijo++;
            }

            $usados[$usuario] = true;
            DB::table('usuarios')->where('id', $registro->id)->update(['usuario' => $usuario]);
        });

        Schema::table('usuarios', function (Blueprint $table): void {
            $table->string('usuario', 80)->nullable(false)->change();
            $table->string('email', 160)->nullable()->change();
        });
    }

    public function down(): void
    {
        DB::table('usuarios')->whereNull('email')->orderBy('id')->get(['id', 'usuario'])->each(function ($registro): void {
            DB::table('usuarios')->where('id', $registro->id)->update([
                'email' => $registro->usuario.'@sin-correo.local',
            ]);
        });

        Schema::table('usuarios', function (Blueprint $table): void {
            $table->string('email', 160)->nullable(false)->change();
            $table->dropUnique(['usuario']);
            $table->dropColumn('usuario');
        });
    }
};
