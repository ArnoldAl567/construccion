<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table): void {
            $table->id();
            $table->string('nombre', 80)->unique();
            $table->string('descripcion', 180);
            $table->timestamps();
        });

        Schema::create('permisos', function (Blueprint $table): void {
            $table->id();
            $table->string('codigo', 80)->unique();
            $table->string('descripcion', 180);
            $table->timestamps();
        });

        Schema::create('permiso_rol', function (Blueprint $table): void {
            $table->foreignId('rol_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('permiso_id')->constrained('permisos')->cascadeOnDelete();
            $table->primary(['rol_id', 'permiso_id']);
        });

        Schema::create('usuarios', function (Blueprint $table): void {
            $table->id();
            $table->string('nombre', 120);
            $table->string('email', 160)->unique();
            $table->string('password');
            $table->string('cargo', 120);
            $table->string('telefono', 20)->nullable();
            $table->string('foto_url', 320)->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        Schema::create('rol_usuario', function (Blueprint $table): void {
            $table->foreignId('rol_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->primary(['rol_id', 'usuario_id']);
        });

        Schema::create('clientes', function (Blueprint $table): void {
            $table->id();
            $table->string('razon_social', 180);
            $table->string('ruc', 11)->unique();
            $table->string('contacto', 120);
            $table->string('telefono', 20);
            $table->string('email', 160);
            $table->string('direccion', 240);
            $table->timestamps();
        });

        Schema::create('obras', function (Blueprint $table): void {
            $table->id();
            $table->string('codigo', 30)->unique();
            $table->string('nombre', 180);
            $table->foreignId('cliente_id')->constrained('clientes')->restrictOnDelete();
            $table->foreignId('responsable_id')->constrained('usuarios')->restrictOnDelete();
            $table->string('ubicacion', 220);
            $table->decimal('presupuesto_aprobado', 14, 2);
            $table->decimal('ingresos_recibidos', 14, 2)->default(0);
            $table->decimal('gastos_acumulados', 14, 2)->default(0);
            $table->unsignedTinyInteger('porcentaje_avance')->default(0);
            $table->string('estado', 30);
            $table->date('fecha_inicio');
            $table->date('fecha_fin_estimada');
            $table->string('imagen_portada', 320)->nullable();
            $table->timestamps();
        });

        Schema::create('trabajadores', function (Blueprint $table): void {
            $table->id();
            $table->string('nombres', 90);
            $table->string('apellidos', 120);
            $table->string('dni', 8)->unique();
            $table->string('cargo', 20);
            $table->decimal('sueldo', 10, 2);
            $table->string('estado', 30)->default('activo');
            $table->timestamps();
        });

        Schema::create('asistencias', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('trabajador_id')->constrained('trabajadores')->cascadeOnDelete();
            $table->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();
            $table->date('fecha');
            $table->time('hora_entrada')->nullable();
            $table->time('hora_salida')->nullable();
            $table->string('estado', 20);
            $table->decimal('horas_normales', 5, 2)->default(0);
            $table->decimal('horas_extras', 5, 2)->default(0);
            $table->string('observacion', 220)->nullable();
            $table->timestamps();
        });

        Schema::create('planillas', function (Blueprint $table): void {
            $table->id();
            $table->string('periodo', 90);
            $table->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();
            $table->unsignedInteger('trabajadores');
            $table->decimal('total', 12, 2);
            $table->string('estado', 30);
            $table->date('fecha_inicio');
            $table->date('fecha_fin');
            $table->timestamps();
        });

        Schema::create('planilla_detalles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('planilla_id')->constrained('planillas')->cascadeOnDelete();
            $table->foreignId('trabajador_id')->constrained('trabajadores')->cascadeOnDelete();
            $table->decimal('dias_trabajados', 5, 2);
            $table->decimal('horas_extras', 6, 2)->default(0);
            $table->decimal('sueldo_base', 10, 2);
            $table->decimal('pago_horas_extras', 12, 2)->default(0);
            $table->decimal('subtotal', 12, 2);
            $table->timestamps();
        });

        Schema::create('materiales', function (Blueprint $table): void {
            $table->id();
            $table->string('codigo', 30)->unique();
            $table->string('nombre', 160);
            $table->string('categoria', 90);
            $table->string('unidad_medida', 60);
            $table->decimal('stock_actual', 12, 2)->default(0);
            $table->decimal('stock_minimo', 12, 2)->default(0);
            $table->decimal('precio_promedio', 12, 2)->default(0);
            $table->string('almacen', 120);
            $table->timestamps();
        });

        Schema::create('gastos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();
            $table->string('categoria', 90);
            $table->string('descripcion', 240);
            $table->decimal('monto', 14, 2);
            $table->date('fecha');
            $table->string('estado', 30);
            $table->timestamps();
        });

        Schema::create('ingresos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('obra_id')->constrained('obras')->cascadeOnDelete();
            $table->string('cliente', 180);
            $table->string('tipo', 80);
            $table->decimal('monto', 14, 2);
            $table->date('fecha');
            $table->string('estado', 30);
            $table->timestamps();
        });

        Schema::create('maquinarias', function (Blueprint $table): void {
            $table->id();
            $table->string('codigo', 30)->unique();
            $table->string('nombre', 160);
            $table->string('tipo', 80);
            $table->string('propiedad', 60);
            $table->foreignId('obra_id')->nullable()->constrained('obras')->nullOnDelete();
            $table->string('responsable', 120);
            $table->string('estado', 30);
            $table->unsignedInteger('horas_uso')->default(0);
            $table->date('fecha_mantenimiento');
            $table->timestamps();
        });

        Schema::create('alertas_sistema', function (Blueprint $table): void {
            $table->id();
            $table->string('tipo', 30);
            $table->string('texto', 260);
            $table->string('tiempo', 30);
            $table->boolean('nueva')->default(true);
            $table->timestamps();
        });

        Schema::create('series_ingresos_gastos', function (Blueprint $table): void {
            $table->id();
            $table->string('etiqueta', 20);
            $table->decimal('ingresos', 14, 2);
            $table->decimal('gastos', 14, 2);
            $table->unsignedTinyInteger('orden');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('series_ingresos_gastos');
        Schema::dropIfExists('alertas_sistema');
        Schema::dropIfExists('maquinarias');
        Schema::dropIfExists('ingresos');
        Schema::dropIfExists('gastos');
        Schema::dropIfExists('materiales');
        Schema::dropIfExists('planilla_detalles');
        Schema::dropIfExists('planillas');
        Schema::dropIfExists('asistencias');
        Schema::dropIfExists('trabajadores');
        Schema::dropIfExists('obras');
        Schema::dropIfExists('clientes');
        Schema::dropIfExists('rol_usuario');
        Schema::dropIfExists('usuarios');
        Schema::dropIfExists('permiso_rol');
        Schema::dropIfExists('permisos');
        Schema::dropIfExists('roles');
    }
};
