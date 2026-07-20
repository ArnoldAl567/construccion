<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DatosConstruccionController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credenciales = $request->validate([
            'correo' => ['required', 'string'],
            'contrasena' => ['required', 'string'],
        ]);

        return $this->ok([
            'id' => 1,
            'nombre' => 'Ing. Carlos Mendoza',
            'email' => $credenciales['correo'],
            'cargo' => 'Administrador',
            'foto' => 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format',
        ], 'Sesion iniciada correctamente.');
    }

    public function dashboard(): JsonResponse
    {
        $obras = DB::table('obras')->get();
        $totales = $this->totalesFinancierosObras();
        $presupuesto = (float) $obras->sum('presupuesto_aprobado');
        $ingresos = (float) $totales['ingresos']->sum();
        $gastos = (float) $totales['gastos']->sum() + (float) $totales['planillas']->sum();
        $ganancia = $presupuesto + $ingresos - $gastos;
        $baseMargen = $presupuesto + $ingresos;

        return $this->ok([
            'obrasActivas' => $obras->where('estado', 'en_ejecucion')->count(),
            'obrasFinalizadas' => $obras->where('estado', 'finalizada')->count(),
            'obrasRetrasadas' => $obras->where('estado', 'retrasada')->count(),
            'presupuesto' => $presupuesto,
            'ingresos' => $ingresos,
            'gastos' => $gastos,
            'ganancia' => $ganancia,
            'margen' => $baseMargen > 0 ? round(($ganancia / $baseMargen) * 100, 1) : 0,
            'trabajadoresActivos' => DB::table('trabajadores')->where('estado', 'activo')->count(),
            'stockBajo' => DB::table('materiales')->whereColumn('stock_actual', '<=', 'stock_minimo')->count(),
            'avance' => round((float) $obras->avg('porcentaje_avance'), 1),
        ]);
    }

    public function obras(): JsonResponse
    {
        $totales = $this->totalesFinancierosObras();

        $obras = DB::table('obras')
            ->join('clientes', 'clientes.id', '=', 'obras.cliente_id')
            ->join('usuarios', 'usuarios.id', '=', 'obras.responsable_id')
            ->select('obras.*', 'clientes.razon_social as cliente', 'usuarios.nombre as responsable')
            ->orderBy('obras.codigo')
            ->get()
            ->map(function ($obra) use ($totales) {
                $ingresos = $this->totalObra($totales['ingresos'], (int) $obra->id);
                $gastos = $this->totalObra($totales['gastos'], (int) $obra->id)
                    + $this->totalObra($totales['planillas'], (int) $obra->id);

                return [
                    'id' => $obra->id,
                    'codigo' => $obra->codigo,
                    'nombre' => $obra->nombre,
                    'cliente' => $obra->cliente,
                    'responsable' => $obra->responsable,
                    'ubicacion' => $obra->ubicacion,
                    'presupuesto' => (float) $obra->presupuesto_aprobado,
                    'ingresos' => $ingresos,
                    'gastos' => $gastos,
                    'avance' => (int) $obra->porcentaje_avance,
                    'estado' => $obra->estado,
                    'fechaInicio' => $obra->fecha_inicio,
                    'fechaFin' => $obra->fecha_fin_estimada,
                    'imagen' => $obra->imagen_portada,
                ];
            });

        return $this->ok($obras);
    }

    public function crearObra(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'codigo' => ['required', 'string', 'max:30', 'unique:obras,codigo'],
            'nombre' => ['required', 'string', 'max:180'],
            'cliente' => ['required', 'string', 'max:180', 'exists:clientes,razon_social'],
            'ubicacion' => ['required', 'string', 'max:220'],
            'presupuesto' => ['required', 'numeric', 'min:0'],
            'avance' => ['required', 'integer', 'min:0', 'max:100'],
            'estado' => ['required', Rule::in(['en_ejecucion', 'finalizada'])],
            'fechaInicio' => ['required', 'date'],
            'fechaFin' => ['required', 'date', 'after_or_equal:fechaInicio'],
        ]);

        $responsableId = DB::table('usuarios')->where('activo', true)->orderBy('id')->value('id');
        if (! $responsableId) {
            return $this->error('No existe un usuario activo para asignar internamente la obra.', 422);
        }

        return DB::transaction(function () use ($datos, $responsableId): JsonResponse {
            $clienteId = $this->resolverClienteObra($datos);

            DB::table('obras')->insert([
                'codigo' => $datos['codigo'],
                'nombre' => $datos['nombre'],
                'cliente_id' => $clienteId,
                'responsable_id' => $responsableId,
                'ubicacion' => $datos['ubicacion'],
                'presupuesto_aprobado' => $datos['presupuesto'],
                'ingresos_recibidos' => 0,
                'gastos_acumulados' => 0,
                'porcentaje_avance' => $datos['avance'],
                'estado' => $datos['estado'],
                'fecha_inicio' => $datos['fechaInicio'],
                'fecha_fin_estimada' => $datos['fechaFin'],
                'imagen_portada' => 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=900&h=520&fit=crop&auto=format',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $this->ok(null, 'Obra creada correctamente.', 201);
        });
    }

    public function actualizarObra(Request $request, int $id): JsonResponse
    {
        if (! DB::table('obras')->where('id', $id)->exists()) {
            return $this->error('Obra no encontrada.', 404);
        }

        $datos = $request->validate([
            'codigo' => ['required', 'string', 'max:30', Rule::unique('obras', 'codigo')->ignore($id)],
            'nombre' => ['required', 'string', 'max:180'],
            'cliente' => ['required', 'string', 'max:180', 'exists:clientes,razon_social'],
            'ubicacion' => ['required', 'string', 'max:220'],
            'presupuesto' => ['required', 'numeric', 'min:0'],
            'avance' => ['required', 'integer', 'min:0', 'max:100'],
            'estado' => ['required', Rule::in(['en_ejecucion', 'finalizada'])],
            'fechaInicio' => ['required', 'date'],
            'fechaFin' => ['required', 'date', 'after_or_equal:fechaInicio'],
        ]);

        DB::transaction(function () use ($datos, $id): void {
            $clienteId = $this->resolverClienteObra($datos);
            DB::table('obras')->where('id', $id)->update([
                'codigo' => $datos['codigo'],
                'nombre' => $datos['nombre'],
                'cliente_id' => $clienteId,
                'ubicacion' => $datos['ubicacion'],
                'presupuesto_aprobado' => $datos['presupuesto'],
                'porcentaje_avance' => $datos['avance'],
                'estado' => $datos['estado'],
                'fecha_inicio' => $datos['fechaInicio'],
                'fecha_fin_estimada' => $datos['fechaFin'],
                'updated_at' => now(),
            ]);
        });

        return $this->ok(null, 'Obra actualizada correctamente.');
    }

    public function actualizarEstadoObra(Request $request, int $id): JsonResponse
    {
        if (! DB::table('obras')->where('id', $id)->exists()) {
            return $this->error('Obra no encontrada.', 404);
        }

        $datos = $request->validate([
            'estado' => ['required', Rule::in(['en_ejecucion', 'finalizada'])],
        ]);

        DB::table('obras')->where('id', $id)->update([
            'estado' => $datos['estado'],
            'updated_at' => now(),
        ]);

        return $this->ok(null, 'Estado de la obra actualizado correctamente.');
    }

    public function eliminarObra(int $id): JsonResponse
    {
        if (! DB::table('obras')->where('id', $id)->exists()) {
            return $this->error('Obra no encontrada.', 404);
        }

        $relaciones = [
            'planillas' => DB::table('planillas')->where('obra_id', $id)->count(),
            'gastos' => DB::table('gastos')->where('obra_id', $id)->count(),
            'ingresos' => DB::table('ingresos')->where('obra_id', $id)->count(),
        ];

        if (array_sum($relaciones) > 0) {
            return $this->error('Esta obra tiene planillas, gastos o ingresos asociados y no puede eliminarse. Marquela como Finalizada para conservar su historial.', 409);
        }

        DB::table('obras')->where('id', $id)->delete();

        return $this->ok(null, 'Obra eliminada correctamente.');
    }

    public function trabajadores(): JsonResponse
    {
        $trabajadores = DB::table('trabajadores')
            ->orderBy('apellidos')
            ->orderBy('nombres')
            ->get()
            ->map(fn ($trabajador) => [
                'id' => $trabajador->id,
                'nombres' => $trabajador->nombres,
                'apellidos' => $trabajador->apellidos,
                'dni' => $trabajador->dni,
                'cargo' => $trabajador->cargo,
                'sueldo' => (float) $trabajador->sueldo,
                'estado' => $trabajador->estado,
            ]);

        return $this->ok($trabajadores);
    }

    public function cargos(): JsonResponse
    {
        return $this->ok(DB::table('cargos')
            ->orderBy('nombre')
            ->get()
            ->map(fn ($cargo) => [
                'id' => $cargo->id,
                'codigo' => $cargo->codigo,
                'nombre' => $cargo->nombre,
                'sueldo' => (float) $cargo->sueldo,
                'estado' => $cargo->estado,
            ]));
    }

    public function crearCargo(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'nombre' => ['required', 'string', 'max:90', 'unique:cargos,nombre'],
            'sueldo' => ['required', 'numeric', 'min:0'],
            'estado' => ['required', Rule::in(['activo', 'inactivo'])],
        ]);

        $codigo = $this->codigoCargo($datos['nombre']);

        if (DB::table('cargos')->where('codigo', $codigo)->exists()) {
            return $this->error('Ya existe un cargo con ese nombre.', 422);
        }

        DB::table('cargos')->insert([
            'codigo' => $codigo,
            'nombre' => $datos['nombre'],
            'sueldo' => $datos['sueldo'],
            'estado' => $datos['estado'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->ok(null, 'Cargo registrado correctamente.', 201);
    }

    public function actualizarCargo(Request $request, int $id): JsonResponse
    {
        $cargoActual = DB::table('cargos')->where('id', $id)->first();
        if (! $cargoActual) {
            return $this->error('Cargo no encontrado.', 404);
        }

        $datos = $request->validate([
            'nombre' => ['required', 'string', 'max:90', Rule::unique('cargos', 'nombre')->ignore($id)],
            'sueldo' => ['required', 'numeric', 'min:0'],
            'estado' => ['required', Rule::in(['activo', 'inactivo'])],
        ]);

        $codigo = $this->codigoCargo($datos['nombre']);
        $codigoOcupado = DB::table('cargos')->where('codigo', $codigo)->where('id', '<>', $id)->exists();
        if ($codigoOcupado) {
            return $this->error('Ya existe un cargo con ese nombre.', 422);
        }

        DB::transaction(function () use ($id, $cargoActual, $datos, $codigo): void {
            DB::table('cargos')->where('id', $id)->update([
                'codigo' => $codigo,
                'nombre' => $datos['nombre'],
                'sueldo' => $datos['sueldo'],
                'estado' => $datos['estado'],
                'updated_at' => now(),
            ]);

            if ($cargoActual->codigo !== $codigo) {
                DB::table('trabajadores')->where('cargo', $cargoActual->codigo)->update([
                    'cargo' => $codigo,
                    'sueldo' => $datos['sueldo'],
                    'updated_at' => now(),
                ]);
            } else {
                DB::table('trabajadores')->where('cargo', $codigo)->update([
                    'sueldo' => $datos['sueldo'],
                    'updated_at' => now(),
                ]);
            }
        });

        return $this->ok(null, 'Cargo actualizado correctamente.');
    }

    public function eliminarCargo(int $id): JsonResponse
    {
        $cargo = DB::table('cargos')->where('id', $id)->first();
        if (! $cargo) {
            return $this->error('Cargo no encontrado.', 404);
        }

        $enUso = DB::table('trabajadores')->where('cargo', $cargo->codigo)->exists();
        if ($enUso) {
            return $this->error('No se puede eliminar un cargo asignado a trabajadores.', 422);
        }

        DB::table('cargos')->where('id', $id)->delete();

        return $this->ok(null, 'Cargo eliminado correctamente.');
    }

    public function clientes(): JsonResponse
    {
        return $this->ok(DB::table('clientes')->orderBy('apellidos')->orderBy('nombres')->get()->map(fn ($cliente) => [
            'id' => $cliente->id,
            'nombres' => $cliente->nombres ?? '',
            'apellidos' => $cliente->apellidos ?? '',
            'telefono' => $cliente->telefono ?? '',
            'direccion' => $cliente->direccion ?? '',
            'estado' => $cliente->estado,
        ]));
    }

    public function crearCliente(Request $request): JsonResponse
    {
        $datos = $this->validarCliente($request);
        DB::table('clientes')->insert([
            'razon_social' => $datos['nombreCompleto'],
            'nombres' => $datos['nombres'],
            'apellidos' => $datos['apellidos'],
            'ruc' => null,
            'contacto' => null,
            'telefono' => $datos['telefono'],
            'direccion' => $datos['direccion'] ?? null,
            'estado' => $datos['estado'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->ok(null, 'Cliente registrado correctamente.', 201);
    }

    public function actualizarCliente(Request $request, int $id): JsonResponse
    {
        $cliente = DB::table('clientes')->where('id', $id)->first();
        if (! $cliente) {
            return $this->error('Cliente no encontrado.', 404);
        }

        $datos = $this->validarCliente($request, $id);
        DB::transaction(function () use ($cliente, $datos, $id): void {
            DB::table('clientes')->where('id', $id)->update([
                'razon_social' => $datos['nombreCompleto'],
                'nombres' => $datos['nombres'],
                'apellidos' => $datos['apellidos'],
                'telefono' => $datos['telefono'],
                'direccion' => $datos['direccion'] ?? null,
                'estado' => $datos['estado'],
                'updated_at' => now(),
            ]);
            if ($cliente->razon_social !== $datos['nombreCompleto']) {
                DB::table('ingresos')->where('cliente', $cliente->razon_social)->update([
                    'cliente' => $datos['nombreCompleto'],
                    'updated_at' => now(),
                ]);
            }
        });

        return $this->ok(null, 'Cliente actualizado correctamente.');
    }

    public function eliminarCliente(int $id): JsonResponse
    {
        $cliente = DB::table('clientes')->where('id', $id)->first();
        if (! $cliente) {
            return $this->error('Cliente no encontrado.', 404);
        }
        if (DB::table('obras')->where('cliente_id', $id)->exists() || DB::table('ingresos')->where('cliente', $cliente->razon_social)->exists()) {
            return $this->error('No se puede eliminar un cliente asociado a obras o ingresos. Puedes marcarlo como inactivo.', 422);
        }
        DB::table('clientes')->where('id', $id)->delete();

        return $this->ok(null, 'Cliente eliminado correctamente.');
    }

    public function categoriasGasto(): JsonResponse
    {
        return $this->ok(DB::table('categorias_gasto')->orderBy('nombre')->get());
    }

    public function crearCategoriaGasto(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'nombre' => ['required', 'string', 'max:90', 'unique:categorias_gasto,nombre'],
            'estado' => ['required', Rule::in(['activo', 'inactivo'])],
        ]);
        DB::table('categorias_gasto')->insert([...$datos, 'created_at' => now(), 'updated_at' => now()]);

        return $this->ok(null, 'Categoria de gasto registrada correctamente.', 201);
    }

    public function actualizarCategoriaGasto(Request $request, int $id): JsonResponse
    {
        $categoria = DB::table('categorias_gasto')->where('id', $id)->first();
        if (! $categoria) {
            return $this->error('Categoria de gasto no encontrada.', 404);
        }
        $datos = $request->validate([
            'nombre' => ['required', 'string', 'max:90', Rule::unique('categorias_gasto', 'nombre')->ignore($id)],
            'estado' => ['required', Rule::in(['activo', 'inactivo'])],
        ]);
        DB::transaction(function () use ($categoria, $datos, $id): void {
            DB::table('categorias_gasto')->where('id', $id)->update([...$datos, 'updated_at' => now()]);
            if ($categoria->nombre !== $datos['nombre']) {
                DB::table('gastos')->where('categoria', $categoria->nombre)->update(['categoria' => $datos['nombre'], 'updated_at' => now()]);
            }
        });

        return $this->ok(null, 'Categoria de gasto actualizada correctamente.');
    }

    public function eliminarCategoriaGasto(int $id): JsonResponse
    {
        $categoria = DB::table('categorias_gasto')->where('id', $id)->first();
        if (! $categoria) {
            return $this->error('Categoria de gasto no encontrada.', 404);
        }
        if (DB::table('gastos')->where('categoria', $categoria->nombre)->exists()) {
            return $this->error('No se puede eliminar una categoria que tiene gastos. Puedes marcarla como inactiva.', 422);
        }
        DB::table('categorias_gasto')->where('id', $id)->delete();

        return $this->ok(null, 'Categoria de gasto eliminada correctamente.');
    }

    public function tiposIngreso(): JsonResponse
    {
        return $this->ok(DB::table('tipos_ingreso')->orderBy('nombre')->get());
    }

    public function crearTipoIngreso(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'nombre' => ['required', 'string', 'max:80', 'unique:tipos_ingreso,nombre'],
            'estado' => ['required', Rule::in(['activo', 'inactivo'])],
        ]);
        DB::table('tipos_ingreso')->insert([...$datos, 'created_at' => now(), 'updated_at' => now()]);

        return $this->ok(null, 'Tipo de ingreso registrado correctamente.', 201);
    }

    public function actualizarTipoIngreso(Request $request, int $id): JsonResponse
    {
        $tipo = DB::table('tipos_ingreso')->where('id', $id)->first();
        if (! $tipo) {
            return $this->error('Tipo de ingreso no encontrado.', 404);
        }
        $datos = $request->validate([
            'nombre' => ['required', 'string', 'max:80', Rule::unique('tipos_ingreso', 'nombre')->ignore($id)],
            'estado' => ['required', Rule::in(['activo', 'inactivo'])],
        ]);
        DB::transaction(function () use ($tipo, $datos, $id): void {
            DB::table('tipos_ingreso')->where('id', $id)->update([...$datos, 'updated_at' => now()]);
            if ($tipo->nombre !== $datos['nombre']) {
                DB::table('ingresos')->where('tipo', $tipo->nombre)->update(['tipo' => $datos['nombre'], 'updated_at' => now()]);
            }
        });

        return $this->ok(null, 'Tipo de ingreso actualizado correctamente.');
    }

    public function eliminarTipoIngreso(int $id): JsonResponse
    {
        $tipo = DB::table('tipos_ingreso')->where('id', $id)->first();
        if (! $tipo) {
            return $this->error('Tipo de ingreso no encontrado.', 404);
        }
        if (DB::table('ingresos')->where('tipo', $tipo->nombre)->exists()) {
            return $this->error('No se puede eliminar un tipo que tiene ingresos. Puedes marcarlo como inactivo.', 422);
        }
        DB::table('tipos_ingreso')->where('id', $id)->delete();

        return $this->ok(null, 'Tipo de ingreso eliminado correctamente.');
    }

    public function crearTrabajador(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'nombres' => ['required', 'string', 'max:90'],
            'apellidos' => ['required', 'string', 'max:120'],
            'dni' => ['required', 'digits:8', 'unique:trabajadores,dni'],
            'cargo' => ['required', 'exists:cargos,codigo'],
            'estado' => ['required', Rule::in(['activo', 'inactivo'])],
        ]);

        $cargo = DB::table('cargos')->where('codigo', $datos['cargo'])->first();

        DB::table('trabajadores')->insert([
            'nombres' => $datos['nombres'],
            'apellidos' => $datos['apellidos'],
            'dni' => $datos['dni'],
            'cargo' => $datos['cargo'],
            'sueldo' => $cargo->sueldo,
            'estado' => $datos['estado'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->ok(null, 'Trabajador registrado correctamente.', 201);
    }

    public function actualizarTrabajador(Request $request, int $id): JsonResponse
    {
        if (! DB::table('trabajadores')->where('id', $id)->exists()) {
            return $this->error('Trabajador no encontrado.', 404);
        }

        $datos = $request->validate([
            'nombres' => ['required', 'string', 'max:90'],
            'apellidos' => ['required', 'string', 'max:120'],
            'dni' => ['required', 'digits:8', Rule::unique('trabajadores', 'dni')->ignore($id)],
            'cargo' => ['required', 'exists:cargos,codigo'],
            'estado' => ['required', Rule::in(['activo', 'inactivo'])],
        ]);

        $cargo = DB::table('cargos')->where('codigo', $datos['cargo'])->first();

        DB::table('trabajadores')->where('id', $id)->update([
            ...$datos,
            'sueldo' => $cargo->sueldo,
            'updated_at' => now(),
        ]);

        return $this->ok(null, 'Trabajador actualizado correctamente.');
    }

    public function actualizarEstadoTrabajador(Request $request, int $id): JsonResponse
    {
        if (! DB::table('trabajadores')->where('id', $id)->exists()) {
            return $this->error('Trabajador no encontrado.', 404);
        }

        $datos = $request->validate([
            'estado' => ['required', Rule::in(['activo', 'inactivo'])],
        ]);

        DB::table('trabajadores')->where('id', $id)->update([
            'estado' => $datos['estado'],
            'updated_at' => now(),
        ]);

        return $this->ok(null, 'Estado actualizado correctamente.');
    }

    public function eliminarTrabajador(int $id): JsonResponse
    {
        $eliminado = DB::table('trabajadores')->where('id', $id)->delete();

        if (! $eliminado) {
            return $this->error('Trabajador no encontrado.', 404);
        }

        return $this->ok(null, 'Trabajador eliminado correctamente.');
    }

    public function materiales(): JsonResponse
    {
        return $this->ok(DB::table('materiales')->orderBy('codigo')->get()->map(fn ($material) => [
            'id' => $material->id,
            'codigo' => $material->codigo,
            'nombre' => $material->nombre,
            'categoria' => $material->categoria,
            'unidad' => $material->unidad_medida,
            'stock' => (float) $material->stock_actual,
            'stockMin' => (float) $material->stock_minimo,
            'precioPromedio' => (float) $material->precio_promedio,
            'almacen' => $material->almacen,
        ]));
    }

    public function asistencias(): JsonResponse
    {
        return $this->ok(DB::table('asistencias')
            ->join('trabajadores', 'trabajadores.id', '=', 'asistencias.trabajador_id')
            ->select('asistencias.*', 'trabajadores.nombres', 'trabajadores.apellidos', 'trabajadores.cargo')
            ->orderBy('trabajadores.apellidos')
            ->get()
            ->map(fn ($asistencia) => [
                'id' => $asistencia->id,
                'trabajadorId' => $asistencia->trabajador_id,
                'trabajador' => trim($asistencia->nombres.' '.$asistencia->apellidos),
                'cargo' => $asistencia->cargo,
                'foto' => '',
                'obraId' => $asistencia->obra_id,
                'fecha' => $asistencia->fecha,
                'entrada' => $asistencia->hora_entrada ? substr($asistencia->hora_entrada, 0, 5) : null,
                'salida' => $asistencia->hora_salida ? substr($asistencia->hora_salida, 0, 5) : null,
                'estado' => $asistencia->estado,
                'horasNormales' => (float) $asistencia->horas_normales,
                'horasExtras' => (float) $asistencia->horas_extras,
                'observacion' => $asistencia->observacion,
            ]));
    }

    public function planillas(): JsonResponse
    {
        return $this->ok(DB::table('planillas')
            ->join('obras', 'obras.id', '=', 'planillas.obra_id')
            ->select('planillas.*', 'obras.nombre as obra')
            ->orderByDesc('planillas.fecha_inicio')
            ->get()
            ->map(fn ($planilla) => [
                'id' => $planilla->id,
                'periodo' => $planilla->periodo,
                'obraId' => $planilla->obra_id,
                'obra' => $planilla->obra,
                'trabajadores' => (int) $planilla->trabajadores,
                'total' => (float) $planilla->total,
                'estado' => $this->estadoPlanilla($planilla->estado),
                'fechaInicio' => (string) $planilla->fecha_inicio,
                'fechaFin' => (string) $planilla->fecha_fin,
            ]));
    }

    public function detallePlanilla(int $id): JsonResponse
    {
        $planilla = DB::table('planillas')
            ->join('obras', 'obras.id', '=', 'planillas.obra_id')
            ->select('planillas.*', 'obras.nombre as obra')
            ->where('planillas.id', $id)
            ->first();

        if (! $planilla) {
            return $this->error('Planilla no encontrada.', 404);
        }

        $detalles = DB::table('planilla_detalles')
            ->join('trabajadores', 'trabajadores.id', '=', 'planilla_detalles.trabajador_id')
            ->select('planilla_detalles.*', 'trabajadores.nombres', 'trabajadores.apellidos', 'trabajadores.cargo')
            ->where('planilla_detalles.planilla_id', $id)
            ->orderBy('trabajadores.apellidos')
            ->orderBy('trabajadores.nombres')
            ->get()
            ->map(fn ($detalle) => [
                'trabajadorId' => $detalle->trabajador_id,
                'trabajador' => trim($detalle->nombres.' '.$detalle->apellidos),
                'cargo' => $detalle->cargo,
                'diasTrabajados' => (float) $detalle->dias_trabajados,
                'horasExtras' => (float) ($detalle->horas_extras ?? 0),
                'sueldoBase' => (float) $detalle->sueldo_base,
                'pagoHorasExtras' => (float) ($detalle->pago_horas_extras ?? 0),
                'subtotal' => (float) $detalle->subtotal,
            ]);

        return $this->ok([
            'planilla' => [
                'id' => $planilla->id,
                'periodo' => $planilla->periodo,
                'obraId' => $planilla->obra_id,
                'obra' => $planilla->obra,
                'trabajadores' => (int) $planilla->trabajadores,
                'total' => (float) $planilla->total,
                'estado' => $this->estadoPlanilla($planilla->estado),
                'fechaInicio' => (string) $planilla->fecha_inicio,
                'fechaFin' => (string) $planilla->fecha_fin,
            ],
            'detalles' => $detalles,
        ]);
    }

    public function actualizarEstadoPlanilla(Request $request, int $id): JsonResponse
    {
        if (! DB::table('planillas')->where('id', $id)->exists()) {
            return $this->error('Planilla no encontrada.', 404);
        }

        $datos = $request->validate([
            'estado' => ['required', Rule::in(['Pendiente', 'Pagada'])],
        ]);

        DB::table('planillas')->where('id', $id)->update([
            'estado' => $datos['estado'],
            'updated_at' => now(),
        ]);

        return $this->ok(null, 'Estado de planilla actualizado correctamente.');
    }

    public function crearPlanilla(Request $request): JsonResponse
    {
        $calculada = $this->calcularPlanillaDesdeRequest($request);
        if ($calculada instanceof JsonResponse) {
            return $calculada;
        }

        DB::transaction(function () use ($calculada): void {
            $planillaId = DB::table('planillas')->insertGetId([
                'periodo' => $calculada['periodo'],
                'obra_id' => $calculada['datos']['obraId'],
                'trabajadores' => count($calculada['detalles']),
                'total' => $calculada['total'],
                'estado' => 'Pendiente',
                'fecha_inicio' => $calculada['inicio']->toDateString(),
                'fecha_fin' => $calculada['fin']->toDateString(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($calculada['detalles'] as $detalle) {
                DB::table('planilla_detalles')->insert([
                    ...$detalle,
                    'planilla_id' => $planillaId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $this->sincronizarPeriodosPlanillasObra((int) $calculada['datos']['obraId']);
        });

        return $this->ok(null, 'Planilla semanal generada correctamente.', 201);
    }

    public function actualizarPlanilla(Request $request, int $id): JsonResponse
    {
        $planilla = DB::table('planillas')->where('id', $id)->first();
        if (! $planilla) {
            return $this->error('Planilla no encontrada.', 404);
        }

        if ($this->estadoPlanilla($planilla->estado) !== 'Pendiente') {
            return $this->error('Solo se pueden editar planillas pendientes.', 422);
        }

        $calculada = $this->calcularPlanillaDesdeRequest($request);
        if ($calculada instanceof JsonResponse) {
            return $calculada;
        }

        DB::transaction(function () use ($id, $calculada, $planilla): void {
            DB::table('planillas')->where('id', $id)->update([
                'periodo' => $calculada['periodo'],
                'obra_id' => $calculada['datos']['obraId'],
                'trabajadores' => count($calculada['detalles']),
                'total' => $calculada['total'],
                'fecha_inicio' => $calculada['inicio']->toDateString(),
                'fecha_fin' => $calculada['fin']->toDateString(),
                'updated_at' => now(),
            ]);

            DB::table('planilla_detalles')->where('planilla_id', $id)->delete();
            foreach ($calculada['detalles'] as $detalle) {
                DB::table('planilla_detalles')->insert([
                    ...$detalle,
                    'planilla_id' => $id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $obraAnteriorId = (int) $planilla->obra_id;
            $obraNuevaId = (int) $calculada['datos']['obraId'];
            $this->sincronizarPeriodosPlanillasObra($obraNuevaId);
            if ($obraAnteriorId !== $obraNuevaId) {
                $this->sincronizarPeriodosPlanillasObra($obraAnteriorId);
            }
        });

        return $this->ok(null, 'Planilla actualizada correctamente.');
    }

    public function eliminarPlanilla(int $id): JsonResponse
    {
        $planilla = DB::table('planillas')->where('id', $id)->first();
        if (! $planilla) {
            return $this->error('Planilla no encontrada.', 404);
        }

        if ($this->estadoPlanilla($planilla->estado) !== 'Pendiente') {
            return $this->error('Solo se pueden eliminar planillas pendientes.', 422);
        }

        $obraId = (int) $planilla->obra_id;
        DB::table('planillas')->where('id', $id)->delete();
        $this->sincronizarPeriodosPlanillasObra($obraId);

        return $this->ok(null, 'Planilla eliminada correctamente.');
    }

    public function registrarCompra(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'materialId' => ['required', 'exists:materiales,id'],
            'cantidad' => ['required', 'numeric', 'min:1'],
            'precioUnitario' => ['required', 'numeric', 'min:0'],
        ]);

        $material = DB::table('materiales')->where('id', $datos['materialId'])->first();
        $nuevoPromedio = (((float) $material->precio_promedio) + (float) $datos['precioUnitario']) / 2;

        DB::table('materiales')->where('id', $datos['materialId'])->update([
            'stock_actual' => DB::raw('stock_actual + '.(float) $datos['cantidad']),
            'precio_promedio' => round($nuevoPromedio, 2),
            'updated_at' => now(),
        ]);

        return $this->ok(null, 'Compra registrada correctamente.');
    }

    public function gastos(): JsonResponse
    {
        return $this->ok(DB::table('gastos')->orderByDesc('fecha')->get()->map(fn ($gasto) => [
            'id' => $gasto->id,
            'obraId' => $gasto->obra_id,
            'categoria' => $gasto->categoria,
            'descripcion' => $gasto->descripcion,
            'monto' => (float) $gasto->monto,
            'fecha' => $gasto->fecha,
            'estado' => $gasto->estado,
        ]));
    }

    public function registrarGasto(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'obraId' => ['required', 'exists:obras,id'],
            'categoria' => ['required', 'string', 'max:90', 'exists:categorias_gasto,nombre'],
            'descripcion' => ['required', 'string', 'max:240'],
            'monto' => ['required', 'numeric', 'min:0.01'],
            'fecha' => ['required', 'date'],
            'estado' => ['required', Rule::in(['pendiente', 'pagado'])],
        ]);

        DB::transaction(function () use ($datos): void {
            DB::table('gastos')->insert([
                'obra_id' => $datos['obraId'],
                'categoria' => $datos['categoria'],
                'descripcion' => $datos['descripcion'],
                'monto' => $datos['monto'],
                'fecha' => $datos['fecha'],
                'estado' => $datos['estado'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('obras')->where('id', $datos['obraId'])->increment('gastos_acumulados', $datos['monto']);
        });

        return $this->ok(null, 'Gasto registrado correctamente.', 201);
    }

    public function actualizarGasto(Request $request, int $id): JsonResponse
    {
        $gasto = DB::table('gastos')->where('id', $id)->first();
        if (! $gasto) {
            return $this->error('Gasto no encontrado.', 404);
        }

        $datos = $request->validate([
            'obraId' => ['required', 'exists:obras,id'],
            'categoria' => ['required', 'string', 'max:90', 'exists:categorias_gasto,nombre'],
            'descripcion' => ['required', 'string', 'max:240'],
            'monto' => ['required', 'numeric', 'min:0.01'],
            'fecha' => ['required', 'date'],
            'estado' => ['required', Rule::in(['pendiente', 'pagado'])],
        ]);

        DB::transaction(function () use ($datos, $gasto, $id): void {
            DB::table('obras')->where('id', $gasto->obra_id)->decrement('gastos_acumulados', $gasto->monto);
            DB::table('gastos')->where('id', $id)->update([
                'obra_id' => $datos['obraId'],
                'categoria' => $datos['categoria'],
                'descripcion' => $datos['descripcion'],
                'monto' => $datos['monto'],
                'fecha' => $datos['fecha'],
                'estado' => $datos['estado'],
                'updated_at' => now(),
            ]);
            DB::table('obras')->where('id', $datos['obraId'])->increment('gastos_acumulados', $datos['monto']);
        });

        return $this->ok(null, 'Gasto actualizado correctamente.');
    }

    public function actualizarEstadoGasto(Request $request, int $id): JsonResponse
    {
        $datos = $request->validate([
            'estado' => ['required', Rule::in(['pendiente', 'pagado'])],
        ]);

        $actualizados = DB::table('gastos')->where('id', $id)->update([
            'estado' => $datos['estado'],
            'updated_at' => now(),
        ]);

        if (! $actualizados && ! DB::table('gastos')->where('id', $id)->exists()) {
            return $this->error('Gasto no encontrado.', 404);
        }

        return $this->ok(null, 'Estado del gasto actualizado correctamente.');
    }

    public function eliminarGasto(int $id): JsonResponse
    {
        $gasto = DB::table('gastos')->where('id', $id)->first();
        if (! $gasto) {
            return $this->error('Gasto no encontrado.', 404);
        }

        DB::transaction(function () use ($gasto, $id): void {
            DB::table('gastos')->where('id', $id)->delete();
            DB::table('obras')->where('id', $gasto->obra_id)->decrement('gastos_acumulados', $gasto->monto);
        });

        return $this->ok(null, 'Gasto eliminado correctamente.');
    }

    public function ingresos(): JsonResponse
    {
        return $this->ok(DB::table('ingresos')->orderByDesc('fecha')->get()->map(fn ($ingreso) => [
            'id' => $ingreso->id,
            'obraId' => $ingreso->obra_id,
            'cliente' => $ingreso->cliente,
            'tipo' => $ingreso->tipo,
            'monto' => (float) $ingreso->monto,
            'fecha' => $ingreso->fecha,
            'estado' => $ingreso->estado,
        ]));
    }

    public function registrarIngreso(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'obraId' => ['required', 'exists:obras,id'],
            'cliente' => ['required', 'string', 'max:180', 'exists:clientes,razon_social'],
            'tipo' => ['required', 'string', 'max:80', 'exists:tipos_ingreso,nombre'],
            'monto' => ['required', 'numeric', 'min:0'],
            'fecha' => ['required', 'date'],
            'estado' => ['required', Rule::in(['pendiente', 'pagado'])],
        ]);

        DB::transaction(function () use ($datos): void {
            DB::table('ingresos')->insert([
                'obra_id' => $datos['obraId'],
                'cliente' => $datos['cliente'],
                'tipo' => $datos['tipo'],
                'monto' => $datos['monto'],
                'fecha' => $datos['fecha'],
                'estado' => $datos['estado'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('obras')->where('id', $datos['obraId'])->increment('ingresos_recibidos', $datos['monto']);
        });

        return $this->ok(null, 'Ingreso registrado correctamente.', 201);
    }

    public function actualizarIngreso(Request $request, int $id): JsonResponse
    {
        $ingreso = DB::table('ingresos')->where('id', $id)->first();
        if (! $ingreso) {
            return $this->error('Ingreso no encontrado.', 404);
        }

        $datos = $request->validate([
            'obraId' => ['required', 'exists:obras,id'],
            'cliente' => ['required', 'string', 'max:180', 'exists:clientes,razon_social'],
            'tipo' => ['required', 'string', 'max:80', 'exists:tipos_ingreso,nombre'],
            'monto' => ['required', 'numeric', 'min:0'],
            'fecha' => ['required', 'date'],
            'estado' => ['required', Rule::in(['pendiente', 'pagado'])],
        ]);

        DB::transaction(function () use ($datos, $ingreso, $id): void {
            DB::table('obras')->where('id', $ingreso->obra_id)->decrement('ingresos_recibidos', $ingreso->monto);
            DB::table('ingresos')->where('id', $id)->update([
                'obra_id' => $datos['obraId'],
                'cliente' => $datos['cliente'],
                'tipo' => $datos['tipo'],
                'monto' => $datos['monto'],
                'fecha' => $datos['fecha'],
                'estado' => $datos['estado'],
                'updated_at' => now(),
            ]);
            DB::table('obras')->where('id', $datos['obraId'])->increment('ingresos_recibidos', $datos['monto']);
        });

        return $this->ok(null, 'Ingreso actualizado correctamente.');
    }

    public function actualizarEstadoIngreso(Request $request, int $id): JsonResponse
    {
        $datos = $request->validate([
            'estado' => ['required', Rule::in(['pendiente', 'pagado'])],
        ]);

        $actualizados = DB::table('ingresos')->where('id', $id)->update([
            'estado' => $datos['estado'],
            'updated_at' => now(),
        ]);

        if (! $actualizados && ! DB::table('ingresos')->where('id', $id)->exists()) {
            return $this->error('Ingreso no encontrado.', 404);
        }

        return $this->ok(null, 'Estado del ingreso actualizado correctamente.');
    }

    public function eliminarIngreso(int $id): JsonResponse
    {
        $ingreso = DB::table('ingresos')->where('id', $id)->first();
        if (! $ingreso) {
            return $this->error('Ingreso no encontrado.', 404);
        }

        DB::transaction(function () use ($ingreso, $id): void {
            DB::table('ingresos')->where('id', $id)->delete();
            DB::table('obras')->where('id', $ingreso->obra_id)->decrement('ingresos_recibidos', $ingreso->monto);
        });

        return $this->ok(null, 'Ingreso eliminado correctamente.');
    }

    public function maquinarias(): JsonResponse
    {
        return $this->ok(DB::table('maquinarias')->orderBy('codigo')->get()->map(fn ($maquinaria) => [
            'id' => $maquinaria->id,
            'codigo' => $maquinaria->codigo,
            'nombre' => $maquinaria->nombre,
            'tipo' => $maquinaria->tipo,
            'propiedad' => $maquinaria->propiedad,
            'obraId' => $maquinaria->obra_id,
            'responsable' => $maquinaria->responsable,
            'estado' => $maquinaria->estado,
            'horasUso' => (int) $maquinaria->horas_uso,
            'mantenimiento' => $maquinaria->fecha_mantenimiento,
        ]));
    }

    public function alertas(): JsonResponse
    {
        return $this->ok(DB::table('alertas_sistema')->orderByDesc('nueva')->orderBy('id')->get()->map(fn ($alerta) => [
            'tipo' => $alerta->tipo,
            'texto' => $alerta->texto,
            'tiempo' => $alerta->tiempo,
        ]));
    }

    public function graficoIngresosGastos(): JsonResponse
    {
        return $this->ok(DB::table('series_ingresos_gastos')->orderBy('orden')->get()->map(fn ($punto) => [
            'etiqueta' => $punto->etiqueta,
            'valorA' => (float) $punto->ingresos,
            'valorB' => (float) $punto->gastos,
        ]));
    }

    private function ok(mixed $datos, string $mensaje = 'Operacion correcta.', int $estado = 200): JsonResponse
    {
        return response()->json([
            'exito' => true,
            'mensaje' => $mensaje,
            'datos' => $datos,
            'errores' => null,
        ], $estado);
    }

    private function error(string $mensaje, int $estado): JsonResponse
    {
        return response()->json([
            'exito' => false,
            'mensaje' => $mensaje,
            'datos' => null,
            'errores' => [$mensaje],
        ], $estado);
    }

    private function resolverClienteObra(array $datos): int
    {
        return (int) DB::table('clientes')->where('razon_social', $datos['cliente'])->value('id');
    }

    private function validarCliente(Request $request, ?int $id = null): array
    {
        $datos = $request->validate([
            'nombres' => ['required', 'string', 'max:100'],
            'apellidos' => ['required', 'string', 'max:120'],
            'telefono' => ['required', 'string', 'max:20'],
            'direccion' => ['nullable', 'string', 'max:240'],
            'estado' => ['required', Rule::in(['activo', 'inactivo'])],
        ]);

        $datos['nombreCompleto'] = trim($datos['nombres'].' '.$datos['apellidos']);
        $consulta = DB::table('clientes')->where('razon_social', $datos['nombreCompleto']);
        if ($id !== null) {
            $consulta->where('id', '<>', $id);
        }
        if ($consulta->exists()) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'nombres' => ['Ya existe un cliente con estos nombres y apellidos.'],
            ]);
        }

        return $datos;
    }

    private function codigoCargo(string $nombre): string
    {
        $codigo = Str::slug($nombre, '_');

        return $codigo !== '' ? $codigo : 'cargo_'.Str::lower(Str::random(6));
    }

    private function calcularPlanillaDesdeRequest(Request $request): array|JsonResponse
    {
        $datos = $request->validate([
            'obraId' => ['required', 'exists:obras,id'],
            'fechaInicio' => ['required', 'date'],
            'fechaFin' => ['required', 'date', 'after_or_equal:fechaInicio'],
            'detalles' => ['required', 'array', 'min:1'],
            'detalles.*.trabajadorId' => ['required', 'distinct', 'exists:trabajadores,id'],
            'detalles.*.diasTrabajados' => ['required', 'numeric', 'min:0', 'max:8'],
            'detalles.*.horasExtras' => ['nullable', 'numeric', 'min:0', 'max:72'],
        ]);

        $inicio = Carbon::parse($datos['fechaInicio'])->startOfDay();
        $fin = Carbon::parse($datos['fechaFin'])->startOfDay();

        foreach ($datos['detalles'] as $detalle) {
            if ((float) $detalle['diasTrabajados'] <= 0 && (float) ($detalle['horasExtras'] ?? 0) <= 0) {
                return $this->error('Cada trabajador incluido debe tener dias trabajados u horas extras.', 422);
            }
        }

        $trabajadores = DB::table('trabajadores')
            ->whereIn('id', collect($datos['detalles'])->pluck('trabajadorId'))
            ->where('estado', 'activo')
            ->get()
            ->keyBy('id');

        if ($trabajadores->count() !== count($datos['detalles'])) {
            return $this->error('Solo se pueden incluir trabajadores activos en la planilla.', 422);
        }

        $total = 0;
        $detalles = [];

        foreach ($datos['detalles'] as $detalle) {
            $trabajador = $trabajadores[(int) $detalle['trabajadorId']];
            $diasTrabajados = (float) $detalle['diasTrabajados'];
            $horasExtras = (float) ($detalle['horasExtras'] ?? 0);
            $pagoHorasExtras = round((((float) $trabajador->sueldo) / 6 / 8) * $horasExtras, 2);
            $subtotal = round(((((float) $trabajador->sueldo) / 6) * $diasTrabajados) + $pagoHorasExtras, 2);
            $total += $subtotal;
            $detalles[] = [
                'trabajador_id' => $trabajador->id,
                'dias_trabajados' => $diasTrabajados,
                'horas_extras' => $horasExtras,
                'sueldo_base' => $trabajador->sueldo,
                'pago_horas_extras' => $pagoHorasExtras,
                'subtotal' => $subtotal,
            ];
        }

        return [
            'datos' => $datos,
            'inicio' => $inicio,
            'fin' => $fin,
            'periodo' => $this->periodoPlanilla($inicio, $fin, $this->numeroSemanaPlanillaObra((int) $datos['obraId'], $inicio)),
            'total' => $total,
            'detalles' => $detalles,
        ];
    }

    private function totalesFinancierosObras(): array
    {
        return [
            'ingresos' => DB::table('ingresos')
                ->select('obra_id', DB::raw('COALESCE(SUM(monto), 0) as total'))
                ->groupBy('obra_id')
                ->pluck('total', 'obra_id'),
            'gastos' => DB::table('gastos')
                ->select('obra_id', DB::raw('COALESCE(SUM(monto), 0) as total'))
                ->groupBy('obra_id')
                ->pluck('total', 'obra_id'),
            'planillas' => DB::table('planillas')
                ->select('obra_id', DB::raw('COALESCE(SUM(total), 0) as total'))
                ->groupBy('obra_id')
                ->pluck('total', 'obra_id'),
        ];
    }

    private function totalObra($totales, int $obraId): float
    {
        return (float) ($totales[$obraId] ?? 0);
    }

    private function sincronizarPeriodosPlanillasObra(int $obraId): void
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

            DB::table('planillas')->where('id', $planilla->id)->update([
                'periodo' => $this->periodoPlanilla(
                    $inicio,
                    $fin,
                    $this->numeroSemanaDesdeInicio($fechaBase, $inicio),
                ),
                'updated_at' => now(),
            ]);
        });
    }

    private function numeroSemanaPlanillaObra(int $obraId, Carbon $inicio): int
    {
        $primerInicio = DB::table('planillas')
            ->where('obra_id', $obraId)
            ->min('fecha_inicio');

        if (! $primerInicio) {
            return 1;
        }

        $fechaBase = Carbon::parse($primerInicio)->startOfDay();
        if ($inicio->lessThan($fechaBase)) {
            $fechaBase = $inicio->copy()->startOfDay();
        }

        return $this->numeroSemanaDesdeInicio($fechaBase, $inicio);
    }

    private function numeroSemanaDesdeInicio(Carbon $fechaBase, Carbon $inicio): int
    {
        $diasTranscurridos = max(0, $fechaBase->diffInDays($inicio, false));

        return (int) floor($diasTranscurridos / 7) + 1;
    }

    private function periodoPlanilla(Carbon $inicio, Carbon $fin, int $numeroSemana): string
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

        $mes = $meses[(int) $fin->format('n')];

        return 'Semana '.$numeroSemana.' - '.$inicio->format('d').'-'.$fin->format('d').' '.$mes.' '.$fin->format('Y');
    }

    private function estadoPlanilla(string $estado): string
    {
        return in_array(Str::lower($estado), ['pagada', 'pagado', 'aprobada', 'aprobado'], true) ? 'Pagada' : 'Pendiente';
    }
}
