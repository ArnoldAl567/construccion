<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('planilla_detalles', function (Blueprint $table): void {
            if (! Schema::hasColumn('planilla_detalles', 'horas_extras')) {
                $table->decimal('horas_extras', 6, 2)->default(0)->after('dias_trabajados');
            }
            if (! Schema::hasColumn('planilla_detalles', 'pago_horas_extras')) {
                $table->decimal('pago_horas_extras', 12, 2)->default(0)->after('sueldo_base');
            }
        });
    }

    public function down(): void
    {
        Schema::table('planilla_detalles', function (Blueprint $table): void {
            if (Schema::hasColumn('planilla_detalles', 'pago_horas_extras')) {
                $table->dropColumn('pago_horas_extras');
            }
            if (Schema::hasColumn('planilla_detalles', 'horas_extras')) {
                $table->dropColumn('horas_extras');
            }
        });
    }
};
