<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE ingresos DROP CONSTRAINT IF EXISTS ingresos_estado_check');

        DB::table('ingresos')
            ->whereNotIn('estado', ['pendiente', 'pagado'])
            ->update(['estado' => 'pendiente', 'updated_at' => now()]);

        DB::statement("ALTER TABLE ingresos ADD CONSTRAINT ingresos_estado_check CHECK (estado IN ('pendiente', 'pagado'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE ingresos DROP CONSTRAINT IF EXISTS ingresos_estado_check');
    }
};
