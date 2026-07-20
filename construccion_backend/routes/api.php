<?php

use App\Http\Controllers\Api\DatosConstruccionController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->controller(DatosConstruccionController::class)->group(function (): void {
    Route::post('/autenticacion/iniciar-sesion', 'login');

    Route::get('/dashboard/resumen', 'dashboard');
    Route::get('/obras', 'obras');
    Route::post('/obras', 'crearObra');
    Route::put('/obras/{id}', 'actualizarObra');
    Route::patch('/obras/{id}/estado', 'actualizarEstadoObra');
    Route::delete('/obras/{id}', 'eliminarObra');
    Route::get('/trabajadores', 'trabajadores');
    Route::post('/trabajadores', 'crearTrabajador');
    Route::put('/trabajadores/{id}', 'actualizarTrabajador');
    Route::patch('/trabajadores/{id}/estado', 'actualizarEstadoTrabajador');
    Route::delete('/trabajadores/{id}', 'eliminarTrabajador');
    Route::get('/cargos', 'cargos');
    Route::post('/cargos', 'crearCargo');
    Route::put('/cargos/{id}', 'actualizarCargo');
    Route::delete('/cargos/{id}', 'eliminarCargo');
    Route::get('/clientes', 'clientes');
    Route::post('/clientes', 'crearCliente');
    Route::put('/clientes/{id}', 'actualizarCliente');
    Route::delete('/clientes/{id}', 'eliminarCliente');
    Route::get('/categorias-gasto', 'categoriasGasto');
    Route::post('/categorias-gasto', 'crearCategoriaGasto');
    Route::put('/categorias-gasto/{id}', 'actualizarCategoriaGasto');
    Route::delete('/categorias-gasto/{id}', 'eliminarCategoriaGasto');
    Route::get('/tipos-ingreso', 'tiposIngreso');
    Route::post('/tipos-ingreso', 'crearTipoIngreso');
    Route::put('/tipos-ingreso/{id}', 'actualizarTipoIngreso');
    Route::delete('/tipos-ingreso/{id}', 'eliminarTipoIngreso');
    Route::get('/materiales', 'materiales');
    Route::get('/asistencias', 'asistencias');
    Route::get('/planillas', 'planillas');
    Route::post('/planillas', 'crearPlanilla');
    Route::get('/planillas/{id}', 'detallePlanilla');
    Route::put('/planillas/{id}', 'actualizarPlanilla');
    Route::patch('/planillas/{id}/estado', 'actualizarEstadoPlanilla');
    Route::delete('/planillas/{id}', 'eliminarPlanilla');
    Route::post('/materiales/registrar-compra', 'registrarCompra');
    Route::get('/gastos', 'gastos');
    Route::post('/gastos', 'registrarGasto');
    Route::put('/gastos/{id}', 'actualizarGasto');
    Route::patch('/gastos/{id}/estado', 'actualizarEstadoGasto');
    Route::delete('/gastos/{id}', 'eliminarGasto');
    Route::get('/ingresos', 'ingresos');
    Route::post('/ingresos', 'registrarIngreso');
    Route::put('/ingresos/{id}', 'actualizarIngreso');
    Route::patch('/ingresos/{id}/estado', 'actualizarEstadoIngreso');
    Route::delete('/ingresos/{id}', 'eliminarIngreso');
    Route::get('/maquinarias', 'maquinarias');
    Route::get('/alertas', 'alertas');
    Route::get('/graficos/ingresos-gastos', 'graficoIngresosGastos');
});
