<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('trabajadores', 'nombres')) {
            Schema::table('trabajadores', function (Blueprint $table): void {
                $table->string('nombres', 90)->default('')->after('id');
            });
        }

        if (! Schema::hasColumn('trabajadores', 'apellidos')) {
            Schema::table('trabajadores', function (Blueprint $table): void {
                $table->string('apellidos', 120)->default('')->after('nombres');
            });
        }

        if (Schema::hasColumn('trabajadores', 'nombre')) {
            DB::table('trabajadores')->select('id', 'nombre')->orderBy('id')->get()->each(function ($trabajador): void {
                $partes = preg_split('/\s+/', trim($trabajador->nombre)) ?: [];
                $cantidad = count($partes);

                if ($cantidad <= 1) {
                    $nombres = $partes[0] ?? '';
                    $apellidos = '';
                } elseif ($cantidad === 2 || $cantidad === 3) {
                    $nombres = $partes[0];
                    $apellidos = implode(' ', array_slice($partes, 1));
                } else {
                    $nombres = implode(' ', array_slice($partes, 0, 2));
                    $apellidos = implode(' ', array_slice($partes, 2));
                }

                DB::table('trabajadores')->where('id', $trabajador->id)->update([
                    'nombres' => $nombres,
                    'apellidos' => $apellidos,
                ]);
            });
        }

        foreach (['maestro de obra' => 'oficial', 'almacenera' => 'ayudante', 'ingeniera residente' => 'oficial'] as $actual => $nuevo) {
            DB::table('trabajadores')->whereRaw('LOWER(cargo) = ?', [$actual])->update(['cargo' => $nuevo]);
        }

        DB::table('trabajadores')->whereRaw('LOWER(cargo) NOT IN (?, ?, ?)', ['ayudante', 'oficial', 'operario'])->update(['cargo' => 'operario']);
        DB::table('trabajadores')->update(['cargo' => DB::raw('LOWER(cargo)')]);
        DB::table('trabajadores')->where('sueldo', '<', 1000)->update(['sueldo' => DB::raw('sueldo * 24')]);

        if (Schema::hasColumn('trabajadores', 'obra_id')) {
            try {
                Schema::table('trabajadores', function (Blueprint $table): void {
                    $table->dropForeign(['obra_id']);
                });
            } catch (Throwable) {
                // Some local databases may already have the foreign key removed.
            }
        }

        $columnasAntiguas = array_values(array_filter(
            ['nombre', 'telefono', 'especialidad', 'obra_id', 'tipo_pago', 'fecha_ingreso', 'foto_url'],
            fn (string $columna): bool => Schema::hasColumn('trabajadores', $columna),
        ));

        if ($columnasAntiguas !== []) {
            Schema::table('trabajadores', function (Blueprint $table) use ($columnasAntiguas): void {
                $table->dropColumn($columnasAntiguas);
            });
        }
    }

    public function down(): void
    {
        Schema::table('trabajadores', function (Blueprint $table): void {
            if (! Schema::hasColumn('trabajadores', 'nombre')) {
                $table->string('nombre', 140)->default('');
            }
            if (! Schema::hasColumn('trabajadores', 'telefono')) {
                $table->string('telefono', 20)->default('');
            }
            if (! Schema::hasColumn('trabajadores', 'especialidad')) {
                $table->string('especialidad', 120)->default('');
            }
            if (! Schema::hasColumn('trabajadores', 'tipo_pago')) {
                $table->string('tipo_pago', 20)->default('Mensual');
            }
            if (! Schema::hasColumn('trabajadores', 'fecha_ingreso')) {
                $table->date('fecha_ingreso')->nullable();
            }
            if (! Schema::hasColumn('trabajadores', 'foto_url')) {
                $table->string('foto_url', 320)->nullable();
            }
        });

        DB::table('trabajadores')->select('id', 'nombres', 'apellidos')->orderBy('id')->get()->each(function ($trabajador): void {
            DB::table('trabajadores')->where('id', $trabajador->id)->update([
                'nombre' => trim($trabajador->nombres.' '.$trabajador->apellidos),
            ]);
        });
    }
};
