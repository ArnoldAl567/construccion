<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('gastos')
            ->whereNotIn('estado', ['pendiente', 'pagado'])
            ->update(['estado' => 'pendiente', 'updated_at' => now()]);

        DB::statement("ALTER TABLE gastos ADD CONSTRAINT gastos_estado_check CHECK (estado IN ('pendiente', 'pagado'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE gastos DROP CONSTRAINT IF EXISTS gastos_estado_check');
    }
};
