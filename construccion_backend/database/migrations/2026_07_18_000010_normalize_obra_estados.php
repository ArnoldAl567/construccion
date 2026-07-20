<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('obras')
            ->where('estado', '!=', 'finalizada')
            ->update(['estado' => 'en_ejecucion']);
    }

    public function down(): void
    {
        // Los estados anteriores no pueden reconstruirse de forma confiable.
    }
};
