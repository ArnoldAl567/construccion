<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('planillas')
            ->whereIn('estado', ['Pagada', 'Pagado', 'Aprobada', 'Aprobado'])
            ->update(['estado' => 'Pagada', 'updated_at' => now()]);

        DB::table('planillas')
            ->whereNotIn('estado', ['Pagada'])
            ->update(['estado' => 'Pendiente', 'updated_at' => now()]);
    }

    public function down(): void
    {
        DB::table('planillas')->where('estado', 'Pagada')->update(['estado' => 'Pagada', 'updated_at' => now()]);
        DB::table('planillas')->where('estado', 'Pendiente')->update(['estado' => 'Pendiente', 'updated_at' => now()]);
    }
};
