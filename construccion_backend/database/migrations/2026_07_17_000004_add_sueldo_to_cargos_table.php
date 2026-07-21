<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cargos', function (Blueprint $table): void {
            if (! Schema::hasColumn('cargos', 'sueldo')) {
                $table->decimal('sueldo', 10, 2)->default(0)->after('nombre');
            }
        });

        foreach ([
            'ayudante' => 1800,
            'oficial' => 2600,
            'operario' => 2200,
        ] as $codigo => $sueldo) {
            DB::table('cargos')->where('codigo', $codigo)->update([
                'sueldo' => $sueldo,
                'updated_at' => now(),
            ]);
        }

        DB::table('cargos')
            ->select(['codigo', 'sueldo'])
            ->get()
            ->each(function (object $cargo): void {
                DB::table('trabajadores')
                    ->where('cargo', $cargo->codigo)
                    ->update([
                        'sueldo' => $cargo->sueldo,
                        'updated_at' => now(),
                    ]);
            });
    }

    public function down(): void
    {
        Schema::table('cargos', function (Blueprint $table): void {
            if (Schema::hasColumn('cargos', 'sueldo')) {
                $table->dropColumn('sueldo');
            }
        });
    }
};
