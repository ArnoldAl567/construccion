<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('planillas')
            ->select('obra_id')
            ->distinct()
            ->orderBy('obra_id')
            ->get()
            ->each(fn ($fila) => $this->renumerarObraConSemanasTranscurridas((int) $fila->obra_id));
    }

    public function down(): void
    {
        DB::table('planillas')
            ->select('obra_id')
            ->distinct()
            ->orderBy('obra_id')
            ->get()
            ->each(fn ($fila) => $this->renumerarObraSecuencial((int) $fila->obra_id));
    }

    private function renumerarObraConSemanasTranscurridas(int $obraId): void
    {
        $planillas = DB::table('planillas')
            ->where('obra_id', $obraId)
            ->orderBy('fecha_inicio')
            ->orderBy('id')
            ->get(['id', 'fecha_inicio', 'fecha_fin']);

        if ($planillas->isEmpty()) {
            return;
        }

        $fechaBase = Carbon::parse($planillas->first()->fecha_inicio)->startOfDay();

        $planillas->each(function ($planilla) use ($fechaBase): void {
            $inicio = Carbon::parse($planilla->fecha_inicio)->startOfDay();
            $fin = Carbon::parse($planilla->fecha_fin)->startOfDay();
            $numeroSemana = $this->numeroSemanaDesdeInicio($fechaBase, $inicio);

            DB::table('planillas')->where('id', $planilla->id)->update([
                'periodo' => $this->periodo($inicio, $fin, $numeroSemana),
                'updated_at' => now(),
            ]);
        });
    }

    private function renumerarObraSecuencial(int $obraId): void
    {
        DB::table('planillas')
            ->where('obra_id', $obraId)
            ->orderBy('fecha_inicio')
            ->orderBy('id')
            ->get(['id', 'fecha_inicio', 'fecha_fin'])
            ->each(function ($planilla, int $indice): void {
                DB::table('planillas')->where('id', $planilla->id)->update([
                    'periodo' => $this->periodo(
                        Carbon::parse($planilla->fecha_inicio),
                        Carbon::parse($planilla->fecha_fin),
                        $indice + 1,
                    ),
                    'updated_at' => now(),
                ]);
            });
    }

    private function numeroSemanaDesdeInicio(Carbon $fechaBase, Carbon $inicio): int
    {
        return (int) floor(max(0, $fechaBase->diffInDays($inicio, false)) / 7) + 1;
    }

    private function periodo(Carbon $inicio, Carbon $fin, int $numeroSemana): string
    {
        $meses = [
            1 => 'Ene',
            2 => 'Feb',
            3 => 'Mar',
            4 => 'Abr',
            5 => 'May',
            6 => 'Jun',
            7 => 'Jul',
            8 => 'Ago',
            9 => 'Sep',
            10 => 'Oct',
            11 => 'Nov',
            12 => 'Dic',
        ];

        return 'Semana '.$numeroSemana.' - '.$inicio->format('d').'-'.$fin->format('d').' '.$meses[(int) $fin->format('n')].' '.$fin->format('Y');
    }
};
