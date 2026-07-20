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
            ->each(fn ($fila) => $this->renumerarObra((int) $fila->obra_id));
    }

    public function down(): void
    {
        DB::table('planillas')
            ->orderBy('id')
            ->get(['id', 'fecha_inicio', 'fecha_fin'])
            ->each(function ($planilla): void {
                $inicio = Carbon::parse($planilla->fecha_inicio);
                $fin = Carbon::parse($planilla->fecha_fin);

                DB::table('planillas')->where('id', $planilla->id)->update([
                    'periodo' => $this->periodoCalendario($inicio, $fin),
                    'updated_at' => now(),
                ]);
            });
    }

    private function renumerarObra(int $obraId): void
    {
        DB::table('planillas')
            ->where('obra_id', $obraId)
            ->orderBy('fecha_inicio')
            ->orderBy('id')
            ->get(['id', 'fecha_inicio', 'fecha_fin'])
            ->each(function ($planilla, int $indice): void {
                $inicio = Carbon::parse($planilla->fecha_inicio);
                $fin = Carbon::parse($planilla->fecha_fin);

                DB::table('planillas')->where('id', $planilla->id)->update([
                    'periodo' => $this->periodoSecuencial($inicio, $fin, $indice + 1),
                    'updated_at' => now(),
                ]);
            });
    }

    private function periodoSecuencial(Carbon $inicio, Carbon $fin, int $numeroSemana): string
    {
        return 'Semana '.$numeroSemana.' - '.$this->rangoFechas($inicio, $fin);
    }

    private function periodoCalendario(Carbon $inicio, Carbon $fin): string
    {
        return 'Semana '.$inicio->isoWeek().' - '.$this->rangoFechas($inicio, $fin);
    }

    private function rangoFechas(Carbon $inicio, Carbon $fin): string
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

        return $inicio->format('d').'-'.$fin->format('d').' '.$meses[(int) $fin->format('n')].' '.$fin->format('Y');
    }
};
