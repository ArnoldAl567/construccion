<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            [$table, $constraint] = $this->postgresIdentifiers('ingresos', 'ingresos_estado_check');

            DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$constraint}");
        }

        DB::table('ingresos')
            ->whereNotIn('estado', ['pendiente', 'pagado'])
            ->update(['estado' => 'pendiente', 'updated_at' => now()]);

        if (DB::connection()->getDriverName() === 'pgsql') {
            [$table, $constraint] = $this->postgresIdentifiers('ingresos', 'ingresos_estado_check');

            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$constraint} CHECK (estado IN ('pendiente', 'pagado'))");
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            [$table, $constraint] = $this->postgresIdentifiers('ingresos', 'ingresos_estado_check');

            DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$constraint}");
        }
    }

    private function postgresIdentifiers(string $table, string $constraint): array
    {
        $prefix = DB::connection()->getTablePrefix();
        $quote = static fn (string $identifier): string => '"'.str_replace('"', '""', $identifier).'"';

        return [$quote($prefix.$table), $quote($prefix.$constraint)];
    }
};
