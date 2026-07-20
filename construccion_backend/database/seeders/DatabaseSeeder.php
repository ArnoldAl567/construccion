<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        DB::transaction(function () use ($now): void {
            DB::statement('TRUNCATE TABLE series_ingresos_gastos, alertas_sistema, maquinarias, ingresos, gastos, tipos_ingreso, categorias_gasto, materiales, planillas, asistencias, trabajadores, cargos, obras, clientes, rol_usuario, usuarios, permiso_rol, permisos, roles RESTART IDENTITY CASCADE');

            $roles = [
                ['nombre' => 'Administrador', 'descripcion' => 'Control total del sistema y configuracion general.'],
                ['nombre' => 'Ingeniero residente', 'descripcion' => 'Gestion operativa de obras asignadas.'],
                ['nombre' => 'Jefe de almacen', 'descripcion' => 'Control de materiales, entradas y salidas.'],
                ['nombre' => 'Contabilidad', 'descripcion' => 'Gestion de ingresos, gastos y planillas.'],
            ];

            foreach ($roles as $rol) {
                DB::table('roles')->insertOrIgnore([...$rol, 'created_at' => $now, 'updated_at' => $now]);
            }

            $permisos = [
                ['codigo' => 'dashboard.ver', 'descripcion' => 'Ver dashboard ejecutivo.'],
                ['codigo' => 'obras.gestionar', 'descripcion' => 'Crear y actualizar obras.'],
                ['codigo' => 'trabajadores.gestionar', 'descripcion' => 'Administrar trabajadores y asignaciones.'],
                ['codigo' => 'finanzas.gestionar', 'descripcion' => 'Administrar ingresos, gastos y presupuestos.'],
                ['codigo' => 'almacen.gestionar', 'descripcion' => 'Administrar materiales y almacenes.'],
                ['codigo' => 'reportes.ver', 'descripcion' => 'Consultar reportes gerenciales.'],
            ];

            foreach ($permisos as $permiso) {
                DB::table('permisos')->insertOrIgnore([...$permiso, 'created_at' => $now, 'updated_at' => $now]);
            }

            $usuarios = [
                [
                    'nombre' => 'Ing. Carlos Mendoza Salazar',
                    'email' => 'carlos.mendoza@constructcontrol.pe',
                    'password' => Hash::make('Admin123*'),
                    'cargo' => 'Gerente de operaciones',
                    'telefono' => '987654210',
                    'foto_url' => 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format',
                    'activo' => true,
                ],
                [
                    'nombre' => 'Ing. Ana Lucia Quispe Rojas',
                    'email' => 'ana.quispe@constructcontrol.pe',
                    'password' => Hash::make('Residente123*'),
                    'cargo' => 'Ingeniera residente',
                    'telefono' => '976542318',
                    'foto_url' => 'https://images.unsplash.com/photo-1494790108755-2616b612b51c?w=80&h=80&fit=crop&auto=format',
                    'activo' => true,
                ],
                [
                    'nombre' => 'Ing. Roberto Huanca Flores',
                    'email' => 'roberto.huanca@constructcontrol.pe',
                    'password' => Hash::make('Residente123*'),
                    'cargo' => 'Ingeniero residente',
                    'telefono' => '965431287',
                    'foto_url' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format',
                    'activo' => true,
                ],
                [
                    'nombre' => 'Mariela Torres Valdivia',
                    'email' => 'mariela.torres@constructcontrol.pe',
                    'password' => Hash::make('Almacen123*'),
                    'cargo' => 'Jefa de almacen central',
                    'telefono' => '954328176',
                    'foto_url' => 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format',
                    'activo' => true,
                ],
            ];

            foreach ($usuarios as $usuario) {
                DB::table('usuarios')->insertOrIgnore([...$usuario, 'created_at' => $now, 'updated_at' => $now]);
            }

            $administradorId = DB::table('roles')->where('nombre', 'Administrador')->value('id');
            $residenteId = DB::table('roles')->where('nombre', 'Ingeniero residente')->value('id');
            $almacenId = DB::table('roles')->where('nombre', 'Jefe de almacen')->value('id');
            $contadorId = DB::table('roles')->where('nombre', 'Contabilidad')->value('id');

            foreach (DB::table('permisos')->pluck('id') as $permisoId) {
                DB::table('permiso_rol')->insertOrIgnore(['rol_id' => $administradorId, 'permiso_id' => $permisoId]);
            }

            foreach ([
                [$residenteId, 'dashboard.ver'], [$residenteId, 'obras.gestionar'], [$residenteId, 'trabajadores.gestionar'], [$residenteId, 'reportes.ver'],
                [$almacenId, 'dashboard.ver'], [$almacenId, 'almacen.gestionar'],
                [$contadorId, 'dashboard.ver'], [$contadorId, 'finanzas.gestionar'], [$contadorId, 'reportes.ver'],
            ] as [$rolId, $codigo]) {
                DB::table('permiso_rol')->insertOrIgnore([
                    'rol_id' => $rolId,
                    'permiso_id' => DB::table('permisos')->where('codigo', $codigo)->value('id'),
                ]);
            }

            foreach ([
                ['carlos.mendoza@constructcontrol.pe', $administradorId],
                ['ana.quispe@constructcontrol.pe', $residenteId],
                ['roberto.huanca@constructcontrol.pe', $residenteId],
                ['mariela.torres@constructcontrol.pe', $almacenId],
            ] as [$email, $rolId]) {
                DB::table('rol_usuario')->insertOrIgnore([
                    'usuario_id' => DB::table('usuarios')->where('email', $email)->value('id'),
                    'rol_id' => $rolId,
                ]);
            }

            $clientes = [
                ['razon_social' => 'Veronica Alcantara', 'nombres' => 'Veronica', 'apellidos' => 'Alcantara', 'ruc' => null, 'contacto' => null, 'telefono' => '014426780', 'email' => null, 'direccion' => 'Av. Jose Pardo 620, Miraflores, Lima'],
                ['razon_social' => 'Martin Villanueva', 'nombres' => 'Martin', 'apellidos' => 'Villanueva', 'ruc' => null, 'contacto' => null, 'telefono' => '017254910', 'email' => null, 'direccion' => 'Av. Tomas Valle 1220, Los Olivos, Lima'],
                ['razon_social' => 'Mariana Ruiz Mendoza', 'nombres' => 'Mariana', 'apellidos' => 'Ruiz Mendoza', 'ruc' => null, 'contacto' => null, 'telefono' => '015682144', 'email' => null, 'direccion' => 'Plaza de Armas 120, Rio Verde, Lima'],
                ['razon_social' => 'Patricia Salcedo', 'nombres' => 'Patricia', 'apellidos' => 'Salcedo', 'ruc' => null, 'contacto' => null, 'telefono' => '013491122', 'email' => null, 'direccion' => 'Av. Industrial 880, Ate, Lima'],
                ['razon_social' => 'Hugo Fernandez', 'nombres' => 'Hugo', 'apellidos' => 'Fernandez', 'ruc' => null, 'contacto' => null, 'telefono' => '014508811', 'email' => null, 'direccion' => 'Av. Los Pinos 890, San Juan de Miraflores, Lima'],
            ];

            foreach ($clientes as $cliente) {
                DB::table('clientes')->insertOrIgnore([...$cliente, 'estado' => 'activo', 'created_at' => $now, 'updated_at' => $now]);
            }

            $obras = [
                ['codigo' => 'OBR-2024-001', 'nombre' => 'Edificio Residencial Las Torres', 'cliente' => 'Veronica Alcantara', 'responsable' => 'carlos.mendoza@constructcontrol.pe', 'ubicacion' => 'Av. Los Alamos 450, Miraflores', 'presupuesto_aprobado' => 2850000, 'ingresos_recibidos' => 1920000, 'gastos_acumulados' => 1650000, 'porcentaje_avance' => 68, 'estado' => 'en_ejecucion', 'fecha_inicio' => '2024-03-01', 'fecha_fin_estimada' => '2025-02-28', 'imagen_portada' => 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&h=520&fit=crop&auto=format'],
                ['codigo' => 'OBR-2024-002', 'nombre' => 'Centro Comercial Plaza Norte', 'cliente' => 'Martin Villanueva', 'responsable' => 'ana.quispe@constructcontrol.pe', 'ubicacion' => 'Carretera Panamericana Norte Km 15, Los Olivos', 'presupuesto_aprobado' => 5400000, 'ingresos_recibidos' => 2700000, 'gastos_acumulados' => 2980000, 'porcentaje_avance' => 42, 'estado' => 'en_ejecucion', 'fecha_inicio' => '2024-01-15', 'fecha_fin_estimada' => '2025-06-30', 'imagen_portada' => 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&h=520&fit=crop&auto=format'],
                ['codigo' => 'OBR-2023-008', 'nombre' => 'Puente Vehicular Rio Verde', 'cliente' => 'Mariana Ruiz Mendoza', 'responsable' => 'roberto.huanca@constructcontrol.pe', 'ubicacion' => 'Rio Verde, Lurin', 'presupuesto_aprobado' => 1200000, 'ingresos_recibidos' => 1200000, 'gastos_acumulados' => 1085000, 'porcentaje_avance' => 100, 'estado' => 'finalizada', 'fecha_inicio' => '2023-06-01', 'fecha_fin_estimada' => '2024-01-31', 'imagen_portada' => 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&h=520&fit=crop&auto=format'],
                ['codigo' => 'OBR-2024-003', 'nombre' => 'Planta Industrial Textil Andina', 'cliente' => 'Patricia Salcedo', 'responsable' => 'mariela.torres@constructcontrol.pe', 'ubicacion' => 'Zona Industrial, Ate', 'presupuesto_aprobado' => 3200000, 'ingresos_recibidos' => 960000, 'gastos_acumulados' => 820000, 'porcentaje_avance' => 28, 'estado' => 'en_ejecucion', 'fecha_inicio' => '2024-08-01', 'fecha_fin_estimada' => '2025-09-30', 'imagen_portada' => 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=900&h=520&fit=crop&auto=format'],
                ['codigo' => 'OBR-2024-004', 'nombre' => 'Conjunto Habitacional Los Pinos', 'cliente' => 'Hugo Fernandez', 'responsable' => 'carlos.mendoza@constructcontrol.pe', 'ubicacion' => 'Av. Los Pinos 890, San Juan de Miraflores', 'presupuesto_aprobado' => 1850000, 'ingresos_recibidos' => 370000, 'gastos_acumulados' => 290000, 'porcentaje_avance' => 15, 'estado' => 'en_ejecucion', 'fecha_inicio' => '2024-10-01', 'fecha_fin_estimada' => '2025-12-31', 'imagen_portada' => 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&h=520&fit=crop&auto=format'],
            ];

            foreach ($obras as $obra) {
                DB::table('obras')->insertOrIgnore([
                    'codigo' => $obra['codigo'],
                    'nombre' => $obra['nombre'],
                    'cliente_id' => DB::table('clientes')->where('razon_social', $obra['cliente'])->value('id'),
                    'responsable_id' => DB::table('usuarios')->where('email', $obra['responsable'])->value('id'),
                    'ubicacion' => $obra['ubicacion'],
                    'presupuesto_aprobado' => $obra['presupuesto_aprobado'],
                    'ingresos_recibidos' => $obra['ingresos_recibidos'],
                    'gastos_acumulados' => $obra['gastos_acumulados'],
                    'porcentaje_avance' => $obra['porcentaje_avance'],
                    'estado' => $obra['estado'],
                    'fecha_inicio' => $obra['fecha_inicio'],
                    'fecha_fin_estimada' => $obra['fecha_fin_estimada'],
                    'imagen_portada' => $obra['imagen_portada'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            foreach ([
                ['codigo' => 'ayudante', 'nombre' => 'Ayudante', 'sueldo' => 1800],
                ['codigo' => 'oficial', 'nombre' => 'Oficial', 'sueldo' => 2600],
                ['codigo' => 'operario', 'nombre' => 'Operario', 'sueldo' => 2200],
            ] as $cargo) {
                DB::table('cargos')->insertOrIgnore([
                    ...$cargo,
                    'estado' => 'activo',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            $trabajadores = [
                ['nombres' => 'Pedro', 'apellidos' => 'Mamani Quispe', 'dni' => '45678901', 'cargo' => 'operario', 'sueldo' => 2200, 'estado' => 'activo'],
                ['nombres' => 'Juan Carlos', 'apellidos' => 'Flores Gutierrez', 'dni' => '32145678', 'cargo' => 'oficial', 'sueldo' => 2600, 'estado' => 'activo'],
                ['nombres' => 'Rosa Elena', 'apellidos' => 'Chavez Paredes', 'dni' => '56789012', 'cargo' => 'ayudante', 'sueldo' => 1800, 'estado' => 'activo'],
                ['nombres' => 'Miguel Angel', 'apellidos' => 'Rojas Calderon', 'dni' => '67890123', 'cargo' => 'operario', 'sueldo' => 2200, 'estado' => 'activo'],
                ['nombres' => 'Carmen Lucia', 'apellidos' => 'Diaz Valverde', 'dni' => '78901234', 'cargo' => 'oficial', 'sueldo' => 2600, 'estado' => 'inactivo'],
                ['nombres' => 'Raul Humberto', 'apellidos' => 'Soto Medina', 'dni' => '89012345', 'cargo' => 'operario', 'sueldo' => 2200, 'estado' => 'activo'],
            ];

            foreach ($trabajadores as $trabajador) {
                DB::table('trabajadores')->insertOrIgnore([
                    ...$trabajador,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            foreach (['Materiales', 'Mano de obra', 'Servicios', 'Transporte', 'Equipos', 'Otros'] as $nombre) {
                DB::table('categorias_gasto')->insertOrIgnore([
                    'nombre' => $nombre,
                    'estado' => 'activo',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            foreach (['Valorizacion', 'Valorizacion mensual', 'Pago parcial por avance de obra', 'Adelanto de obra', 'Liquidacion final de contrato'] as $nombre) {
                DB::table('tipos_ingreso')->insertOrIgnore([
                    'nombre' => $nombre,
                    'estado' => 'activo',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            foreach ([
                ['45678901', 'OBR-2024-001', '2024-11-22', '07:30', '17:00', 'presente', 8, 0, null],
                ['32145678', 'OBR-2024-001', '2024-11-22', '07:30', '17:00', 'presente', 8, 2, 'Apoyo en vaciado de losa.'],
                ['56789012', 'OBR-2024-002', '2024-11-22', '07:35', '17:00', 'presente', 8, 0, null],
                ['67890123', 'OBR-2024-001', '2024-11-22', '07:30', '17:00', 'presente', 8, 2, 'Horas extras autorizadas.'],
                ['78901234', 'OBR-2024-002', '2024-11-22', null, null, 'falta', 0, 0, 'Permiso medico pendiente de sustento.'],
                ['89012345', 'OBR-2024-003', '2024-11-22', null, null, 'falta', 0, 0, 'No registro ingreso.'],
            ] as [$dni, $obraCodigo, $fecha, $entrada, $salida, $estado, $normales, $extras, $observacion]) {
                DB::table('asistencias')->insert([
                    'trabajador_id' => DB::table('trabajadores')->where('dni', $dni)->value('id'),
                    'obra_id' => DB::table('obras')->where('codigo', $obraCodigo)->value('id'),
                    'fecha' => $fecha,
                    'hora_entrada' => $entrada,
                    'hora_salida' => $salida,
                    'estado' => $estado,
                    'horas_normales' => $normales,
                    'horas_extras' => $extras,
                    'observacion' => $observacion,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            foreach ([
                ['Semana 2 - 18-22 Nov 2024', 'OBR-2024-001', 18, 19200, 'Pendiente', '2024-11-18', '2024-11-22'],
                ['Semana 1 - 11-15 Nov 2024', 'OBR-2024-001', 18, 18500, 'Pagada', '2024-11-11', '2024-11-15'],
                ['Semana 1 - 11-15 Nov 2024', 'OBR-2024-002', 22, 26400, 'Pagada', '2024-11-11', '2024-11-15'],
                ['Semana 2 - 18-22 Nov 2024', 'OBR-2024-002', 22, 27800, 'Pagada', '2024-11-18', '2024-11-22'],
                ['Semana 1 - 18-22 Nov 2024', 'OBR-2024-003', 8, 8900, 'Pendiente', '2024-11-18', '2024-11-22'],
            ] as [$periodo, $obraCodigo, $trabajadoresCantidad, $total, $estado, $inicio, $fin]) {
                DB::table('planillas')->insert([
                    'periodo' => $periodo,
                    'obra_id' => DB::table('obras')->where('codigo', $obraCodigo)->value('id'),
                    'trabajadores' => $trabajadoresCantidad,
                    'total' => $total,
                    'estado' => $estado,
                    'fecha_inicio' => $inicio,
                    'fecha_fin' => $fin,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            foreach ([
                ['MAT-001', 'Cemento Portland Tipo I', 'Cemento', 'Bolsa 42.5 kg', 240, 100, 27.50, 'Obra Las Torres'],
                ['MAT-002', 'Fierro corrugado 1/2"', 'Acero', 'Varilla 9 m', 85, 50, 42.00, 'Obra Las Torres'],
                ['MAT-003', 'Arena gruesa lavada', 'Aridos', 'm3', 18, 20, 65.00, 'Almacen central'],
                ['MAT-004', 'Ladrillo King Kong 18 huecos', 'Albanileria', 'Millar', 12, 5, 680.00, 'Obra Plaza Norte'],
                ['MAT-005', 'Tuberia PVC SAP 4"', 'Instalaciones sanitarias', 'Unidad', 96, 40, 31.80, 'Obra Textil Andina'],
            ] as [$codigo, $nombre, $categoria, $unidad, $stock, $stockMinimo, $precio, $almacen]) {
                DB::table('materiales')->insertOrIgnore([
                    'codigo' => $codigo,
                    'nombre' => $nombre,
                    'categoria' => $categoria,
                    'unidad_medida' => $unidad,
                    'stock_actual' => $stock,
                    'stock_minimo' => $stockMinimo,
                    'precio_promedio' => $precio,
                    'almacen' => $almacen,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            $this->insertarGasto('OBR-2024-001', 'Materiales', 'Compra de fierro corrugado 3/8 para columnas del nivel 9', 45000, '2024-11-20', 'pendiente', $now);
            $this->insertarGasto('OBR-2024-001', 'Mano de obra', 'Planilla semanal de cuadrilla estructural', 18500, '2024-11-18', 'pagado', $now);
            $this->insertarGasto('OBR-2024-002', 'Equipos', 'Alquiler de grua torre por quince dias', 22000, '2024-11-15', 'pagado', $now);
            $this->insertarGasto('OBR-2024-003', 'Servicios', 'Inspeccion de soldadura y pruebas de carga', 17500, '2024-11-12', 'pendiente', $now);
            $this->insertarGasto('OBR-2024-004', 'Materiales', 'Compra inicial de agregados para zapatas', 9800, '2024-11-19', 'pendiente', $now);

            $this->insertarIngreso('OBR-2024-001', 'Veronica Alcantara', 'Valorizacion mensual', 420000, '2024-11-10', 'pagado', $now);
            $this->insertarIngreso('OBR-2024-002', 'Martin Villanueva', 'Pago parcial por avance de obra', 380000, '2024-11-08', 'pendiente', $now);
            $this->insertarIngreso('OBR-2024-003', 'Mariana Ruiz Mendoza', 'Liquidacion final de contrato', 180000, '2024-10-25', 'pagado', $now);
            $this->insertarIngreso('OBR-2024-003', 'Patricia Salcedo', 'Adelanto de obra', 960000, '2024-08-01', 'pagado', $now);

            foreach ([
                ['MAQ-001', 'Excavadora CAT 320', 'Pesada', 'Propia', 'OBR-2024-002', 'Luis Garcia', 'en_uso', 1240, '2024-12-15'],
                ['MAQ-002', 'Mezcladora de concreto 11 p3', 'Ligera', 'Propia', 'OBR-2024-001', 'Pedro Mamani', 'en_uso', 890, '2025-01-10'],
                ['MAQ-003', 'Vibrador de concreto 2"', 'Herramienta', 'Propia', 'OBR-2024-001', 'Juan Carlos Flores', 'disponible', 560, '2025-02-20'],
                ['MAQ-004', 'Rodillo compactador Bomag BW120', 'Pesada', 'Alquilada', 'OBR-2024-004', 'Raul Soto', 'mantenimiento', 310, '2024-12-05'],
            ] as [$codigo, $nombre, $tipo, $propiedad, $obraCodigo, $responsable, $estado, $horas, $mantenimiento]) {
                DB::table('maquinarias')->insertOrIgnore([
                    'codigo' => $codigo,
                    'nombre' => $nombre,
                    'tipo' => $tipo,
                    'propiedad' => $propiedad,
                    'obra_id' => DB::table('obras')->where('codigo', $obraCodigo)->value('id'),
                    'responsable' => $responsable,
                    'estado' => $estado,
                    'horas_uso' => $horas,
                    'fecha_mantenimiento' => $mantenimiento,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            foreach ([
                ['danger', 'Plaza Norte: gastos superan presupuesto en S/ 280,000 (10.4%).', 'hace 2h', true],
                ['warning', 'Plaza Norte lleva 18 dias de retraso en cronograma.', 'hace 1d', true],
                ['warning', 'Stock bajo: Arena gruesa, 18 m3 disponible (min. 20 m3).', 'hace 3h', true],
                ['info', 'Planilla semana 2 pendiente de aprobacion - S/ 19,200.', 'hace 5h', false],
                ['success', 'Pago recibido: Inmobiliaria Pacifico S.A. - S/ 420,000.', 'hace 1d', false],
            ] as [$tipo, $texto, $tiempo, $nueva]) {
                DB::table('alertas_sistema')->insert([
                    'tipo' => $tipo,
                    'texto' => $texto,
                    'tiempo' => $tiempo,
                    'nueva' => $nueva,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            foreach ([
                ['Jun', 280000, 245000, 1],
                ['Jul', 320000, 290000, 2],
                ['Ago', 410000, 375000, 3],
                ['Sep', 380000, 420000, 4],
                ['Oct', 460000, 395000, 5],
                ['Nov', 520000, 445000, 6],
            ] as [$etiqueta, $ingresos, $gastos, $orden]) {
                DB::table('series_ingresos_gastos')->insert([
                    'etiqueta' => $etiqueta,
                    'ingresos' => $ingresos,
                    'gastos' => $gastos,
                    'orden' => $orden,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        });
    }

    private function insertarGasto(
        string $obraCodigo,
        string $categoria,
        string $descripcion,
        float $monto,
        string $fecha,
        string $estado,
        mixed $now,
    ): void {
        DB::table('gastos')->insert([
            'obra_id' => DB::table('obras')->where('codigo', $obraCodigo)->value('id'),
            'categoria' => $categoria,
            'descripcion' => $descripcion,
            'monto' => $monto,
            'fecha' => $fecha,
            'estado' => $estado,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function insertarIngreso(
        string $obraCodigo,
        string $cliente,
        string $tipo,
        float $monto,
        string $fecha,
        string $estado,
        mixed $now,
    ): void {
        DB::table('ingresos')->insert([
            'obra_id' => DB::table('obras')->where('codigo', $obraCodigo)->value('id'),
            'cliente' => $cliente,
            'tipo' => $tipo,
            'monto' => $monto,
            'fecha' => $fecha,
            'estado' => $estado,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
}
