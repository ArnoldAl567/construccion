<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gastos', function (Blueprint $table): void {
            if (Schema::hasColumn('gastos', 'responsable')) {
                $table->dropColumn('responsable');
            }
            if (Schema::hasColumn('gastos', 'comprobante')) {
                $table->dropColumn('comprobante');
            }
        });
    }

    public function down(): void
    {
        Schema::table('gastos', function (Blueprint $table): void {
            if (! Schema::hasColumn('gastos', 'responsable')) {
                $table->string('responsable', 120)->nullable();
            }
            if (! Schema::hasColumn('gastos', 'comprobante')) {
                $table->string('comprobante', 60)->nullable();
            }
        });
    }
};
