import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, forkJoin, map, tap } from 'rxjs';
import {
  AlertaSistema,
  Asistencia,
  Cargo,
  CategoriaGasto,
  Cliente,
  DatosObra,
  Gasto,
  Ingreso,
  Maquinaria,
  Material,
  NuevaPlanilla,
  Obra,
  Planilla,
  PlanillaDetalle,
  PuntoGrafico,
  Trabajador,
  TipoIngreso,
} from '../modelos/construccion.model';

interface RespuestaApi<T> {
  exito: boolean;
  mensaje: string;
  datos: T;
  errores: string[] | null;
}

interface ResumenDashboard {
  obrasActivas: number;
  obrasFinalizadas: number;
  obrasRetrasadas: number;
  presupuesto: number;
  ingresos: number;
  gastos: number;
  ganancia: number;
  margen: number;
  trabajadoresActivos: number;
  stockBajo: number;
  avance: number;
}

@Injectable({ providedIn: 'root' })
export class DatosConstruccionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://127.0.0.1:8000/api/v1';

  readonly obras = signal<Obra[]>([]);
  readonly trabajadores = signal<Trabajador[]>([]);
  readonly cargos = signal<Cargo[]>([]);
  readonly clientes = signal<Cliente[]>([]);
  readonly categoriasGasto = signal<CategoriaGasto[]>([]);
  readonly tiposIngreso = signal<TipoIngreso[]>([]);
  readonly materiales = signal<Material[]>([]);
  readonly gastos = signal<Gasto[]>([]);
  readonly ingresos = signal<Ingreso[]>([]);
  readonly maquinaria = signal<Maquinaria[]>([]);
  readonly alertas = signal<AlertaSistema[]>([]);
  readonly asistencias = signal<Asistencia[]>([]);
  readonly planillas = signal<Planilla[]>([]);
  readonly ingresosGastos = signal<PuntoGrafico[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  private readonly resumenApi = signal<ResumenDashboard | null>(null);

  readonly resumen = computed(() => {
    const api = this.resumenApi();
    if (api) {
      return api;
    }

    const obras = this.obras();
    const presupuesto = obras.reduce((total, obra) => total + obra.presupuesto, 0);
    const ingresos = obras.reduce((total, obra) => total + obra.ingresos, 0);
    const gastos = obras.reduce((total, obra) => total + obra.gastos, 0);
    const ganancia = presupuesto + ingresos - gastos;
    const baseMargen = presupuesto + ingresos;
    const avance = obras.length
      ? obras.reduce((total, obra) => total + obra.avance, 0) / obras.length
      : 0;

    return {
      obrasActivas: obras.filter((obra) => obra.estado === 'en_ejecucion').length,
      obrasFinalizadas: obras.filter((obra) => obra.estado === 'finalizada').length,
      obrasRetrasadas: 0,
      presupuesto,
      ingresos,
      gastos,
      ganancia,
      margen: baseMargen ? (ganancia / baseMargen) * 100 : 0,
      trabajadoresActivos: this.trabajadores().filter((trabajador) => trabajador.estado === 'activo').length,
      stockBajo: this.materiales().filter((material) => material.stock <= material.stockMin).length,
      avance,
    };
  });

  cargarDatos(): void {
    this.cargando.set(true);
    this.error.set('');

    forkJoin({
      resumen: this.obtener<ResumenDashboard>('dashboard/resumen'),
      obras: this.obtener<Obra[]>('obras'),
      trabajadores: this.obtener<Trabajador[]>('trabajadores'),
      cargos: this.obtener<Cargo[]>('cargos'),
      clientes: this.obtener<Cliente[]>('clientes'),
      categoriasGasto: this.obtener<CategoriaGasto[]>('categorias-gasto'),
      tiposIngreso: this.obtener<TipoIngreso[]>('tipos-ingreso'),
      materiales: this.obtener<Material[]>('materiales'),
      gastos: this.obtener<Gasto[]>('gastos'),
      ingresos: this.obtener<Ingreso[]>('ingresos'),
      maquinaria: this.obtener<Maquinaria[]>('maquinarias'),
      alertas: this.obtener<AlertaSistema[]>('alertas'),
      asistencias: this.obtener<Asistencia[]>('asistencias'),
      planillas: this.obtener<Planilla[]>('planillas'),
      ingresosGastos: this.obtener<PuntoGrafico[]>('graficos/ingresos-gastos'),
    }).subscribe({
      next: (respuesta) => {
        this.resumenApi.set(respuesta.resumen);
        this.obras.set(respuesta.obras);
        this.trabajadores.set(respuesta.trabajadores);
        this.cargos.set(respuesta.cargos);
        this.clientes.set(respuesta.clientes);
        this.categoriasGasto.set(respuesta.categoriasGasto);
        this.tiposIngreso.set(respuesta.tiposIngreso);
        this.materiales.set(respuesta.materiales);
        this.gastos.set(respuesta.gastos);
        this.ingresos.set(respuesta.ingresos);
        this.maquinaria.set(respuesta.maquinaria);
        this.alertas.set(respuesta.alertas);
        this.asistencias.set(respuesta.asistencias);
        this.planillas.set(respuesta.planillas);
        this.ingresosGastos.set(respuesta.ingresosGastos);
        this.cargando.set(false);
      },
      error: (error) => {
        if (error?.status === 401) {
          this.cargando.set(false);
          return;
        }
        this.usarDatosDePresentacion();
        this.error.set('');
        this.cargando.set(false);
      },
    });
  }

  crearObra(datos: DatosObra): void {
    this.http.post<RespuestaApi<null>>(`${this.apiUrl}/obras`, datos).subscribe(() => this.cargarDatos());
  }

  actualizarObra(id: number, datos: DatosObra): void {
    this.http.put<RespuestaApi<null>>(`${this.apiUrl}/obras/${id}`, datos).subscribe(() => this.cargarDatos());
  }

  cambiarEstadoObra(id: number, estado: Obra['estado']): Observable<string> {
    return this.http.patch<RespuestaApi<null>>(`${this.apiUrl}/obras/${id}/estado`, { estado }).pipe(
      tap(() => this.cargarDatos()),
      map((respuesta) => respuesta.mensaje),
    );
  }

  eliminarObra(id: number): Observable<string> {
    return this.http.delete<RespuestaApi<null>>(`${this.apiUrl}/obras/${id}`).pipe(
      tap(() => this.cargarDatos()),
      map((respuesta) => respuesta.mensaje),
    );
  }

  crearTrabajador(datos: Omit<Trabajador, 'id' | 'sueldo'>): void {
    this.http.post<RespuestaApi<null>>(`${this.apiUrl}/trabajadores`, datos).subscribe(() => this.cargarDatos());
  }

  actualizarTrabajador(id: number, datos: Omit<Trabajador, 'id' | 'sueldo'>): void {
    this.http.put<RespuestaApi<null>>(`${this.apiUrl}/trabajadores/${id}`, datos).subscribe(() => this.cargarDatos());
  }

  eliminarTrabajador(id: number): void {
    this.http.delete<RespuestaApi<null>>(`${this.apiUrl}/trabajadores/${id}`).subscribe(() => this.cargarDatos());
  }

  cambiarEstadoTrabajador(id: number, estado: Trabajador['estado']): void {
    this.http.patch<RespuestaApi<null>>(`${this.apiUrl}/trabajadores/${id}/estado`, { estado }).subscribe(() => this.cargarDatos());
  }

  crearCargo(datos: Omit<Cargo, 'id' | 'codigo'>): void {
    this.http.post<RespuestaApi<null>>(`${this.apiUrl}/cargos`, datos).subscribe(() => this.cargarDatos());
  }

  actualizarCargo(id: number, datos: Omit<Cargo, 'id' | 'codigo'>): void {
    this.http.put<RespuestaApi<null>>(`${this.apiUrl}/cargos/${id}`, datos).subscribe(() => this.cargarDatos());
  }

  eliminarCargo(id: number): void {
    this.http.delete<RespuestaApi<null>>(`${this.apiUrl}/cargos/${id}`).subscribe(() => this.cargarDatos());
  }

  crearCliente(datos: Omit<Cliente, 'id'>): void {
    this.http.post<RespuestaApi<null>>(`${this.apiUrl}/clientes`, datos).subscribe(() => this.cargarDatos());
  }

  actualizarCliente(id: number, datos: Omit<Cliente, 'id'>): void {
    this.http.put<RespuestaApi<null>>(`${this.apiUrl}/clientes/${id}`, datos).subscribe(() => this.cargarDatos());
  }

  eliminarCliente(id: number): Observable<string> {
    return this.http.delete<RespuestaApi<null>>(`${this.apiUrl}/clientes/${id}`).pipe(
      tap(() => this.cargarDatos()),
      map((respuesta) => respuesta.mensaje),
    );
  }

  crearCategoriaGasto(datos: Omit<CategoriaGasto, 'id'>): void {
    this.http.post<RespuestaApi<null>>(`${this.apiUrl}/categorias-gasto`, datos).subscribe(() => this.cargarDatos());
  }

  actualizarCategoriaGasto(id: number, datos: Omit<CategoriaGasto, 'id'>): void {
    this.http.put<RespuestaApi<null>>(`${this.apiUrl}/categorias-gasto/${id}`, datos).subscribe(() => this.cargarDatos());
  }

  eliminarCategoriaGasto(id: number): Observable<string> {
    return this.http.delete<RespuestaApi<null>>(`${this.apiUrl}/categorias-gasto/${id}`).pipe(
      tap(() => this.cargarDatos()),
      map((respuesta) => respuesta.mensaje),
    );
  }

  crearTipoIngreso(datos: Omit<TipoIngreso, 'id'>): void {
    this.http.post<RespuestaApi<null>>(`${this.apiUrl}/tipos-ingreso`, datos).subscribe(() => this.cargarDatos());
  }

  actualizarTipoIngreso(id: number, datos: Omit<TipoIngreso, 'id'>): void {
    this.http.put<RespuestaApi<null>>(`${this.apiUrl}/tipos-ingreso/${id}`, datos).subscribe(() => this.cargarDatos());
  }

  eliminarTipoIngreso(id: number): Observable<string> {
    return this.http.delete<RespuestaApi<null>>(`${this.apiUrl}/tipos-ingreso/${id}`).pipe(
      tap(() => this.cargarDatos()),
      map((respuesta) => respuesta.mensaje),
    );
  }

  registrarGasto(datos: Omit<Gasto, 'id'>): void {
    this.http.post<RespuestaApi<null>>(`${this.apiUrl}/gastos`, datos).subscribe(() => this.cargarDatos());
  }

  actualizarGasto(id: number, datos: Omit<Gasto, 'id'>): void {
    this.http.put<RespuestaApi<null>>(`${this.apiUrl}/gastos/${id}`, datos).subscribe(() => this.cargarDatos());
  }

  eliminarGasto(id: number): void {
    this.http.delete<RespuestaApi<null>>(`${this.apiUrl}/gastos/${id}`).subscribe(() => this.cargarDatos());
  }

  cambiarEstadoGasto(id: number, estado: Gasto['estado']): void {
    const anteriores = this.gastos();
    this.gastos.update((gastos) => gastos.map((gasto) => gasto.id === id ? { ...gasto, estado } : gasto));
    this.http.patch<RespuestaApi<null>>(`${this.apiUrl}/gastos/${id}/estado`, { estado }).subscribe({
      error: () => this.gastos.set(anteriores),
    });
  }

  registrarIngreso(datos: Omit<Ingreso, 'id'>): void {
    this.http.post<RespuestaApi<null>>(`${this.apiUrl}/ingresos`, datos).subscribe(() => this.cargarDatos());
  }

  actualizarIngreso(id: number, datos: Omit<Ingreso, 'id'>): void {
    this.http.put<RespuestaApi<null>>(`${this.apiUrl}/ingresos/${id}`, datos).subscribe(() => this.cargarDatos());
  }

  eliminarIngreso(id: number): void {
    this.http.delete<RespuestaApi<null>>(`${this.apiUrl}/ingresos/${id}`).subscribe(() => this.cargarDatos());
  }

  cambiarEstadoIngreso(id: number, estado: Ingreso['estado']): void {
    const anteriores = this.ingresos();
    this.ingresos.update((ingresos) => ingresos.map((ingreso) => ingreso.id === id ? { ...ingreso, estado } : ingreso));
    this.http.patch<RespuestaApi<null>>(`${this.apiUrl}/ingresos/${id}/estado`, { estado }).subscribe({
      error: () => this.ingresos.set(anteriores),
    });
  }

  registrarPlanilla(datos: NuevaPlanilla): void {
    this.http.post<RespuestaApi<null>>(`${this.apiUrl}/planillas`, datos).subscribe(() => this.cargarDatos());
  }

  actualizarPlanilla(id: number, datos: NuevaPlanilla): void {
    this.http.put<RespuestaApi<null>>(`${this.apiUrl}/planillas/${id}`, datos).subscribe(() => this.cargarDatos());
  }

  obtenerPlanilla(id: number): Observable<PlanillaDetalle> {
    return this.obtener<PlanillaDetalle>(`planillas/${id}`);
  }

  cambiarEstadoPlanilla(id: number, estado: 'Pendiente' | 'Pagada'): void {
    this.http.patch<RespuestaApi<null>>(`${this.apiUrl}/planillas/${id}/estado`, { estado }).subscribe(() => this.cargarDatos());
  }

  eliminarPlanilla(id: number): void {
    this.http.delete<RespuestaApi<null>>(`${this.apiUrl}/planillas/${id}`).subscribe(() => this.cargarDatos());
  }

  registrarCompra(materialId: number, cantidad: number, precioUnitario: number): void {
    this.http
      .post<RespuestaApi<null>>(`${this.apiUrl}/materiales/registrar-compra`, {
        materialId,
        cantidad,
        precioUnitario,
      })
      .subscribe(() => this.cargarDatos());
  }

  nombreObra(obraId: number | null): string {
    return this.obras().find((obra) => obra.id === obraId)?.nombre ?? 'Sin obra';
  }

  private obtener<T>(endpoint: string): Observable<T> {
    return this.http
      .get<RespuestaApi<T>>(`${this.apiUrl}/${endpoint}`)
      .pipe(map((respuesta) => {
        if (!respuesta.exito) {
          throw new Error(respuesta.mensaje);
        }
        return respuesta.datos;
      }));
  }

  private usarDatosDePresentacion(): void {
    const obras: Obra[] = [
      {
        id: 1,
        codigo: 'OBR-2024-001',
        nombre: 'Edificio Residencial Las Torres',
        cliente: 'Veronica Alcantara',
        responsable: 'Ing. Carlos Mendoza',
        ubicacion: 'Av. Los Alamos 450, Miraflores',
        presupuesto: 2850000,
        ingresos: 1920000,
        gastos: 1650000,
        avance: 68,
        estado: 'en_ejecucion',
        fechaInicio: '2024-03-01',
        fechaFin: '2025-02-28',
        imagen: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&h=520&fit=crop&auto=format',
      },
      {
        id: 2,
        codigo: 'OBR-2024-002',
        nombre: 'Centro Comercial Plaza Norte',
        cliente: 'Martin Villanueva',
        responsable: 'Ing. Ana Quispe',
        ubicacion: 'Carretera Panamericana Norte Km 15',
        presupuesto: 5400000,
        ingresos: 2700000,
        gastos: 2980000,
        avance: 42,
        estado: 'en_ejecucion',
        fechaInicio: '2024-01-15',
        fechaFin: '2025-06-30',
        imagen: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&h=520&fit=crop&auto=format',
      },
      {
        id: 3,
        codigo: 'OBR-2023-008',
        nombre: 'Puente Vehicular Rio Verde',
        cliente: 'Mariana Ruiz Mendoza',
        responsable: 'Ing. Roberto Huanca',
        ubicacion: 'Rio Verde, Lurin',
        presupuesto: 1200000,
        ingresos: 1200000,
        gastos: 1085000,
        avance: 100,
        estado: 'finalizada',
        fechaInicio: '2023-06-01',
        fechaFin: '2024-01-31',
        imagen: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&h=520&fit=crop&auto=format',
      },
      {
        id: 4,
        codigo: 'OBR-2024-003',
        nombre: 'Planta Industrial Textil Andina',
        cliente: 'Patricia Salcedo',
        responsable: 'Ing. Maria Torres',
        ubicacion: 'Zona Industrial, Ate',
        presupuesto: 3200000,
        ingresos: 960000,
        gastos: 820000,
        avance: 28,
        estado: 'en_ejecucion',
        fechaInicio: '2024-08-01',
        fechaFin: '2025-09-30',
        imagen: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=900&h=520&fit=crop&auto=format',
      },
      {
        id: 5,
        codigo: 'OBR-2024-004',
        nombre: 'Conjunto Habitacional Los Pinos',
        cliente: 'Hugo Fernandez',
        responsable: 'Ing. Luis Vargas',
        ubicacion: 'Av. Los Pinos 890, San Juan de Miraflores',
        presupuesto: 1850000,
        ingresos: 370000,
        gastos: 290000,
        avance: 15,
        estado: 'en_ejecucion',
        fechaInicio: '2024-10-01',
        fechaFin: '2025-12-31',
        imagen: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&h=520&fit=crop&auto=format',
      },
    ];

    const trabajadores: Trabajador[] = [
      { id: 1, nombres: 'Pedro', apellidos: 'Mamani Quispe', dni: '45678901', cargo: 'operario', sueldo: 2200, estado: 'activo' },
      { id: 2, nombres: 'Juan Carlos', apellidos: 'Flores Gutierrez', dni: '32145678', cargo: 'oficial', sueldo: 2600, estado: 'activo' },
      { id: 3, nombres: 'Rosa Elena', apellidos: 'Chavez Paredes', dni: '56789012', cargo: 'ayudante', sueldo: 1800, estado: 'activo' },
      { id: 4, nombres: 'Miguel Angel', apellidos: 'Rojas Calderon', dni: '67890123', cargo: 'operario', sueldo: 2200, estado: 'activo' },
      { id: 5, nombres: 'Carmen Lucia', apellidos: 'Diaz Valverde', dni: '78901234', cargo: 'oficial', sueldo: 2600, estado: 'inactivo' },
      { id: 6, nombres: 'Raul Humberto', apellidos: 'Soto Medina', dni: '89012345', cargo: 'operario', sueldo: 2200, estado: 'activo' },
    ];

    this.resumenApi.set(null);
    this.obras.set(obras);
    this.cargos.set([
      { id: 1, codigo: 'ayudante', nombre: 'Ayudante', sueldo: 1800, estado: 'activo' },
      { id: 2, codigo: 'oficial', nombre: 'Oficial', sueldo: 2600, estado: 'activo' },
      { id: 3, codigo: 'operario', nombre: 'Operario', sueldo: 2200, estado: 'activo' },
    ]);
    this.clientes.set([
      { id: 1, nombres: 'Veronica', apellidos: 'Alcantara', telefono: '014426780', direccion: 'Av. Jose Pardo 620, Miraflores, Lima', estado: 'activo' },
      { id: 2, nombres: 'Martin', apellidos: 'Villanueva', telefono: '017254910', direccion: 'Av. Tomas Valle 1220, Los Olivos, Lima', estado: 'activo' },
      { id: 3, nombres: 'Mariana', apellidos: 'Ruiz Mendoza', telefono: '015682144', direccion: 'Plaza de Armas 120, Rio Verde, Lima', estado: 'activo' },
      { id: 4, nombres: 'Patricia', apellidos: 'Salcedo', telefono: '013491122', direccion: 'Av. Industrial 880, Ate, Lima', estado: 'activo' },
      { id: 5, nombres: 'Hugo', apellidos: 'Fernandez', telefono: '014508811', direccion: 'Av. Los Pinos 890, San Juan de Miraflores, Lima', estado: 'activo' },
    ]);
    this.categoriasGasto.set(['Materiales', 'Mano de obra', 'Servicios', 'Transporte', 'Equipos', 'Otros'].map((nombre, index) => ({ id: index + 1, nombre, estado: 'activo' })));
    this.tiposIngreso.set(['Valorizacion', 'Valorizacion mensual', 'Pago parcial por avance de obra', 'Adelanto de obra', 'Liquidacion final de contrato'].map((nombre, index) => ({ id: index + 1, nombre, estado: 'activo' })));
    this.trabajadores.set(trabajadores);
    this.materiales.set([
      { id: 1, codigo: 'MAT-001', nombre: 'Cemento Portland Tipo I', categoria: 'Cemento', unidad: 'Bolsa 42.5 kg', stock: 240, stockMin: 100, precioPromedio: 27.5, almacen: 'Obra Las Torres' },
      { id: 2, codigo: 'MAT-002', nombre: 'Fierro corrugado 1/2"', categoria: 'Acero', unidad: 'Varilla 9 m', stock: 85, stockMin: 50, precioPromedio: 42, almacen: 'Obra Las Torres' },
      { id: 3, codigo: 'MAT-003', nombre: 'Arena gruesa lavada', categoria: 'Aridos', unidad: 'm3', stock: 18, stockMin: 20, precioPromedio: 65, almacen: 'Almacen central' },
      { id: 4, codigo: 'MAT-004', nombre: 'Ladrillo King Kong 18 huecos', categoria: 'Albanileria', unidad: 'Millar', stock: 12, stockMin: 5, precioPromedio: 680, almacen: 'Obra Plaza Norte' },
    ]);
    this.gastos.set([
      { id: 1, obraId: 1, categoria: 'Materiales', descripcion: 'Compra de fierro corrugado para columnas', monto: 45000, fecha: '2024-11-20', estado: 'pendiente' },
      { id: 2, obraId: 1, categoria: 'Mano de obra', descripcion: 'Planilla semanal de cuadrilla estructural', monto: 18500, fecha: '2024-11-18', estado: 'pagado' },
      { id: 3, obraId: 2, categoria: 'Equipos', descripcion: 'Alquiler de grua torre por quince dias', monto: 22000, fecha: '2024-11-15', estado: 'pagado' },
    ]);
    this.ingresos.set([
      { id: 1, obraId: 1, cliente: 'Veronica Alcantara', tipo: 'Valorizacion mensual', monto: 420000, fecha: '2024-11-10', estado: 'pagado' },
      { id: 2, obraId: 2, cliente: 'Martin Villanueva', tipo: 'Pago parcial', monto: 380000, fecha: '2024-11-08', estado: 'pendiente' },
      { id: 3, obraId: 4, cliente: 'Patricia Salcedo', tipo: 'Adelanto de obra', monto: 960000, fecha: '2024-08-01', estado: 'pagado' },
    ]);
    this.maquinaria.set([
      { id: 1, codigo: 'MAQ-001', nombre: 'Excavadora CAT 320', tipo: 'Pesada', propiedad: 'Propia', obraId: 2, responsable: 'Luis Garcia', estado: 'en_uso', horasUso: 1240, mantenimiento: '2024-12-15' },
      { id: 2, codigo: 'MAQ-002', nombre: 'Mezcladora de concreto 11 p3', tipo: 'Ligera', propiedad: 'Propia', obraId: 1, responsable: 'Pedro Mamani', estado: 'en_uso', horasUso: 890, mantenimiento: '2025-01-10' },
      { id: 3, codigo: 'MAQ-003', nombre: 'Vibrador de concreto 2"', tipo: 'Herramienta', propiedad: 'Propia', obraId: 1, responsable: 'Juan Flores', estado: 'disponible', horasUso: 560, mantenimiento: '2025-02-20' },
    ]);
    this.alertas.set([
      { tipo: 'danger', texto: 'Plaza Norte: gastos superan presupuesto en S/ 280,000 (10.4%).', tiempo: 'hace 2h' },
      { tipo: 'warning', texto: 'Plaza Norte lleva 18 dias de retraso en cronograma.', tiempo: 'hace 1d' },
      { tipo: 'warning', texto: 'Stock bajo: Arena gruesa, 18 m3 disponible (min. 20 m3).', tiempo: 'hace 3h' },
      { tipo: 'info', texto: 'Planilla semana 2 pendiente de aprobacion - S/ 19,200.', tiempo: 'hace 5h' },
      { tipo: 'success', texto: 'Pago recibido: Inmobiliaria Pacifico S.A. - S/ 420,000.', tiempo: 'hace 1d' },
    ]);
    const obrasAsignadas = [1, 1, 2, 1, 2, 4];
    this.asistencias.set(trabajadores.map((trabajador, index) => ({
      id: index + 1,
      trabajadorId: trabajador.id,
      trabajador: `${trabajador.nombres} ${trabajador.apellidos}`,
      cargo: trabajador.cargo,
      foto: '',
      obraId: obrasAsignadas[index] ?? 1,
      fecha: '2024-11-22',
      entrada: index < 4 ? '07:30' : null,
      salida: index < 4 ? '17:00' : null,
      estado: index < 4 ? 'presente' : 'falta',
      horasNormales: index < 4 ? 8 : 0,
      horasExtras: index === 1 || index === 3 ? 2 : 0,
      observacion: index >= 4 ? 'No registro ingreso.' : null,
    })));
    this.planillas.set([
      { id: 1, periodo: 'Semana 2 - 18-22 Nov 2024', obraId: 1, obra: 'Edificio Residencial Las Torres', trabajadores: 18, total: 19200, estado: 'Pendiente' },
      { id: 2, periodo: 'Semana 1 - 11-15 Nov 2024', obraId: 1, obra: 'Edificio Residencial Las Torres', trabajadores: 18, total: 18500, estado: 'Pagada' },
      { id: 3, periodo: 'Semana 1 - 11-15 Nov 2024', obraId: 2, obra: 'Centro Comercial Plaza Norte', trabajadores: 22, total: 26400, estado: 'Pagada' },
      { id: 4, periodo: 'Semana 2 - 18-22 Nov 2024', obraId: 2, obra: 'Centro Comercial Plaza Norte', trabajadores: 22, total: 27800, estado: 'Pagada' },
      { id: 5, periodo: 'Semana 1 - 18-22 Nov 2024', obraId: 4, obra: 'Planta Industrial Textil Andina', trabajadores: 8, total: 8900, estado: 'Pendiente' },
    ]);
    this.ingresosGastos.set([
      { etiqueta: 'Jun', valorA: 280000, valorB: 245000 },
      { etiqueta: 'Jul', valorA: 320000, valorB: 290000 },
      { etiqueta: 'Ago', valorA: 410000, valorB: 375000 },
      { etiqueta: 'Sep', valorA: 380000, valorB: 420000 },
      { etiqueta: 'Oct', valorA: 460000, valorB: 395000 },
      { etiqueta: 'Nov', valorA: 520000, valorB: 445000 },
    ]);
  }
}
