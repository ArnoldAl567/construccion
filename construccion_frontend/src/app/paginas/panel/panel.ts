import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Cargo, CategoriaGasto, Cliente, DatosObra, EstadoObra, Gasto, Ingreso, Obra, Planilla, PlanillaDetalle, TipoIngreso, Trabajador } from '../../nucleo/modelos/construccion.model';
import { AutenticacionService } from '../../nucleo/servicios/autenticacion.service';
import { DatosConstruccionService } from '../../nucleo/servicios/datos-construccion.service';
import { PlanillaPdfSemana, PlanillasPdfService } from '../../nucleo/servicios/planillas-pdf.service';
import { TemaService } from '../../nucleo/servicios/tema.service';

type Vista =
  | 'dashboard'
  | 'obras'
  | 'mantenedor'
  | 'trabajadores'
  | 'cargos'
  | 'clientes'
  | 'categorias-gasto'
  | 'tipos-ingreso'
  | 'asistencia'
  | 'planillas'
  | 'materiales'
  | 'almacen'
  | 'gastos'
  | 'ingresos'
  | 'maquinaria'
  | 'documentos'
  | 'rentabilidad'
  | 'reportes'
  | 'usuarios'
  | 'configuracion'
  | 'portal-trabajador'
  | 'portal-cliente';

type VistaMantenedor = 'trabajadores' | 'cargos' | 'clientes' | 'categorias-gasto' | 'tipos-ingreso';
type ModalActivo = 'obra' | 'eliminar-obra' | 'confirmar-eliminar' | 'trabajador' | 'cargo' | 'cliente' | 'categoria-gasto' | 'tipo-ingreso' | 'planilla' | 'planilla-detalle' | 'gasto' | 'ingreso' | 'compra';

type TonoModulo = 'blue' | 'green' | 'orange' | 'red' | 'violet' | 'cyan' | 'mint' | 'purple';

interface MetricaModulo {
  icono: string;
  tono: TonoModulo;
  valor: string;
  etiqueta: string;
  detalle: string;
}

type FilaModulo = Record<string, string | number>;

interface AlertaDashboard {
  tipo: 'danger' | 'warning' | 'info' | 'success';
  icono: string;
  texto: string;
  tiempo: string;
}

interface MetricaDashboard {
  etiqueta: string;
  valor: string;
  detalle: string;
  icono: string;
  tono: TonoModulo;
  tendencia?: string;
  negativa?: boolean;
}

interface ResumenEliminacionObra {
  planillasCantidad: number;
  planillasTotal: number;
  gastosCantidad: number;
  gastosTotal: number;
  ingresosCantidad: number;
  ingresosTotal: number;
  otrosRegistros: number;
  totalRegistros: number;
  puedeEliminar: boolean;
}

interface ConfirmacionEliminacion {
  titulo: string;
  elemento: string;
  detalle?: string;
  advertencia: string;
  confirmarTexto: string;
  accion: () => void;
}

const ICONOS: Record<string, string> = {
  helmet:
    '<svg viewBox="0 0 24 24"><path d="M4 15h16"/><path d="M5 15a7 7 0 0 1 14 0"/><path d="M8 15V9"/><path d="M16 15V9"/><path d="M3 18h18"/></svg>',
  grid:
    '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
  obra:
    '<svg viewBox="0 0 24 24"><path d="M4 20h16"/><path d="M6 20V8l6-4 6 4v12"/><path d="M9 20v-6h6v6"/><path d="M9 10h.01"/><path d="M15 10h.01"/></svg>',
  user:
    '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  check:
    '<svg viewBox="0 0 24 24"><path d="M9 11l2 2 4-4"/><path d="M6 3h12v18H6z"/><path d="M9 3v2h6V3"/></svg>',
  doc:
    '<svg viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/></svg>',
  box:
    '<svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
  store:
    '<svg viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V9l7-4 7 4v12"/><path d="M8 21v-7h8v7"/><path d="M8 11h8"/></svg>',
  down:
    '<svg viewBox="0 0 24 24"><path d="M3 7l6 6 4-4 8 8"/><path d="M17 17h4v-4"/></svg>',
  up:
    '<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg>',
  calc:
    '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 11h.01"/><path d="M12 11h.01"/><path d="M16 11h.01"/><path d="M8 15h.01"/><path d="M12 15h.01"/><path d="M16 15h.01"/></svg>',
  chart:
    '<svg viewBox="0 0 24 24"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 17V9"/><path d="M12 17V7"/><path d="M16 17v-5"/></svg>',
  tool:
    '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5 5L4 17v3h3l5.7-5.7a4 4 0 0 0 5-5l-2.4 2.4-3-3 2.4-2.4z"/></svg>',
  folder:
    '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  pie:
    '<svg viewBox="0 0 24 24"><path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M12 3a9 9 0 0 1 9 9h-9z"/></svg>',
  nodes:
    '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M8 7l3 8"/><path d="M16 7l-3 8"/></svg>',
  gear:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3-.2-.1a1.7 1.7 0 0 0-2 .2 1.7 1.7 0 0 0-.8 1.6V22h-3.6v-.3a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.2l-.2.1-2-3 .1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.4-1.1H5v-3.6h.3a1.7 1.7 0 0 0 1.4-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3 .2.1a1.7 1.7 0 0 0 2-.2A1.7 1.7 0 0 0 11.2 3V2h3.6v1a1.7 1.7 0 0 0 1.1 1.6 1.7 1.7 0 0 0 1.8-.2l.2-.1 2 3-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.4 1.1h.3v3.6h-.3a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  'x-circle':
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
  'alert-triangle':
    '<svg viewBox="0 0 24 24"><path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  info:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  eye:
    '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  edit:
    '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></svg>',
  trash:
    '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>',
  globe:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/></svg>',
  sun:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon:
    '<svg viewBox="0 0 24 24"><path d="M20.5 14.5A8 8 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5z"/></svg>',
  bell:
    '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
  logout:
    '<svg viewBox="0 0 24 24"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/></svg>',
  menu:
    '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  x:
    '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  mail:
    '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  lock:
    '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
};

@Component({
  selector: 'app-panel',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './panel.html',
})
export class PanelComponent {
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AutenticacionService);
  private readonly tema = inject(TemaService);
  private readonly planillasPdf = inject(PlanillasPdfService);
  readonly datos = inject(DatosConstruccionService);

  readonly temaOscuro = this.tema.oscuro;
  readonly usuarioSesion = this.auth.usuario;
  readonly menuUsuarioAbierto = signal(false);
  readonly menuContraido = signal(false);
  readonly menuMovilAbierto = signal(false);
  readonly vista = signal<Vista>('dashboard');
  readonly vistaDetalleObra = signal(false);
  readonly modalActivo = signal<ModalActivo | null>(null);
  readonly confirmacionEliminar = signal<ConfirmacionEliminacion | null>(null);
  readonly mensaje = signal('');
  readonly busqueda = signal('');
  readonly obraEditandoId = signal<number | null>(null);
  readonly obraEliminandoId = signal<number | null>(null);
  readonly obraDetalleId = signal<number | null>(null);
  readonly filtroEstadoObra = signal<'todos' | EstadoObra>('todos');
  readonly ordenObras = signal<'nombre' | 'avance' | 'presupuesto'>('nombre');
  readonly modoVistaObras = signal<'lista' | 'grid'>('lista');
  readonly filtroCargoTrabajador = signal<'todos' | Trabajador['cargo']>('todos');
  readonly filtroEstadoTrabajador = signal<'todos' | Trabajador['estado']>('todos');
  readonly trabajadorEditandoId = signal<number | null>(null);
  readonly mantenedorTab = signal<VistaMantenedor>('trabajadores');
  readonly mantenedorMenuAbierto = signal(false);
  readonly gastosMantenedorAbierto = signal(false);
  readonly ingresosMantenedorAbierto = signal(false);
  readonly cargoEditandoId = signal<number | null>(null);
  readonly clienteEditandoId = signal<number | null>(null);
  readonly categoriaGastoEditandoId = signal<number | null>(null);
  readonly tipoIngresoEditandoId = signal<number | null>(null);
  readonly diasPlanilla = signal<Record<number, number>>({});
  readonly horasExtrasPlanilla = signal<Record<number, number>>({});
  readonly planillaRangoVersion = signal(0);
  readonly planillaDetalle = signal<PlanillaDetalle | null>(null);
  readonly planillaEditandoId = signal<number | null>(null);
  readonly obraPlanillasSeleccionadaId = signal<number | null>(null);
  readonly modoVistaPlanillas = signal<'resumen' | 'detalle'>('resumen');
  readonly detallesPlanillasVista = signal<Record<number, PlanillaDetalle>>({});
  readonly cargandoDetallesPlanillas = signal(false);
  readonly errorDetallesPlanillas = signal(false);
  readonly obraGastosSeleccionadaId = signal<number | null>(null);
  readonly gastoEditandoId = signal<number | null>(null);
  readonly obraIngresosSeleccionadaId = signal<number | null>(null);
  readonly ingresoEditandoId = signal<number | null>(null);
  readonly obraReportesSeleccionadaId = signal<number | null>(null);
  readonly filtroCategoriaGasto = signal('todas');
  readonly filtroEstadoGasto = signal<'todos' | Gasto['estado']>('todos');
  readonly filtroEstadoIngreso = signal<'todos' | Ingreso['estado']>('todos');
  readonly fechaInicioGasto = signal('');
  readonly fechaFinGasto = signal('');
  readonly limiteDiasPlanilla = 8;
  readonly diasBasePlanilla = 6;

  readonly categoriasGasto = computed(() => this.datos.categoriasGasto().filter((categoria) => categoria.estado === 'activo'));
  readonly tiposIngreso = computed(() => this.datos.tiposIngreso().filter((tipo) => tipo.estado === 'activo'));
  readonly clientesActivos = computed(() => this.datos.clientes().filter((cliente) => cliente.estado === 'activo'));

  readonly menu: { vista: Vista; icono: string; etiqueta: string }[] = [
    { vista: 'dashboard', icono: 'grid', etiqueta: 'Dashboard' },
    { vista: 'obras', icono: 'helmet', etiqueta: 'Obras' },
    { vista: 'mantenedor', icono: 'nodes', etiqueta: 'Mantenedor' },
    { vista: 'planillas', icono: 'doc', etiqueta: 'Planillas' },
    { vista: 'gastos', icono: 'down', etiqueta: 'Gastos' },
    { vista: 'ingresos', icono: 'up', etiqueta: 'Ingresos' },
    { vista: 'reportes', icono: 'doc', etiqueta: 'Reportes' },
    { vista: 'usuarios', icono: 'nodes', etiqueta: 'Usuarios y roles' },
    { vista: 'configuracion', icono: 'gear', etiqueta: 'Configuración' },
  ];

  readonly filtrosDashboard = ['Todas las obras', 'Los Pinos', 'Plaza Norte', 'Hospital S.F.'];

  readonly cargosTrabajador = computed(() => this.datos.cargos().filter((cargo) => cargo.estado === 'activo'));

  readonly estadosTrabajador: { valor: Trabajador['estado']; etiqueta: string }[] = [
    { valor: 'activo', etiqueta: 'Activo' },
    { valor: 'inactivo', etiqueta: 'Inactivo' },
  ];

  readonly alertasDashboard: AlertaDashboard[] = [
    { tipo: 'danger', icono: 'x-circle', texto: 'Plaza Norte: gastos superan presupuesto en S/ 280,000 (10.4%)', tiempo: 'hace 2h' },
    { tipo: 'warning', icono: 'alert-triangle', texto: 'Plaza Norte lleva 18 días de retraso en cronograma', tiempo: 'hace 1d' },
    { tipo: 'warning', icono: 'clock', texto: 'Stock bajo: Arena gruesa — 18 m³ disponible (mín. 20 m³)', tiempo: 'hace 3h' },
    { tipo: 'info', icono: 'info', texto: 'Planilla semana 2 pendiente de aprobación — S/ 19,200', tiempo: 'hace 5h' },
    { tipo: 'info', icono: 'info', texto: 'Pago recibido: Inmobiliaria Pacífico S.A. — S/ 320,000', tiempo: 'hace 1d' },
  ];

  readonly metricasDashboard: MetricaDashboard[] = [
    { etiqueta: 'Obras activas', valor: '4', detalle: '', icono: 'helmet', tono: 'blue', tendencia: '1 este mes' },
    { etiqueta: 'Obras retrasadas', valor: '1', detalle: 'Plaza Norte', icono: 'alert-triangle', tono: 'red' },
    { etiqueta: 'Presupuesto total', valor: 'S/ 14.5M', detalle: '5 obras', icono: 'calc', tono: 'violet' },
    { etiqueta: 'Ingresos recibidos', valor: 'S/ 7.15M', detalle: '49% del total', icono: 'up', tono: 'green' },
    { etiqueta: 'Gastos acumulados', valor: 'S/ 6.82M', detalle: '47% del total', icono: 'down', tono: 'orange' },
    { etiqueta: 'Ganancia actual', valor: 'S/ 330K', detalle: 'Margen 4.6%', icono: 'chart', tono: 'mint' },
    { etiqueta: 'Trabajadores activos', valor: '186', detalle: 'En 4 obras', icono: 'user', tono: 'purple' },
    { etiqueta: 'Avance promedio', valor: '50.6%', detalle: 'Progreso general', icono: 'chart', tono: 'cyan' },
  ];

  readonly accesosRapidos: { vista: Vista; etiqueta: string; texto: string }[] = [
    { vista: 'portal-trabajador', etiqueta: 'Portal trabajador', texto: 'Perfil y pagos.' },
    { vista: 'portal-cliente', etiqueta: 'Portal cliente', texto: 'Avances y pagos.' },
  ];

  readonly alertasDashboardActuales = computed<AlertaDashboard[]>(() => {
    const alertasApi = this.datos.alertas().map((alerta) => ({
      tipo: alerta.tipo,
      icono: this.iconoAlerta(alerta.tipo),
      texto: alerta.texto,
      tiempo: alerta.tiempo,
    }));

    if (alertasApi.length) {
      return alertasApi.slice(0, 5);
    }

    const ingresosPendientes = this.datos.ingresos().filter((ingreso) => ingreso.estado === 'pendiente');
    const gastosPendientes = this.datos.gastos().filter((gasto) => gasto.estado === 'pendiente');
    const planillasPendientes = this.datos.planillas().filter((planilla) => !this.estadoPlanillaPagada(planilla));
    const obrasConPerdida = this.datos.obras().filter((obra) => this.gananciaObra(obra.ingresos, obra.gastos, obra.presupuesto) < 0);
    const alertas: AlertaDashboard[] = [];

    obrasConPerdida.slice(0, 2).forEach((obra) => alertas.push({
      tipo: 'danger',
      icono: 'alert-triangle',
      texto: `${obra.nombre}: gastos superan presupuesto e ingresos en ${this.formatoMoneda(Math.abs(this.gananciaObra(obra.ingresos, obra.gastos, obra.presupuesto)))}`,
      tiempo: 'actual',
    }));
    if (ingresosPendientes.length) {
      alertas.push({
        tipo: 'warning',
        icono: 'clock',
        texto: `${ingresosPendientes.length} ingresos pendientes por cobrar - ${this.formatoMoneda(ingresosPendientes.reduce((total, ingreso) => total + ingreso.monto, 0))}`,
        tiempo: 'actual',
      });
    }
    if (gastosPendientes.length) {
      alertas.push({
        tipo: 'warning',
        icono: 'alert-triangle',
        texto: `${gastosPendientes.length} gastos pendientes de pago - ${this.formatoMoneda(gastosPendientes.reduce((total, gasto) => total + gasto.monto, 0))}`,
        tiempo: 'actual',
      });
    }
    if (planillasPendientes.length) {
      alertas.push({
        tipo: 'info',
        icono: 'info',
        texto: `${planillasPendientes.length} planillas pendientes - ${this.formatoMoneda(planillasPendientes.reduce((total, planilla) => total + planilla.total, 0))}`,
        tiempo: 'actual',
      });
    }

    return alertas.length ? alertas.slice(0, 5) : [{ tipo: 'success', icono: 'check', texto: 'No hay alertas operativas pendientes.', tiempo: 'actual' }];
  });

  readonly metricasDashboardActuales = computed<MetricaDashboard[]>(() => {
    const resumen = this.datos.resumen();
    const obras = this.datos.obras();
    const ingresosRegistrados = this.datos.ingresos().reduce((total, ingreso) => total + ingreso.monto, 0);
    const gastosRegistrados = this.datos.gastos().reduce((total, gasto) => total + gasto.monto, 0);
    const planillas = this.datos.planillas().reduce((total, planilla) => total + planilla.total, 0);
    const gastosTotales = gastosRegistrados + planillas;
    const ganancia = resumen.presupuesto + ingresosRegistrados - gastosTotales;
    const baseMargen = resumen.presupuesto + ingresosRegistrados;
    const margen = baseMargen ? (ganancia / baseMargen) * 100 : 0;
    const porcentajeIngresos = resumen.presupuesto ? Math.round((ingresosRegistrados / resumen.presupuesto) * 100) : 0;
    const porcentajeGastos = resumen.presupuesto ? Math.round((gastosTotales / resumen.presupuesto) * 100) : 0;
    const obrasConPerdida = obras.filter((obra) => this.gananciaObra(obra.ingresos, obra.gastos, obra.presupuesto) < 0).length;

    return [
      { etiqueta: 'Obras activas', valor: `${resumen.obrasActivas}`, detalle: `${resumen.obrasFinalizadas} finalizadas`, icono: 'helmet', tono: 'blue' },
      { etiqueta: 'Obras registradas', valor: `${obras.length}`, detalle: `${obrasConPerdida} con perdida`, icono: 'grid', tono: obrasConPerdida ? 'red' : 'green', negativa: obrasConPerdida > 0 },
      { etiqueta: 'Presupuesto total', valor: this.formatoMillones(resumen.presupuesto), detalle: `${obras.length} obras`, icono: 'calc', tono: 'violet' },
      { etiqueta: 'Ingresos registrados', valor: this.formatoMillones(ingresosRegistrados), detalle: `${porcentajeIngresos}% del presupuesto`, icono: 'up', tono: 'green' },
      { etiqueta: 'Gastos acumulados', valor: this.formatoMillones(gastosTotales), detalle: `${porcentajeGastos}% del presupuesto`, icono: 'down', tono: 'orange' },
      { etiqueta: 'Ganancia actual', valor: this.formatoMillones(ganancia), detalle: `Margen ${this.porcentaje(margen)}`, icono: 'chart', tono: ganancia < 0 ? 'red' : 'mint', negativa: ganancia < 0 },
      { etiqueta: 'Trabajadores activos', valor: `${resumen.trabajadoresActivos}`, detalle: `${this.datos.trabajadores().length} registrados`, icono: 'user', tono: 'purple' },
      { etiqueta: 'Avance promedio', valor: this.porcentaje(resumen.avance), detalle: 'Progreso general', icono: 'chart', tono: 'cyan' },
    ];
  });

  readonly categoriasDocumentos = [
    'Todos',
    'Contratos',
    'Planos',
    'Licencias',
    'Comprobantes',
    'Facturas',
    'Boletas',
    'Informes',
    'Fotografías',
    'Actas',
    'Certificados',
    'Otros',
  ];

  readonly documentosSistema = [
    { nombre: 'Contrato principal Las Torres.pdf', tipo: 'PDF', tamano: '2.4 MB', fecha: '15 Mar 2024', tono: 'red' },
    { nombre: 'Plano estructural E-01.dwg', tipo: 'DWG', tamano: '8.1 MB', fecha: '01 Mar 2024', tono: 'blue' },
    { nombre: 'Licencia de construcción.pdf', tipo: 'PDF', tamano: '0.8 MB', fecha: '20 Feb 2024', tono: 'red' },
    { nombre: 'Factura F001-00234.pdf', tipo: 'PDF', tamano: '0.3 MB', fecha: '20 Nov 2024', tono: 'orange' },
    { nombre: 'Informe mensual Octubre 2024.docx', tipo: 'DOCX', tamano: '0.9 MB', fecha: '31 Oct 2024', tono: 'blue' },
    { nombre: 'Acta de inicio de obra.pdf', tipo: 'PDF', tamano: '0.5 MB', fecha: '01 Mar 2024', tono: 'red' },
    { nombre: 'Fotos avance Nov 22.zip', tipo: 'ZIP', tamano: '45.2 MB', fecha: '22 Nov 2024', tono: 'violet' },
  ];

  readonly reportesDisponibles = [
    { nombre: 'Planillas por período', detalle: 'Detalle de pagos y descuentos de trabajadores' },
    { nombre: 'Trabajadores', detalle: 'Listado y ficha técnica del personal' },
    { nombre: 'Gastos', detalle: 'Egresos por categoría, obra y período' },
    { nombre: 'Ingresos', detalle: 'Pagos de clientes y valorizaciones' },
    { nombre: 'Ganancias y rentabilidad', detalle: 'Análisis financiero y márgenes por obra' },
    { nombre: 'Ejecucion financiera', detalle: 'Presupuesto base frente a ingresos, gastos y ganancia' },
    { nombre: 'Flujo de caja', detalle: 'Ingresos vs. egresos y proyecciones' },
    { nombre: 'Cuentas por cobrar', detalle: 'Saldos pendientes y fechas de vencimiento' },
    { nombre: 'Comparación de costos', detalle: 'Análisis comparativo entre obras' },
  ];

  readonly usuariosSistema = [
    { nombre: 'Carlos Mendoza López', correo: 'cmendoza@cc.pe', rol: 'Administrador', estado: 'activo', foto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&auto=format' },
    { nombre: 'Ana Quispe Mamani', correo: 'aquispe@cc.pe', rol: 'Ing. Residente', estado: 'activo', foto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&auto=format' },
    { nombre: 'Rosa Chávez Torres', correo: 'rchavez@cc.pe', rol: 'Almacenero', estado: 'activo', foto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&auto=format' },
    { nombre: 'Luis García Rojas', correo: 'lgarcia@cc.pe', rol: 'Contador', estado: 'activo', foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&auto=format' },
    { nombre: 'Inmobiliaria Pacífico', correo: 'admin@inmpac.pe', rol: 'Cliente', estado: 'activo', foto: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=96&h=96&fit=crop&auto=format' },
  ];

  readonly obraForm = this.fb.nonNullable.group({
    codigo: ['', Validators.required],
    nombre: ['', Validators.required],
    cliente: ['', Validators.required],
    ubicacion: ['', Validators.required],
    presupuesto: [null as number | null, [Validators.required, Validators.min(0)]],
    avance: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    estado: ['en_ejecucion' as EstadoObra, Validators.required],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
  });

  readonly trabajadorForm = this.fb.nonNullable.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    cargo: ['' as Trabajador['cargo'] | '', Validators.required],
    estado: ['activo' as Trabajador['estado'], Validators.required],
  });

  readonly cargoForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    sueldo: [null as number | null, [Validators.required, Validators.min(0)]],
    estado: ['activo' as Cargo['estado'], Validators.required],
  });

  readonly clienteForm = this.fb.nonNullable.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    telefono: ['', Validators.required],
    direccion: [''],
    estado: ['activo' as Cliente['estado'], Validators.required],
  });

  readonly categoriaGastoForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    estado: ['activo' as CategoriaGasto['estado'], Validators.required],
  });

  readonly tipoIngresoForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    estado: ['activo' as TipoIngreso['estado'], Validators.required],
  });

  readonly planillaForm = this.fb.nonNullable.group({
    obraId: [1, Validators.required],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
  });

  readonly gastoForm = this.fb.nonNullable.group({
    obraId: [null as number | null, Validators.required],
    categoria: ['', Validators.required],
    descripcion: ['', Validators.required],
    monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    fecha: ['', Validators.required],
    estado: ['pendiente' as Gasto['estado'], Validators.required],
  });

  readonly ingresoForm = this.fb.nonNullable.group({
    obraId: [null as number | null, Validators.required],
    cliente: ['', Validators.required],
    tipo: ['', Validators.required],
    monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    fecha: ['', Validators.required],
    estado: ['pendiente' as Ingreso['estado'], Validators.required],
  });

  readonly compraForm = this.fb.nonNullable.group({
    materialId: [1, Validators.required],
    cantidad: [30, [Validators.required, Validators.min(1)]],
    precioUnitario: [28, [Validators.required, Validators.min(0)]],
    proveedor: ['Proveedor registrado en compra', Validators.required],
    comprobante: ['F002-8891', Validators.required],
  });

  readonly etiquetasObraForm: Record<string, string> = {
    codigo: 'Codigo',
    nombre: 'Nombre',
    cliente: 'Cliente',
    ubicacion: 'Ubicacion',
    presupuesto: 'Presupuesto',
    avance: 'Avance',
    fechaInicio: 'Inicio',
    fechaFin: 'Fin estimado',
  };

  readonly etiquetasTrabajadorForm: Record<string, string> = {
    nombres: 'Nombres',
    apellidos: 'Apellidos',
    dni: 'DNI',
    cargo: 'Cargo',
  };

  readonly etiquetasCargoForm: Record<string, string> = {
    nombre: 'Nombre del cargo',
    sueldo: 'Sueldo',
  };

  readonly etiquetasClienteForm: Record<string, string> = {
    nombres: 'Nombres',
    apellidos: 'Apellidos',
    telefono: 'Telefono',
  };

  readonly etiquetasCategoriaGastoForm: Record<string, string> = {
    nombre: 'Nombre',
  };

  readonly etiquetasTipoIngresoForm: Record<string, string> = {
    nombre: 'Nombre',
  };

  readonly etiquetasPlanillaForm: Record<string, string> = {
    obraId: 'Obra',
    fechaInicio: 'Fecha de inicio',
    fechaFin: 'Fecha fin',
  };

  readonly etiquetasGastoForm: Record<string, string> = {
    descripcion: 'Descripcion',
    obraId: 'Obra',
    categoria: 'Categoria',
    monto: 'Monto',
    fecha: 'Fecha',
  };

  readonly etiquetasIngresoForm: Record<string, string> = {
    obraId: 'Obra',
    cliente: 'Cliente',
    tipo: 'Tipo',
    monto: 'Monto',
    fecha: 'Fecha',
  };

  readonly etiquetasCompraForm: Record<string, string> = {
    materialId: 'Material',
    cantidad: 'Cantidad',
    precioUnitario: 'Precio unitario',
    proveedor: 'Proveedor',
  };

  readonly obrasFiltradas = computed(() => {
    const termino = this.busqueda().toLowerCase().trim();
    const estado = this.filtroEstadoObra();
    const orden = this.ordenObras();
    return this.datos.obras().filter((obra) =>
      [obra.codigo, obra.nombre, obra.cliente, obra.ubicacion]
        .join(' ')
        .toLowerCase()
        .includes(termino),
    )
      .filter((obra) => estado === 'todos' || obra.estado === estado)
      .sort((a, b) => {
        if (orden === 'avance') return b.avance - a.avance;
        if (orden === 'presupuesto') return b.presupuesto - a.presupuesto;
        return a.nombre.localeCompare(b.nombre);
      });
  });

  readonly trabajadoresFiltrados = computed(() => {
    const termino = this.busqueda().toLowerCase().trim();
    const cargo = this.filtroCargoTrabajador();
    const estado = this.filtroEstadoTrabajador();
    return this.datos
      .trabajadores()
      .filter((trabajador) =>
        [trabajador.nombres, trabajador.apellidos, trabajador.dni, this.cargoTrabajadorEtiqueta(trabajador.cargo)]
          .join(' ')
          .toLowerCase()
          .includes(termino),
      )
      .filter((trabajador) => cargo === 'todos' || trabajador.cargo === cargo)
      .filter((trabajador) => estado === 'todos' || trabajador.estado === estado);
  });

  readonly obraSeleccionada = computed(() => this.datos.obras()[0]);
  readonly asistenciaResumen = computed(() => {
    const asistencias = this.datos.asistencias();
    return {
      presente: asistencias.filter((asistencia) => asistencia.estado === 'presente').length,
      tardanza: asistencias.filter((asistencia) => asistencia.estado === 'tardanza').length,
      falta: asistencias.filter((asistencia) => asistencia.estado === 'falta').length,
      permiso: asistencias.filter((asistencia) => asistencia.estado === 'permiso').length,
      descanso: asistencias.filter((asistencia) => asistencia.estado === 'descanso').length,
      total: asistencias.length,
      fecha: asistencias[0]?.fecha ?? '2024-11-22',
    };
  });
  readonly asistenciaPorcentaje = computed(() => {
    const resumen = this.asistenciaResumen();
    return resumen.total ? Math.round((resumen.presente / resumen.total) * 100) : 0;
  });
  readonly obraPlanillasSeleccionada = computed(() => {
    const obras = this.datos.obras();
    const seleccionadaId = this.obraPlanillasSeleccionadaId();
    if (!obras.length || seleccionadaId === null) {
      return null;
    }
    return obras.find((obra) => obra.id === seleccionadaId) ?? null;
  });
  readonly planillasFiltradas = computed(() => {
    const obra = this.obraPlanillasSeleccionada();
    if (!obra) {
      return this.datos.planillas();
    }
    return this.datos.planillas().filter((planilla) => planilla.obraId === obra.id);
  });
  readonly planillasResumen = computed(() => {
    const planillas = this.planillasFiltradas();
    return {
      total: planillas.length,
      pendientes: planillas.filter((planilla) => planilla.estado.toLowerCase() === 'pendiente').length,
      aprobadas: planillas.filter((planilla) => this.estadoPlanillaPagada(planilla)).length,
      monto: planillas.reduce((total, planilla) => total + planilla.total, 0),
    };
  });
  readonly obraGastosSeleccionada = computed(() => {
    const obras = this.datos.obras();
    if (!obras.length) {
      return null;
    }
    const seleccionadaId = this.obraGastosSeleccionadaId();
    return seleccionadaId ? obras.find((obra) => obra.id === seleccionadaId) ?? null : null;
  });
  readonly gastosFiltrados = computed(() => {
    const obra = this.obraGastosSeleccionada();
    const termino = this.busqueda().trim().toLowerCase();
    const categoria = this.filtroCategoriaGasto();
    const estado = this.filtroEstadoGasto();
    const inicio = this.fechaInicioGasto();
    const fin = this.fechaFinGasto();

    return this.datos.gastos()
      .filter((gasto) => !obra || gasto.obraId === obra.id)
      .filter((gasto) => !termino || [gasto.categoria, gasto.descripcion].join(' ').toLowerCase().includes(termino))
      .filter((gasto) => categoria === 'todas' || gasto.categoria === categoria)
      .filter((gasto) => estado === 'todos' || gasto.estado === estado)
      .filter((gasto) => !inicio || gasto.fecha >= inicio)
      .filter((gasto) => !fin || gasto.fecha <= fin);
  });
  readonly gastosResumen = computed(() => {
    const gastos = this.gastosFiltrados();
    const sumar = (estado?: Gasto['estado']) => gastos
      .filter((gasto) => !estado || gasto.estado === estado)
      .reduce((total, gasto) => total + gasto.monto, 0);
    return {
      total: sumar(),
      registros: gastos.length,
      pendientes: sumar('pendiente'),
      pagados: sumar('pagado'),
      cantidadPendientes: gastos.filter((gasto) => gasto.estado === 'pendiente').length,
      cantidadPagados: gastos.filter((gasto) => gasto.estado === 'pagado').length,
    };
  });
  readonly obraIngresosSeleccionada = computed(() => {
    const obras = this.datos.obras();
    if (!obras.length) {
      return null;
    }
    const seleccionadaId = this.obraIngresosSeleccionadaId();
    return seleccionadaId ? obras.find((obra) => obra.id === seleccionadaId) ?? null : null;
  });
  readonly ingresosFiltrados = computed(() => {
    const obra = this.obraIngresosSeleccionada();
    const termino = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstadoIngreso();

    return this.datos.ingresos()
      .filter((ingreso) => !obra || ingreso.obraId === obra.id)
      .filter((ingreso) => !termino || [ingreso.cliente, ingreso.tipo, this.datos.nombreObra(ingreso.obraId)].join(' ').toLowerCase().includes(termino))
      .filter((ingreso) => estado === 'todos' || ingreso.estado === estado);
  });
  readonly ingresosResumen = computed(() => {
    const obra = this.obraIngresosSeleccionada();
    const ingresos = this.ingresosFiltrados();
    const contratado = obra?.presupuesto ?? this.datos.obras().reduce((total, item) => total + item.presupuesto, 0);
    const sumar = (estado?: Ingreso['estado']) => ingresos
      .filter((ingreso) => !estado || ingreso.estado === estado)
      .reduce((total, ingreso) => total + ingreso.monto, 0);
    return {
      contratado,
      total: sumar(),
      recibidos: sumar('pagado'),
      porCobrar: sumar('pendiente'),
      registros: ingresos.length,
      porcentaje: contratado ? Math.round((sumar('pagado') / contratado) * 100) : 0,
    };
  });
  readonly obraReportesSeleccionada = computed(() => {
    const obras = this.datos.obras();
    const seleccionadaId = this.obraReportesSeleccionadaId();
    return seleccionadaId ? obras.find((obra) => obra.id === seleccionadaId) ?? null : null;
  });
  readonly obrasReporte = computed(() => {
    const obra = this.obraReportesSeleccionada();
    return obra ? [obra] : this.datos.obras();
  });
  readonly ingresosReporte = computed(() => {
    const obra = this.obraReportesSeleccionada();
    return this.datos.ingresos().filter((ingreso) => !obra || ingreso.obraId === obra.id);
  });
  readonly gastosReporte = computed(() => {
    const obra = this.obraReportesSeleccionada();
    return this.datos.gastos().filter((gasto) => !obra || gasto.obraId === obra.id);
  });
  readonly planillasReporte = computed(() => {
    const obra = this.obraReportesSeleccionada();
    return this.datos.planillas().filter((planilla) => !obra || planilla.obraId === obra.id);
  });
  readonly obrasRecientesDashboard = computed(() =>
    [...this.datos.obras()]
      .sort((a, b) => b.id - a.id)
      .slice(0, 5),
  );
  readonly resumenOperativoDashboard = computed(() => {
    const ingresosPendientes = this.datos.ingresos().filter((ingreso) => ingreso.estado === 'pendiente');
    const gastosPendientes = this.datos.gastos().filter((gasto) => gasto.estado === 'pendiente');
    const planillasPendientes = this.datos.planillas().filter((planilla) => !this.estadoPlanillaPagada(planilla));
    const porCobrar = ingresosPendientes.reduce((total, ingreso) => total + ingreso.monto, 0);
    const porPagar = gastosPendientes.reduce((total, gasto) => total + gasto.monto, 0)
      + planillasPendientes.reduce((total, planilla) => total + planilla.total, 0);
    const proximaPlanilla = [...planillasPendientes].sort((a, b) => (a.fechaInicio ?? '').localeCompare(b.fechaInicio ?? '') || a.id - b.id)[0];

    return [
      {
        etiqueta: 'Cuentas por cobrar',
        valor: this.formatoMillones(porCobrar),
        detalle: `${ingresosPendientes.length} ingresos pendientes`,
        tono: 'orange',
      },
      {
        etiqueta: 'Cuentas por pagar',
        valor: this.formatoMillones(porPagar),
        detalle: `${gastosPendientes.length + planillasPendientes.length} compromisos pendientes`,
        tono: porPagar > 0 ? 'red' : 'green',
      },
      {
        etiqueta: 'Proxima planilla',
        valor: proximaPlanilla ? this.formatoMoneda(proximaPlanilla.total) : this.formatoMoneda(0),
        detalle: proximaPlanilla ? `${proximaPlanilla.periodo} - ${proximaPlanilla.obra}` : 'Sin planillas pendientes',
        tono: proximaPlanilla ? 'blue' : 'green',
      },
    ];
  });
  readonly progresoFinancieroDashboard = computed(() => {
    const resumen = this.datos.resumen();
    const ingresosRegistrados = this.datos.ingresos().reduce((total, ingreso) => total + ingreso.monto, 0);
    const gastosTotales = this.datos.gastos().reduce((total, gasto) => total + gasto.monto, 0)
      + this.datos.planillas().reduce((total, planilla) => total + planilla.total, 0);
    const ganancia = resumen.presupuesto + ingresosRegistrados - gastosTotales;
    const baseMargen = resumen.presupuesto + ingresosRegistrados;

    return {
      cobranza: resumen.presupuesto ? Math.min(100, Math.round((ingresosRegistrados / resumen.presupuesto) * 100)) : 0,
      ejecucion: resumen.presupuesto ? Math.min(100, Math.round((gastosTotales / resumen.presupuesto) * 100)) : 0,
      margen: baseMargen ? Math.round((ganancia / baseMargen) * 100) : 0,
      ingresosPagados: ingresosRegistrados,
      gastosTotales,
      ganancia,
    };
  });
  readonly progresoFinancieroReporte = computed(() => {
    const presupuesto = this.obrasReporte().reduce((total, obra) => total + obra.presupuesto, 0);
    const ingresosRegistrados = this.ingresosReporte().reduce((total, ingreso) => total + ingreso.monto, 0);
    const gastosTotales = this.gastosReporte().reduce((total, gasto) => total + gasto.monto, 0)
      + this.planillasReporte().reduce((total, planilla) => total + planilla.total, 0);
    const ganancia = presupuesto + ingresosRegistrados - gastosTotales;
    const baseMargen = presupuesto + ingresosRegistrados;

    return {
      presupuesto,
      ingresosRegistrados,
      gastosTotales,
      ganancia,
      cobranza: presupuesto ? Math.min(100, Math.round((ingresosRegistrados / presupuesto) * 100)) : 0,
      ejecucion: presupuesto ? Math.min(100, Math.round((gastosTotales / presupuesto) * 100)) : 0,
      margen: baseMargen ? Math.round((ganancia / baseMargen) * 100) : 0,
    };
  });
  readonly rentabilidadObrasReporte = computed(() =>
    this.obrasReporte()
      .map((obra) => {
        const ingresos = this.datos.ingresos()
          .filter((ingreso) => ingreso.obraId === obra.id)
          .reduce((total, ingreso) => total + ingreso.monto, 0);
        const gastos = this.datos.gastos()
          .filter((gasto) => gasto.obraId === obra.id)
          .reduce((total, gasto) => total + gasto.monto, 0)
          + this.datos.planillas()
            .filter((planilla) => planilla.obraId === obra.id)
            .reduce((total, planilla) => total + planilla.total, 0);
        const ganancia = this.gananciaObra(ingresos, gastos, obra.presupuesto);
        const baseMargen = obra.presupuesto + ingresos;
        const margen = baseMargen ? Math.round((ganancia / baseMargen) * 100) : 0;
        return {
          nombre: obra.nombre.length > 24 ? `${obra.nombre.slice(0, 24)}...` : obra.nombre,
          margen,
          ancho: Math.min(100, Math.max(8, Math.abs(margen) * 3)),
          negativa: margen < 0,
        };
      })
      .sort((a, b) => b.margen - a.margen)
      .slice(0, 6),
  );
  readonly categoriasGastoReporte = computed(() => {
    const grupos = new Map<string, number>();
    this.gastosReporte().forEach((gasto) => grupos.set(gasto.categoria, (grupos.get(gasto.categoria) ?? 0) + gasto.monto));
    const totalPlanillas = this.planillasReporte().reduce((total, planilla) => total + planilla.total, 0);
    if (totalPlanillas > 0) {
      grupos.set('Planillas', (grupos.get('Planillas') ?? 0) + totalPlanillas);
    }
    const total = [...grupos.values()].reduce((suma, monto) => suma + monto, 0);

    return [...grupos.entries()]
      .map(([categoria, monto]) => ({
        categoria,
        monto,
        porcentaje: total ? Math.round((monto / total) * 100) : 0,
      }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 6);
  });
  readonly graficoIngresosGastosReporte = computed(() => {
    const ingresosPorMes = new Map<string, number>();
    const gastosPorMes = new Map<string, number>();
    const fechasMovimiento: Date[] = [];
    const registrarMovimiento = (mapa: Map<string, number>, fechaTexto: string | undefined, monto: number) => {
      if (!fechaTexto) {
        return;
      }
      const fecha = new Date(`${fechaTexto}T00:00:00`);
      if (Number.isNaN(fecha.getTime())) {
        return;
      }
      const clave = this.claveMes(fecha);
      mapa.set(clave, (mapa.get(clave) ?? 0) + monto);
      fechasMovimiento.push(fecha);
    };

    this.ingresosReporte().forEach((ingreso) => registrarMovimiento(ingresosPorMes, ingreso.fecha, ingreso.monto));
    this.gastosReporte().forEach((gasto) => registrarMovimiento(gastosPorMes, gasto.fecha, gasto.monto));
    this.planillasReporte().forEach((planilla) => registrarMovimiento(gastosPorMes, planilla.fechaInicio ?? planilla.fechaFin, planilla.total));

    const fechaFinal = fechasMovimiento.length
      ? new Date(Math.max(...fechasMovimiento.map((fecha) => fecha.getTime())))
      : new Date();
    const meses = Array.from({ length: 6 }, (_, indice) => new Date(fechaFinal.getFullYear(), fechaFinal.getMonth() - (5 - indice), 1));
    const puntos = meses.map((fecha) => {
      const clave = this.claveMes(fecha);
      return {
        etiqueta: this.etiquetaMes(fecha),
        valorA: ingresosPorMes.get(clave) ?? 0,
        valorB: gastosPorMes.get(clave) ?? 0,
      };
    });
    const maximoReal = Math.max(0, ...puntos.flatMap((punto) => [punto.valorA, punto.valorB ?? 0]));
    const maximo = Math.max(1, maximoReal);
    const baseX = 58;
    const baseY = 216;
    const ancho = 800;
    const alto = 192;
    const paso = puntos.length > 1 ? ancho / (puntos.length - 1) : ancho;
    const puntoSvg = (valor: number, indice: number) => {
      const x = baseX + paso * indice;
      const y = baseY - (valor / maximo) * alto;
      return `${Math.round(x)},${Math.round(y)}`;
    };

    return {
      ingresos: puntos.map((punto, indice) => puntoSvg(punto.valorA, indice)).join(' '),
      gastos: puntos.map((punto, indice) => puntoSvg(punto.valorB ?? 0, indice)).join(' '),
      etiquetas: puntos.map((punto, indice) => ({
        etiqueta: punto.etiqueta,
        x: Math.round(baseX + paso * indice - 6),
      })),
      maximo: maximoReal ? this.formatoMillones(maximoReal) : 'S/ 0',
    };
  });
  readonly cuentasPendientesReporte = computed(() => {
    const ingresosPendientes = this.ingresosReporte().filter((ingreso) => ingreso.estado === 'pendiente');
    const gastosPendientes = this.gastosReporte().filter((gasto) => gasto.estado === 'pendiente');
    const planillasPendientes = this.planillasReporte().filter((planilla) => !this.estadoPlanillaPagada(planilla));
    const totalIngresos = ingresosPendientes.reduce((total, ingreso) => total + ingreso.monto, 0);
    const totalGastos = gastosPendientes.reduce((total, gasto) => total + gasto.monto, 0);
    const totalPlanillas = planillasPendientes.reduce((total, planilla) => total + planilla.total, 0);

    return [
      {
        titulo: 'Por cobrar',
        monto: totalIngresos,
        detalle: `${ingresosPendientes.length} ingresos pendientes`,
        tono: 'orange',
      },
      {
        titulo: 'Gastos por pagar',
        monto: totalGastos,
        detalle: `${gastosPendientes.length} gastos pendientes`,
        tono: 'red',
      },
      {
        titulo: 'Planillas por pagar',
        monto: totalPlanillas,
        detalle: `${planillasPendientes.length} planillas pendientes`,
        tono: 'blue',
      },
    ];
  });
  readonly planillasTablaReporte = computed(() => {
    const planillas = [...this.planillasReporte()].sort((a, b) => this.compararPlanillasPorFecha(a, b));
    const obra = this.obraReportesSeleccionada();

    const filaPlanilla = (planilla: Planilla, numero?: number) => ({
      periodo: numero ? this.periodoSemana(
        numero,
        this.fechaLocal(planilla.fechaInicio ?? ''),
        this.fechaLocal(planilla.fechaFin ?? ''),
      ) : planilla.periodo,
      obra: planilla.obra,
      trabajadores: planilla.trabajadores,
      total: planilla.total,
      estado: this.estadoPlanillaEtiqueta(planilla),
      vacia: false,
    });

    if (!obra || !planillas.length) {
      return planillas.map((planilla) => filaPlanilla(planilla)).reverse();
    }

    const primeraFecha = planillas
      .map((planilla) => this.fechaLocal(planilla.fechaInicio ?? ''))
      .find((fecha): fecha is Date => fecha !== null);

    if (!primeraFecha) {
      return planillas.map((planilla, indice) => filaPlanilla(planilla, indice + 1)).reverse();
    }

    const porSemana = new Map<number, Planilla[]>();
    let semanaMaxima = 1;
    planillas.forEach((planilla, indice) => {
      const fecha = this.fechaLocal(planilla.fechaInicio ?? '');
      const numeroSemana = fecha
        ? Math.max(1, Math.floor(this.diferenciaDias(primeraFecha, fecha) / 7) + 1)
        : indice + 1;
      semanaMaxima = Math.max(semanaMaxima, numeroSemana);
      porSemana.set(numeroSemana, [...(porSemana.get(numeroSemana) ?? []), planilla]);
    });

    const filas: Array<{ periodo: string; obra: string; trabajadores: number; total: number; estado: string; vacia: boolean }> = [];
    for (let numero = 1; numero <= semanaMaxima; numero += 1) {
      const planillasSemana = porSemana.get(numero) ?? [];
      if (!planillasSemana.length) {
        const inicio = this.sumarDias(primeraFecha, (numero - 1) * 7);
        const fin = this.sumarDias(inicio, this.diasBasePlanilla - 1);
        filas.push({
          periodo: this.periodoSemana(numero, inicio, fin),
          obra: obra.nombre,
          trabajadores: 0,
          total: 0,
          estado: 'Sin trabajo',
          vacia: true,
        });
        continue;
      }
      planillasSemana.forEach((planilla) => filas.push(filaPlanilla(planilla, numero)));
    }

    return filas.reverse();
  });
  readonly comparativoObrasReporte = computed(() =>
    this.obrasReporte()
      .map((obra) => {
        const ingresos = this.datos.ingresos()
          .filter((ingreso) => ingreso.obraId === obra.id)
          .reduce((total, ingreso) => total + ingreso.monto, 0);
        const gastosDirectos = this.datos.gastos()
          .filter((gasto) => gasto.obraId === obra.id)
          .reduce((total, gasto) => total + gasto.monto, 0);
        const planillas = this.datos.planillas()
          .filter((planilla) => planilla.obraId === obra.id)
          .reduce((total, planilla) => total + planilla.total, 0);
        const gastos = gastosDirectos + planillas;
        const ganancia = this.gananciaObra(ingresos, gastos, obra.presupuesto);
        const baseMargen = obra.presupuesto + ingresos;

        return {
          obra: obra.nombre,
          cliente: obra.cliente,
          presupuesto: obra.presupuesto,
          ingresos,
          gastos,
          planillas,
          ganancia,
          margen: baseMargen ? Math.round((ganancia / baseMargen) * 100) : 0,
          estado: this.estadoObraEtiqueta(obra.estado),
        };
      })
      .sort((a, b) => b.ganancia - a.ganancia),
  );
  readonly trabajadoresPlanilla = computed(() => this.datos.trabajadores().filter((trabajador) => trabajador.estado === 'activo'));
  readonly diasMaximosPlanilla = computed(() => {
    this.planillaRangoVersion();
    const { fechaInicio, fechaFin } = this.planillaForm.getRawValue();
    return this.diasEntreFechas(fechaInicio, fechaFin);
  });
  readonly totalPlanillaPreview = computed(() =>
    this.trabajadoresPlanilla().reduce((total, trabajador) => {
      const dias = this.diasPlanilla()[trabajador.id] ?? 0;
      const horasExtras = this.horasExtrasPlanilla()[trabajador.id] ?? 0;
      return total + this.subtotalPlanillaTrabajador(trabajador, dias, horasExtras);
    }, 0),
  );
  readonly trabajadoresIncluidosPlanilla = computed(() =>
    this.trabajadoresPlanilla().filter((trabajador) => (this.diasPlanilla()[trabajador.id] ?? 0) > 0 || (this.horasExtrasPlanilla()[trabajador.id] ?? 0) > 0).length,
  );
  readonly obraDetalle = computed(() => {
    const id = this.obraDetalleId();
    return id ? this.datos.obras().find((obra) => obra.id === id) ?? null : null;
  });
  readonly planillasObraDetalle = computed(() => {
    const obra = this.obraDetalle();
    return obra ? this.datos.planillas().filter((planilla) => planilla.obraId === obra.id) : [];
  });
  readonly gastosObraDetalle = computed(() => {
    const obra = this.obraDetalle();
    return obra ? this.datos.gastos().filter((gasto) => gasto.obraId === obra.id) : [];
  });
  readonly ingresosObraDetalle = computed(() => {
    const obra = this.obraDetalle();
    return obra ? this.datos.ingresos().filter((ingreso) => ingreso.obraId === obra.id) : [];
  });
  readonly obraEliminando = computed(() => {
    const id = this.obraEliminandoId();
    return id ? this.datos.obras().find((obra) => obra.id === id) ?? null : null;
  });
  readonly resumenEliminacionObra = computed<ResumenEliminacionObra>(() => {
    const obra = this.obraEliminando();
    if (!obra) {
      return {
        planillasCantidad: 0,
        planillasTotal: 0,
        gastosCantidad: 0,
        gastosTotal: 0,
        ingresosCantidad: 0,
        ingresosTotal: 0,
        otrosRegistros: 0,
        totalRegistros: 0,
        puedeEliminar: false,
      };
    }

    const planillas = this.datos.planillas().filter((planilla) => planilla.obraId === obra.id);
    const gastos = this.datos.gastos().filter((gasto) => gasto.obraId === obra.id);
    const ingresos = this.datos.ingresos().filter((ingreso) => ingreso.obraId === obra.id);
    const sumar = <T extends { monto?: number; total?: number }>(items: T[]) =>
      items.reduce((total, item) => total + Number(item.monto ?? item.total ?? 0), 0);
    const totalRegistros = planillas.length + gastos.length + ingresos.length;

    return {
      planillasCantidad: planillas.length,
      planillasTotal: sumar(planillas),
      gastosCantidad: gastos.length,
      gastosTotal: sumar(gastos),
      ingresosCantidad: ingresos.length,
      ingresosTotal: sumar(ingresos),
      otrosRegistros: 0,
      totalRegistros,
      puedeEliminar: totalRegistros === 0,
    };
  });

  constructor() {
    this.datos.cargarDatos();
    this.route.data.subscribe((data) => {
      const vistaRuta = data['vista'] as Vista | undefined;
      if (vistaRuta) {
        this.vista.set(vistaRuta);
        this.vistaDetalleObra.set(false);
        this.obraDetalleId.set(null);
        this.busqueda.set('');
        if (this.esVistaMantenedor(vistaRuta)) {
          this.mantenedorMenuAbierto.set(true);
          this.mantenedorTab.set(vistaRuta);
          this.gastosMantenedorAbierto.set(vistaRuta === 'categorias-gasto');
          this.ingresosMantenedorAbierto.set(vistaRuta === 'tipos-ingreso');
        }
      }
    });
  }

  cerrarSesion(): void {
    this.menuUsuarioAbierto.set(false);
    this.auth.cerrarSesion();
    this.vista.set('dashboard');
    this.vistaDetalleObra.set(false);
    this.obraDetalleId.set(null);
    this.router.navigate(['/login']);
  }

  navegar(vista: Vista): void {
    this.menuUsuarioAbierto.set(false);
    this.vista.set(vista);
    this.vistaDetalleObra.set(false);
    this.obraDetalleId.set(null);
    this.busqueda.set('');
    this.filtroCargoTrabajador.set('todos');
    this.filtroEstadoTrabajador.set('todos');
    if (this.esVistaMantenedor(vista)) {
      this.mantenedorMenuAbierto.set(true);
      this.mantenedorTab.set(vista);
      if (vista === 'categorias-gasto') {
        this.gastosMantenedorAbierto.set(true);
        this.ingresosMantenedorAbierto.set(false);
      } else if (vista === 'tipos-ingreso') {
        this.ingresosMantenedorAbierto.set(true);
        this.gastosMantenedorAbierto.set(false);
      }
    }
    this.menuMovilAbierto.set(false);
    this.router.navigate([this.rutaParaVista(vista)]);
  }

  alternarGrupoMantenedor(grupo: 'gastos' | 'ingresos'): void {
    if (grupo === 'gastos') {
      const abrir = !this.gastosMantenedorAbierto();
      this.gastosMantenedorAbierto.set(abrir);
      this.ingresosMantenedorAbierto.set(false);
      return;
    }

    const abrir = !this.ingresosMantenedorAbierto();
    this.ingresosMantenedorAbierto.set(abrir);
    this.gastosMantenedorAbierto.set(false);
  }

  alternarTema(): void {
    this.tema.alternar();
  }

  private rutaParaVista(vista: Vista): string {
    const rutas: Partial<Record<Vista, string>> = {
      dashboard: '/dashboard',
      obras: '/obras',
      mantenedor: '/mantenedor/trabajadores',
      trabajadores: '/mantenedor/trabajadores',
      cargos: '/mantenedor/cargos',
      clientes: '/mantenedor/clientes',
      'categorias-gasto': '/mantenedor/categorias-gasto',
      'tipos-ingreso': '/mantenedor/tipos-ingreso',
      planillas: '/planillas',
      gastos: '/gastos',
      ingresos: '/ingresos',
      reportes: '/reportes',
      usuarios: '/usuarios',
      configuracion: '/configuracion',
    };
    return rutas[vista] ?? '/dashboard';
  }

  abrirModal(tipo: Exclude<ModalActivo, 'eliminar-obra' | 'confirmar-eliminar' | 'planilla-detalle'>): void {
    if (tipo === 'trabajador') {
      this.prepararNuevoTrabajador();
    }
    if (tipo === 'obra') {
      this.prepararNuevaObra();
    }
    if (tipo === 'cargo') {
      this.prepararNuevoCargo();
    }
    if (tipo === 'cliente') {
      this.prepararNuevoCliente();
    }
    if (tipo === 'categoria-gasto') {
      this.prepararNuevaCategoriaGasto();
    }
    if (tipo === 'tipo-ingreso') {
      this.prepararNuevoTipoIngreso();
    }
    if (tipo === 'planilla') {
      this.prepararNuevaPlanilla();
    }
    if (tipo === 'gasto') {
      this.prepararNuevoGasto();
    }
    if (tipo === 'ingreso') {
      this.prepararNuevoIngreso();
    }
    this.modalActivo.set(tipo);
  }

  cerrarModal(): void {
    this.modalActivo.set(null);
    this.confirmacionEliminar.set(null);
    this.obraEditandoId.set(null);
    this.obraEliminandoId.set(null);
    this.trabajadorEditandoId.set(null);
    this.cargoEditandoId.set(null);
    this.clienteEditandoId.set(null);
    this.categoriaGastoEditandoId.set(null);
    this.tipoIngresoEditandoId.set(null);
    this.planillaEditandoId.set(null);
    this.gastoEditandoId.set(null);
    this.ingresoEditandoId.set(null);
  }

  confirmarEliminacion(): void {
    const confirmacion = this.confirmacionEliminar();
    if (!confirmacion) {
      this.cerrarModal();
      return;
    }
    confirmacion.accion();
  }

  private abrirConfirmacionEliminar(configuracion: Omit<ConfirmacionEliminacion, 'confirmarTexto'> & { confirmarTexto?: string }): void {
    this.confirmacionEliminar.set({
      ...configuracion,
      confirmarTexto: configuracion.confirmarTexto ?? 'Eliminar',
    });
    this.modalActivo.set('confirmar-eliminar');
  }

  guardarObra(): void {
    if (!this.validarFormulario(this.obraForm)) {
      return;
    }
    const formulario = this.obraForm.getRawValue();
    if (formulario.fechaFin < formulario.fechaInicio) {
      this.mostrarMensaje('La fecha fin debe ser igual o posterior a la fecha de inicio.');
      return;
    }
    const datos: DatosObra = {
      codigo: formulario.codigo.trim(),
      nombre: formulario.nombre.trim(),
      cliente: formulario.cliente.trim(),
      ubicacion: formulario.ubicacion.trim(),
      presupuesto: Number(formulario.presupuesto),
      avance: Number(formulario.avance),
      estado: formulario.estado,
      fechaInicio: formulario.fechaInicio,
      fechaFin: formulario.fechaFin,
    };
    const obraId = this.obraEditandoId();
    if (obraId) {
      this.datos.actualizarObra(obraId, datos);
    } else {
      this.datos.crearObra(datos);
    }
    this.cerrarModal();
    this.vista.set('obras');
    this.mostrarMensaje(obraId ? 'Obra actualizada correctamente.' : 'Obra creada y visible en el listado.');
  }

  verObra(obra: Obra): void {
    this.menuUsuarioAbierto.set(false);
    this.menuMovilAbierto.set(false);
    this.router.navigate(['/obras']).then(() => {
      this.vista.set('obras');
      this.vistaDetalleObra.set(true);
      this.obraDetalleId.set(obra.id);
    });
  }

  volverListadoObras(): void {
    this.vistaDetalleObra.set(false);
    this.obraDetalleId.set(null);
  }

  prepararNuevaObra(): void {
    this.obraEditandoId.set(null);
    this.obraForm.reset({
      codigo: '', nombre: '', cliente: '', ubicacion: '', presupuesto: null,
      avance: 0, estado: 'en_ejecucion', fechaInicio: '', fechaFin: '',
    });
  }

  editarObra(obra: Obra): void {
    this.obraEditandoId.set(obra.id);
    this.obraForm.reset({
      codigo: obra.codigo,
      nombre: obra.nombre,
      cliente: obra.cliente,
      ubicacion: obra.ubicacion,
      presupuesto: obra.presupuesto,
      avance: obra.avance,
      estado: obra.estado,
      fechaInicio: obra.fechaInicio,
      fechaFin: obra.fechaFin,
    });
    this.modalActivo.set('obra');
  }

  eliminarObra(obra: Obra): void {
    this.obraEliminandoId.set(obra.id);
    this.modalActivo.set('eliminar-obra');
  }

  confirmarEliminarObra(): void {
    const obra = this.obraEliminando();
    const resumen = this.resumenEliminacionObra();
    if (!obra) {
      this.cerrarModal();
      return;
    }
    if (!resumen.puedeEliminar) {
      this.mostrarMensaje('No se puede eliminar una obra con historial. Cambiala a Finalizada para conservar sus registros.');
      return;
    }
    this.datos.eliminarObra(obra.id).subscribe({
      next: (mensaje) => {
        this.cerrarModal();
        this.mostrarMensaje(mensaje);
      },
      error: (error: { error?: { mensaje?: string } }) => {
        this.mostrarMensaje(error.error?.mensaje ?? 'No se pudo eliminar la obra.');
      },
    });
  }

  alternarEstadoObra(obra: Obra): void {
    const nuevoEstado: EstadoObra = obra.estado === 'finalizada' ? 'en_ejecucion' : 'finalizada';
    this.datos.cambiarEstadoObra(obra.id, nuevoEstado).subscribe({
      next: () => this.mostrarMensaje(`La obra ${obra.nombre} ahora esta ${nuevoEstado === 'finalizada' ? 'finalizada' : 'activa'}.`),
      error: () => this.mostrarMensaje('No se pudo cambiar el estado de la obra.'),
    });
  }

  alternarEstadoObraFormulario(): void {
    const estado = this.obraForm.controls.estado.value;
    this.obraForm.controls.estado.setValue(estado === 'finalizada' ? 'en_ejecucion' : 'finalizada');
  }

  guardarTrabajador(): void {
    if (!this.validarFormulario(this.trabajadorForm)) {
      return;
    }
    const trabajadorId = this.trabajadorEditandoId();
    const formulario = this.trabajadorForm.getRawValue();
    const datos: Omit<Trabajador, 'id' | 'sueldo'> = {
      nombres: formulario.nombres.trim(),
      apellidos: formulario.apellidos.trim(),
      dni: formulario.dni,
      cargo: formulario.cargo as Trabajador['cargo'],
      estado: formulario.estado,
    };
    if (trabajadorId) {
      this.datos.actualizarTrabajador(trabajadorId, datos);
    } else {
      this.datos.crearTrabajador(datos);
    }
    this.cerrarModal();
    this.vista.set('trabajadores');
    this.mantenedorTab.set('trabajadores');
    this.mantenedorMenuAbierto.set(true);
    this.mostrarMensaje(trabajadorId ? 'Trabajador actualizado correctamente.' : 'Trabajador registrado correctamente.');
  }

  editarTrabajador(trabajador: Trabajador): void {
    this.trabajadorEditandoId.set(trabajador.id);
    this.trabajadorForm.reset({
      nombres: trabajador.nombres,
      apellidos: trabajador.apellidos,
      dni: trabajador.dni,
      cargo: trabajador.cargo,
      estado: trabajador.estado,
    });
    this.modalActivo.set('trabajador');
  }

  eliminarTrabajador(trabajador: Trabajador): void {
    this.abrirConfirmacionEliminar({
      titulo: 'Eliminar trabajador',
      elemento: this.nombreCompletoTrabajador(trabajador),
      detalle: `DNI ${trabajador.dni} - ${this.cargoTrabajadorEtiqueta(trabajador.cargo)}`,
      advertencia: 'Esta accion quitara al trabajador del registro.',
      accion: () => {
        this.datos.eliminarTrabajador(trabajador.id);
        this.cerrarModal();
        this.mostrarMensaje('Trabajador eliminado correctamente.');
      },
    });
  }

  cambiarEstadoTrabajador(trabajador: Trabajador, estado: string): void {
    if (estado !== 'activo' && estado !== 'inactivo') {
      return;
    }
    this.datos.cambiarEstadoTrabajador(trabajador.id, estado);
    this.mostrarMensaje(`Estado de ${trabajador.nombres} actualizado.`);
  }

  alternarEstadoTrabajador(trabajador: Trabajador): void {
    const nuevoEstado: Trabajador['estado'] = trabajador.estado === 'activo' ? 'inactivo' : 'activo';
    this.cambiarEstadoTrabajador(trabajador, nuevoEstado);
  }

  alternarEstadoCargo(cargo: Cargo): void {
    const nuevoEstado: Cargo['estado'] = cargo.estado === 'activo' ? 'inactivo' : 'activo';
    this.datos.actualizarCargo(cargo.id, {
      nombre: cargo.nombre,
      sueldo: cargo.sueldo,
      estado: nuevoEstado,
    });
    this.mostrarMensaje(`Estado del cargo ${cargo.nombre} actualizado.`);
  }

  alternarEstadoFormulario(tipo: 'trabajador' | 'cargo'): void {
    if (tipo === 'trabajador') {
      const valor = this.trabajadorForm.controls.estado.value;
      this.trabajadorForm.controls.estado.setValue(valor === 'activo' ? 'inactivo' : 'activo');
      return;
    }

    const valor = this.cargoForm.controls.estado.value;
    this.cargoForm.controls.estado.setValue(valor === 'activo' ? 'inactivo' : 'activo');
  }

  guardarCargo(): void {
    if (!this.validarFormulario(this.cargoForm)) {
      return;
    }
    const cargoId = this.cargoEditandoId();
    const formulario = this.cargoForm.getRawValue();
    const datos: Omit<Cargo, 'id' | 'codigo'> = {
      nombre: formulario.nombre.trim(),
      sueldo: Number(formulario.sueldo),
      estado: formulario.estado,
    };
    if (cargoId) {
      this.datos.actualizarCargo(cargoId, datos);
    } else {
      this.datos.crearCargo(datos);
    }
    this.cerrarModal();
    this.vista.set('cargos');
    this.mantenedorTab.set('cargos');
    this.mantenedorMenuAbierto.set(true);
    this.mostrarMensaje(cargoId ? 'Cargo actualizado correctamente.' : 'Cargo registrado correctamente.');
  }

  editarCargo(cargo: Cargo): void {
    this.cargoEditandoId.set(cargo.id);
    this.cargoForm.reset({
      nombre: cargo.nombre,
      sueldo: cargo.sueldo,
      estado: cargo.estado,
    });
    this.modalActivo.set('cargo');
  }

  eliminarCargo(cargo: Cargo): void {
    this.abrirConfirmacionEliminar({
      titulo: 'Eliminar cargo',
      elemento: cargo.nombre,
      detalle: `Sueldo: ${this.formatoMoneda(cargo.sueldo)}`,
      advertencia: 'Esta accion eliminara el cargo del mantenedor.',
      accion: () => {
        this.datos.eliminarCargo(cargo.id);
        this.cerrarModal();
        this.mostrarMensaje('Cargo eliminado correctamente.');
      },
    });
  }

  guardarCliente(): void {
    if (!this.validarFormulario(this.clienteForm)) {
      return;
    }
    const id = this.clienteEditandoId();
    const formulario = this.clienteForm.getRawValue();
    const datos: Omit<Cliente, 'id'> = {
      nombres: formulario.nombres.trim(),
      apellidos: formulario.apellidos.trim(),
      telefono: formulario.telefono.trim(),
      direccion: formulario.direccion.trim(),
      estado: formulario.estado,
    };
    id ? this.datos.actualizarCliente(id, datos) : this.datos.crearCliente(datos);
    this.cerrarModal();
    this.mostrarMensaje(id ? 'Cliente actualizado correctamente.' : 'Cliente registrado correctamente.');
  }

  editarCliente(cliente: Cliente): void {
    this.clienteEditandoId.set(cliente.id);
    this.clienteForm.reset(cliente);
    this.modalActivo.set('cliente');
  }

  alternarEstadoCliente(cliente: Cliente): void {
    this.datos.actualizarCliente(cliente.id, { ...cliente, estado: cliente.estado === 'activo' ? 'inactivo' : 'activo' });
  }

  eliminarCliente(cliente: Cliente): void {
    this.abrirConfirmacionEliminar({
      titulo: 'Eliminar cliente',
      elemento: this.nombreCliente(cliente),
      detalle: cliente.telefono ? `Telefono: ${cliente.telefono}` : 'Sin telefono registrado',
      advertencia: 'Esta accion eliminara el cliente del mantenedor si no tiene registros asociados.',
      accion: () => this.datos.eliminarCliente(cliente.id).subscribe({
        next: (mensaje) => {
          this.cerrarModal();
          this.mostrarMensaje(mensaje);
        },
        error: (error: { error?: { mensaje?: string } }) => {
          this.cerrarModal();
          this.mostrarMensaje(error.error?.mensaje ?? 'No se pudo eliminar el cliente.');
        },
      }),
    });
  }

  nombreCliente(cliente: Cliente): string {
    return `${cliente.nombres} ${cliente.apellidos}`.trim();
  }

  guardarCategoriaGasto(): void {
    if (!this.validarFormulario(this.categoriaGastoForm)) {
      return;
    }
    const id = this.categoriaGastoEditandoId();
    const datos = this.categoriaGastoForm.getRawValue();
    datos.nombre = datos.nombre.trim();
    id ? this.datos.actualizarCategoriaGasto(id, datos) : this.datos.crearCategoriaGasto(datos);
    this.cerrarModal();
    this.mostrarMensaje(id ? 'Categoria actualizada correctamente.' : 'Categoria registrada correctamente.');
  }

  editarCategoriaGasto(categoria: CategoriaGasto): void {
    this.categoriaGastoEditandoId.set(categoria.id);
    this.categoriaGastoForm.reset(categoria);
    this.modalActivo.set('categoria-gasto');
  }

  alternarEstadoCategoriaGasto(categoria: CategoriaGasto): void {
    this.datos.actualizarCategoriaGasto(categoria.id, { ...categoria, estado: categoria.estado === 'activo' ? 'inactivo' : 'activo' });
  }

  eliminarCategoriaGasto(categoria: CategoriaGasto): void {
    this.abrirConfirmacionEliminar({
      titulo: 'Eliminar categoria',
      elemento: categoria.nombre,
      detalle: `Estado: ${this.estadoObraEtiqueta(categoria.estado)}`,
      advertencia: 'Esta accion eliminara la categoria si no esta siendo usada por gastos.',
      accion: () => this.datos.eliminarCategoriaGasto(categoria.id).subscribe({
        next: (mensaje) => {
          this.cerrarModal();
          this.mostrarMensaje(mensaje);
        },
        error: (error: { error?: { mensaje?: string } }) => {
          this.cerrarModal();
          this.mostrarMensaje(error.error?.mensaje ?? 'No se pudo eliminar la categoria.');
        },
      }),
    });
  }

  guardarTipoIngreso(): void {
    if (!this.validarFormulario(this.tipoIngresoForm)) {
      return;
    }
    const id = this.tipoIngresoEditandoId();
    const datos = this.tipoIngresoForm.getRawValue();
    datos.nombre = datos.nombre.trim();
    id ? this.datos.actualizarTipoIngreso(id, datos) : this.datos.crearTipoIngreso(datos);
    this.cerrarModal();
    this.mostrarMensaje(id ? 'Tipo de ingreso actualizado correctamente.' : 'Tipo de ingreso registrado correctamente.');
  }

  editarTipoIngreso(tipo: TipoIngreso): void {
    this.tipoIngresoEditandoId.set(tipo.id);
    this.tipoIngresoForm.reset(tipo);
    this.modalActivo.set('tipo-ingreso');
  }

  alternarEstadoTipoIngreso(tipo: TipoIngreso): void {
    this.datos.actualizarTipoIngreso(tipo.id, { ...tipo, estado: tipo.estado === 'activo' ? 'inactivo' : 'activo' });
  }

  eliminarTipoIngreso(tipo: TipoIngreso): void {
    this.abrirConfirmacionEliminar({
      titulo: 'Eliminar tipo de ingreso',
      elemento: tipo.nombre,
      detalle: `Estado: ${this.estadoObraEtiqueta(tipo.estado)}`,
      advertencia: 'Esta accion eliminara el tipo si no esta siendo usado por ingresos.',
      accion: () => this.datos.eliminarTipoIngreso(tipo.id).subscribe({
        next: (mensaje) => {
          this.cerrarModal();
          this.mostrarMensaje(mensaje);
        },
        error: (error: { error?: { mensaje?: string } }) => {
          this.cerrarModal();
          this.mostrarMensaje(error.error?.mensaje ?? 'No se pudo eliminar el tipo de ingreso.');
        },
      }),
    });
  }

  alternarEstadoCatalogoFormulario(tipo: 'cliente' | 'categoria-gasto' | 'tipo-ingreso'): void {
    const control = tipo === 'cliente'
      ? this.clienteForm.controls.estado
      : tipo === 'categoria-gasto'
        ? this.categoriaGastoForm.controls.estado
        : this.tipoIngresoForm.controls.estado;
    control.setValue(control.value === 'activo' ? 'inactivo' : 'activo');
  }

  guardarGasto(): void {
    if (!this.validarFormulario(this.gastoForm)) {
      return;
    }
    const formulario = this.gastoForm.getRawValue();
    const datos: Omit<Gasto, 'id'> = {
      obraId: Number(formulario.obraId),
      categoria: formulario.categoria.trim(),
      descripcion: formulario.descripcion.trim(),
      monto: Number(formulario.monto),
      fecha: formulario.fecha,
      estado: formulario.estado,
    };
    const gastoId = this.gastoEditandoId();
    this.obraGastosSeleccionadaId.set(datos.obraId);
    if (gastoId) {
      this.datos.actualizarGasto(gastoId, datos);
    } else {
      this.datos.registrarGasto(datos);
    }
    this.cerrarModal();
    this.vista.set('gastos');
    this.mostrarMensaje(gastoId ? 'Gasto actualizado correctamente.' : 'Gasto registrado y aplicado a la obra.');
  }

  editarGasto(gasto: Gasto): void {
    this.gastoEditandoId.set(gasto.id);
    this.gastoForm.reset({
      obraId: gasto.obraId,
      categoria: gasto.categoria,
      descripcion: gasto.descripcion,
      monto: gasto.monto,
      fecha: gasto.fecha,
      estado: gasto.estado,
    });
    this.modalActivo.set('gasto');
  }

  eliminarGasto(gasto: Gasto): void {
    this.abrirConfirmacionEliminar({
      titulo: 'Eliminar gasto',
      elemento: gasto.descripcion,
      detalle: `${this.datos.nombreObra(gasto.obraId)} - ${this.formatoMoneda(gasto.monto)}`,
      advertencia: 'Esta accion retirara el gasto y actualizara los totales de la obra.',
      accion: () => {
        this.datos.eliminarGasto(gasto.id);
        this.cerrarModal();
        this.mostrarMensaje('Gasto eliminado correctamente.');
      },
    });
  }

  alternarEstadoGasto(gasto: Gasto): void {
    const estado: Gasto['estado'] = gasto.estado === 'pagado' ? 'pendiente' : 'pagado';
    this.datos.cambiarEstadoGasto(gasto.id, estado);
    this.mostrarMensaje(`Gasto marcado como ${estado}.`);
  }

  alternarEstadoGastoFormulario(): void {
    const estado = this.gastoForm.controls.estado.value;
    this.gastoForm.controls.estado.setValue(estado === 'pagado' ? 'pendiente' : 'pagado');
  }

  prepararNuevoGasto(): void {
    const obraId = this.obraGastosSeleccionada()?.id ?? null;
    this.gastoEditandoId.set(null);
    this.gastoForm.reset({
      obraId,
      categoria: '',
      descripcion: '',
      monto: null,
      fecha: '',
      estado: 'pendiente',
    });
  }

  guardarIngreso(): void {
    if (!this.validarFormulario(this.ingresoForm)) {
      return;
    }
    const formulario = this.ingresoForm.getRawValue();
    const datos: Omit<Ingreso, 'id'> = {
      obraId: Number(formulario.obraId),
      cliente: formulario.cliente.trim(),
      tipo: formulario.tipo.trim(),
      monto: Number(formulario.monto),
      fecha: formulario.fecha,
      estado: formulario.estado,
    };
    const ingresoId = this.ingresoEditandoId();
    this.obraIngresosSeleccionadaId.set(datos.obraId);
    if (ingresoId) {
      this.datos.actualizarIngreso(ingresoId, datos);
    } else {
      this.datos.registrarIngreso(datos);
    }
    this.cerrarModal();
    this.vista.set('ingresos');
    this.mostrarMensaje(ingresoId ? 'Ingreso actualizado correctamente.' : 'Ingreso registrado y aplicado a la obra.');
  }

  editarIngreso(ingreso: Ingreso): void {
    this.ingresoEditandoId.set(ingreso.id);
    this.ingresoForm.reset({
      obraId: ingreso.obraId,
      cliente: ingreso.cliente,
      tipo: ingreso.tipo,
      monto: ingreso.monto,
      fecha: ingreso.fecha,
      estado: ingreso.estado,
    });
    this.modalActivo.set('ingreso');
  }

  eliminarIngreso(ingreso: Ingreso): void {
    this.abrirConfirmacionEliminar({
      titulo: 'Eliminar ingreso',
      elemento: ingreso.tipo,
      detalle: `${this.datos.nombreObra(ingreso.obraId)} - ${this.formatoMoneda(ingreso.monto)}`,
      advertencia: 'Esta accion retirara el ingreso y actualizara los totales de la obra.',
      accion: () => {
        this.datos.eliminarIngreso(ingreso.id);
        this.cerrarModal();
        this.mostrarMensaje('Ingreso eliminado correctamente.');
      },
    });
  }

  alternarEstadoIngreso(ingreso: Ingreso): void {
    const estado: Ingreso['estado'] = ingreso.estado === 'pagado' ? 'pendiente' : 'pagado';
    this.datos.cambiarEstadoIngreso(ingreso.id, estado);
    this.mostrarMensaje(`Ingreso marcado como ${estado}.`);
  }

  alternarEstadoIngresoFormulario(): void {
    const estado = this.ingresoForm.controls.estado.value;
    this.ingresoForm.controls.estado.setValue(estado === 'pagado' ? 'pendiente' : 'pagado');
  }

  seleccionarObraIngresoFormulario(valor: string): void {
    const obraId = Number(valor);
    const obra = this.datos.obras().find((item) => item.id === obraId);
    if (obra) {
      this.ingresoForm.controls.cliente.setValue(obra.cliente);
    }
  }

  prepararNuevoIngreso(): void {
    const obra = this.obraIngresosSeleccionada();
    this.ingresoEditandoId.set(null);
    this.ingresoForm.reset({
      obraId: obra?.id ?? null,
      cliente: obra?.cliente ?? '',
      tipo: '',
      monto: null,
      fecha: '',
      estado: 'pendiente',
    });
  }

  guardarCompra(): void {
    if (!this.validarFormulario(this.compraForm)) {
      return;
    }
    const { materialId, cantidad, precioUnitario } = this.compraForm.getRawValue();
    this.datos.registrarCompra(materialId, cantidad, precioUnitario);
    this.cerrarModal();
    this.vista.set('materiales');
    this.mostrarMensaje('Compra registrada y stock actualizado.');
  }

  registrarAsistenciaRapida(): void {
    this.mostrarMensaje('Asistencia masiva guardada para la fecha seleccionada.');
  }

  seleccionarObraPlanillas(valor: string): void {
    if (!valor) {
      this.obraPlanillasSeleccionadaId.set(null);
      if (this.modoVistaPlanillas() === 'detalle') {
        this.cargarDetallesPlanillasVista();
      }
      return;
    }
    const obraId = Number(valor);
    if (!Number.isFinite(obraId)) {
      return;
    }
    this.obraPlanillasSeleccionadaId.set(obraId);
    if (this.modoVistaPlanillas() === 'detalle') {
      this.cargarDetallesPlanillasVista();
    }
  }

  cambiarModoVistaPlanillas(modo: 'resumen' | 'detalle'): void {
    this.modoVistaPlanillas.set(modo);
    if (modo === 'detalle') {
      this.cargarDetallesPlanillasVista();
    }
  }

  detallePlanillaVista(planillaId: number): PlanillaDetalle | null {
    return this.detallesPlanillasVista()[planillaId] ?? null;
  }

  private cargarDetallesPlanillasVista(): void {
    const planillasPendientes = this.planillasFiltradas()
      .filter((planilla) => !this.detallesPlanillasVista()[planilla.id]);

    this.errorDetallesPlanillas.set(false);
    if (!planillasPendientes.length) {
      this.cargandoDetallesPlanillas.set(false);
      return;
    }

    this.cargandoDetallesPlanillas.set(true);
    forkJoin(planillasPendientes.map((planilla) => this.datos.obtenerPlanilla(planilla.id))).subscribe({
      next: (detalles) => {
        this.detallesPlanillasVista.update((actuales) => {
          const siguientes = { ...actuales };
          detalles.forEach((detalle) => {
            siguientes[detalle.planilla.id] = detalle;
          });
          return siguientes;
        });
        this.cargandoDetallesPlanillas.set(false);
      },
      error: () => {
        this.errorDetallesPlanillas.set(true);
        this.cargandoDetallesPlanillas.set(false);
      },
    });
  }

  private invalidarDetallePlanilla(planillaId: number): void {
    this.detallesPlanillasVista.update((actuales) => {
      const siguientes = { ...actuales };
      delete siguientes[planillaId];
      return siguientes;
    });
  }

  seleccionarObraGastos(valor: string): void {
    if (!valor) {
      this.obraGastosSeleccionadaId.set(null);
      return;
    }
    const obraId = Number(valor);
    if (!Number.isFinite(obraId)) {
      return;
    }
    this.obraGastosSeleccionadaId.set(obraId);
  }

  seleccionarObraIngresos(valor: string): void {
    if (!valor) {
      this.obraIngresosSeleccionadaId.set(null);
      return;
    }
    const obraId = Number(valor);
    if (!Number.isFinite(obraId)) {
      return;
    }
    this.obraIngresosSeleccionadaId.set(obraId);
  }

  seleccionarObraReportes(valor: string): void {
    if (!valor) {
      this.obraReportesSeleccionadaId.set(null);
      return;
    }
    const obraId = Number(valor);
    if (!Number.isFinite(obraId)) {
      return;
    }
    this.obraReportesSeleccionadaId.set(obraId);
  }

  generarPlanilla(): void {
    this.abrirModal('planilla');
  }

  actualizarRangoPlanilla(): void {
    this.diasPlanilla.update((dias) => {
      const ajustado: Record<number, number> = {};
      for (const [trabajadorId, valor] of Object.entries(dias)) {
        ajustado[Number(trabajadorId)] = Math.min(Math.max(0, Number(valor) || 0), this.limiteDiasPlanilla);
      }
      return ajustado;
    });
    this.planillaRangoVersion.update((valor) => valor + 1);
  }

  actualizarDiasPlanilla(trabajadorId: number, valor: string): void {
    const numero = Number(valor);
    const maximo = this.limiteDiasPlanilla;
    const dias = Number.isFinite(numero) ? Math.min(Math.max(0, numero), maximo) : 0;
    this.diasPlanilla.update((actual) => ({ ...actual, [trabajadorId]: dias }));
  }

  actualizarHorasExtrasPlanilla(trabajadorId: number, valor: string): void {
    const numero = Number(valor);
    const horas = Number.isFinite(numero) ? Math.min(Math.max(0, numero), 72) : 0;
    this.horasExtrasPlanilla.update((actual) => ({ ...actual, [trabajadorId]: horas }));
  }

  diasTrabajadorPlanilla(trabajadorId: number): number {
    return this.diasPlanilla()[trabajadorId] || 0;
  }

  horasExtrasTrabajadorPlanilla(trabajadorId: number): number {
    return this.horasExtrasPlanilla()[trabajadorId] || 0;
  }

  pagoHorasExtrasTrabajador(trabajador: Trabajador, horasExtras: number): number {
    return Math.round(((trabajador.sueldo / this.diasBasePlanilla / 8) * horasExtras) * 100) / 100;
  }

  subtotalPlanillaTrabajador(trabajador: Trabajador, dias: number, horasExtras = 0): number {
    const pagoDias = (trabajador.sueldo / this.diasBasePlanilla) * dias;
    const pagoExtras = this.pagoHorasExtrasTrabajador(trabajador, horasExtras);
    return Math.round((pagoDias + pagoExtras) * 100) / 100;
  }

  guardarPlanilla(): void {
    if (!this.validarFormulario(this.planillaForm, 'Selecciona la obra y el rango de fechas.')) {
      return;
    }

    if (this.diasMaximosPlanilla() <= 0) {
      this.mostrarMensaje('La fecha fin debe ser igual o posterior a la fecha de inicio.');
      return;
    }

    const detalles = this.trabajadoresPlanilla()
      .map((trabajador) => ({
        trabajadorId: trabajador.id,
        diasTrabajados: this.diasPlanilla()[trabajador.id] ?? 0,
        horasExtras: this.horasExtrasPlanilla()[trabajador.id] ?? 0,
      }))
      .filter((detalle) => detalle.diasTrabajados > 0 || detalle.horasExtras > 0);

    if (!detalles.length) {
      this.mostrarMensaje('Registra al menos un trabajador con dias trabajados.');
      return;
    }

    const formulario = this.planillaForm.getRawValue();
    const datosPlanilla = {
      obraId: Number(formulario.obraId),
      fechaInicio: formulario.fechaInicio,
      fechaFin: formulario.fechaFin,
      detalles,
    };
    this.obraPlanillasSeleccionadaId.set(datosPlanilla.obraId);

    const planillaId = this.planillaEditandoId();
    if (planillaId) {
      this.invalidarDetallePlanilla(planillaId);
      this.datos.actualizarPlanilla(planillaId, datosPlanilla);
    } else {
      this.datos.registrarPlanilla(datosPlanilla);
    }
    this.modoVistaPlanillas.set('resumen');
    this.cerrarModal();
    this.vista.set('planillas');
    this.mostrarMensaje(planillaId ? 'Planilla actualizada correctamente.' : 'Planilla semanal generada correctamente.');
  }

  verPlanilla(planilla: Planilla): void {
    this.datos.obtenerPlanilla(planilla.id).subscribe({
      next: (detalle) => {
        this.planillaDetalle.set(detalle);
        this.modalActivo.set('planilla-detalle');
      },
      error: () => this.mostrarMensaje('No se pudo cargar el detalle de la planilla.'),
    });
  }

  editarPlanilla(planilla: Planilla): void {
    if (this.estadoPlanillaPagada(planilla)) {
      this.mostrarMensaje('Solo se pueden editar planillas pendientes.');
      return;
    }

    this.datos.obtenerPlanilla(planilla.id).subscribe({
      next: (detalle) => {
        this.planillaEditandoId.set(planilla.id);
        this.planillaForm.reset({
          obraId: detalle.planilla.obraId,
          fechaInicio: detalle.planilla.fechaInicio ?? '',
          fechaFin: detalle.planilla.fechaFin ?? '',
        });

        this.diasPlanilla.set(Object.fromEntries(detalle.detalles.map((fila) => [fila.trabajadorId, fila.diasTrabajados])));
        this.horasExtrasPlanilla.set(Object.fromEntries(detalle.detalles.map((fila) => [fila.trabajadorId, fila.horasExtras])));
        this.planillaRangoVersion.update((valor) => valor + 1);
        this.modalActivo.set('planilla');
      },
      error: () => this.mostrarMensaje('No se pudo cargar la planilla para editar.'),
    });
  }

  eliminarPlanilla(planilla: Planilla): void {
    if (this.estadoPlanillaPagada(planilla)) {
      this.mostrarMensaje('Solo se pueden eliminar planillas pendientes.');
      return;
    }

    this.abrirConfirmacionEliminar({
      titulo: 'Eliminar planilla',
      elemento: planilla.periodo,
      detalle: `${planilla.obra} - ${this.formatoMoneda(planilla.total)}`,
      advertencia: 'Esta accion eliminara la planilla pendiente y su detalle de trabajadores.',
      accion: () => {
        this.invalidarDetallePlanilla(planilla.id);
        this.datos.eliminarPlanilla(planilla.id);
        this.modoVistaPlanillas.set('resumen');
        this.cerrarModal();
        this.mostrarMensaje('Planilla eliminada correctamente.');
      },
    });
  }

  estadoPlanillaPagada(planilla: Planilla): boolean {
    return planilla.estado.toLowerCase() === 'pagada' || planilla.estado.toLowerCase() === 'pagado';
  }

  estadoPlanillaEtiqueta(planilla: Planilla): 'Pagada' | 'Pendiente' {
    return this.estadoPlanillaPagada(planilla) ? 'Pagada' : 'Pendiente';
  }

  alternarEstadoPlanilla(planilla: Planilla): void {
    const nuevoEstado = this.estadoPlanillaPagada(planilla) ? 'Pendiente' : 'Pagada';
    this.datos.cambiarEstadoPlanilla(planilla.id, nuevoEstado);
    this.mostrarMensaje(`Planilla marcada como ${nuevoEstado.toLowerCase()}.`);
  }

  exportarPlanillasObraPdf(): void {
    const obra = this.obraPlanillasSeleccionada();
    if (!obra) {
      this.mostrarMensaje('Selecciona una obra para exportar sus planillas.');
      return;
    }

    const planillas = this.datos.planillas()
      .filter((planilla) => planilla.obraId === obra.id)
      .sort((a, b) => this.compararPlanillasPorFecha(a, b));

    if (!planillas.length) {
      this.mostrarMensaje('Esta obra no tiene planillas para exportar.');
      return;
    }

    this.mostrarMensaje('Preparando PDF de planillas...');
    forkJoin(planillas.map((planilla) => this.datos.obtenerPlanilla(planilla.id))).subscribe({
      next: (detalles) => {
        const semanas = this.construirSemanasPlanillasPdf(
          detalles.sort((a, b) => this.compararPlanillasPorFecha(a.planilla, b.planilla)),
        );
        this.planillasPdf.descargarPlanillasObra(
          {
            codigo: obra.codigo,
            nombre: obra.nombre,
            cliente: obra.cliente,
            ubicacion: obra.ubicacion,
          },
          semanas,
        );
        this.mostrarMensaje('PDF de planillas descargado.');
      },
      error: () => this.mostrarMensaje('No se pudo preparar el PDF de planillas.'),
    });
  }

  exportarPlanillaDetallePdf(): void {
    const detalle = this.planillaDetalle();
    if (!detalle) {
      this.mostrarMensaje('No hay una planilla cargada para exportar.');
      return;
    }

    const obra = this.datos.obras().find((item) => item.id === detalle.planilla.obraId);
    if (!obra) {
      this.mostrarMensaje('No se pudo encontrar la obra de esta planilla.');
      return;
    }

    const semana = this.planillaDetallePdf(
      detalle,
      this.numeroSemanaPlanilla(detalle.planilla),
      this.primeraFechaPlanillaObra(detalle.planilla.obraId),
    );

    this.planillasPdf.descargarPlanilla(
      {
        codigo: obra.codigo,
        nombre: obra.nombre,
        cliente: obra.cliente,
        ubicacion: obra.ubicacion,
      },
      semana,
    );
    this.mostrarMensaje('PDF de planilla descargado.');
  }

  exportarReporte(tipo: string): void {
    const alcance = this.obraReportesSeleccionada()?.nombre ?? 'Todas las obras';
    const resumen = this.progresoFinancieroReporte();
    const filas: Array<Array<string | number>> = [
      ['Reporte', tipo],
      ['Alcance', alcance],
      ['Generado', new Date().toLocaleString('es-PE')],
      [],
      ['Resumen financiero'],
      ['Presupuesto', 'Ingresos', 'Gastos', 'Ganancia', 'Cobranza %', 'Ejecucion gasto %', 'Margen %'],
      [resumen.presupuesto, resumen.ingresosRegistrados, resumen.gastosTotales, resumen.ganancia, resumen.cobranza, resumen.ejecucion, resumen.margen],
      [],
      ['Cuentas pendientes'],
      ['Concepto', 'Monto', 'Detalle'],
      ...this.cuentasPendientesReporte().map((cuenta) => [cuenta.titulo, cuenta.monto, cuenta.detalle]),
      [],
      ['Distribucion de gastos'],
      ['Categoria', 'Monto', 'Porcentaje'],
      ...this.categoriasGastoReporte().map((categoria) => [categoria.categoria, categoria.monto, `${categoria.porcentaje}%`]),
      [],
      ['Planillas'],
      ['Periodo', 'Obra', 'Trabajadores', 'Total', 'Estado'],
      ...this.planillasTablaReporte().map((planilla) => [planilla.periodo, planilla.obra, planilla.trabajadores, planilla.total, planilla.estado]),
      [],
      ['Comparativo de obras'],
      ['Obra', 'Cliente', 'Presupuesto', 'Ingresos', 'Gastos', 'Planillas', 'Ganancia', 'Margen %', 'Estado'],
      ...this.comparativoObrasReporte().map((obra) => [obra.obra, obra.cliente, obra.presupuesto, obra.ingresos, obra.gastos, obra.planillas, obra.ganancia, obra.margen, obra.estado]),
    ];

    this.descargarCsv(`reporte-${this.nombreArchivoReporte(alcance)}.csv`, filas);
    this.mostrarMensaje(`Reporte de ${alcance} descargado.`);
  }

  private descargarCsv(nombre: string, filas: Array<Array<string | number>>): void {
    const contenido = filas
      .map((fila) => fila.map((celda) => `"${String(celda ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([`\uFEFF${contenido}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  }

  private nombreArchivoReporte(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'general';
  }

  private claveMes(fecha: Date): string {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
  }

  private etiquetaMes(fecha: Date): string {
    return ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][fecha.getMonth()];
  }

  formatoMoneda(valor: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      maximumFractionDigits: 0,
    }).format(valor);
  }

  formatoMillones(valor: number): string {
    if (valor >= 1000000) {
      return `S/ ${(valor / 1000000).toFixed(valor >= 10000000 ? 1 : 2)}M`;
    }
    if (valor >= 1000) {
      return `S/ ${Math.round(valor / 1000)}K`;
    }
    return this.formatoMoneda(valor);
  }

  porcentaje(valor: number): string {
    return `${valor.toFixed(1)}%`;
  }

  anchoBarra(valor: number, maximo = 600000): string {
    return `${Math.min(100, (valor / maximo) * 100)}%`;
  }

  resumenDashboardPeriodo(): string {
    return `Actualizado al ${new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())}`;
  }

  iconoAlerta(tipo: AlertaDashboard['tipo']): string {
    const iconos: Record<AlertaDashboard['tipo'], string> = {
      danger: 'alert-triangle',
      warning: 'clock',
      info: 'info',
      success: 'check',
    };
    return iconos[tipo];
  }

  estadoObraEtiqueta(estado: string): string {
    const etiquetas: Record<string, string> = {
      en_ejecucion: 'Activa',
      retrasada: 'Retrasada',
      finalizada: 'Finalizada',
      planificada: 'Planificada',
      paralizada: 'Paralizada',
      en_uso: 'En uso',
      disponible: 'Disponible',
      mantenimiento: 'Mantenimiento',
      averiada: 'Averiada',
      pagado: 'Pagada',
      aprobado: 'Aprobada',
      pendiente: 'Pendiente',
      borrador: 'Borrador',
      vigente: 'Vigente',
      publicado: 'Publicado',
      activo: 'Activo',
      inactivo: 'Inactivo',
      sincronizado: 'Sincronizado',
      bajo: 'Stock bajo',
    };
    return etiquetas[estado] ?? estado;
  }

  nombreCompletoTrabajador(trabajador: Trabajador): string {
    return `${trabajador.nombres} ${trabajador.apellidos}`.trim();
  }

  cargoTrabajadorEtiqueta(codigo: string): string {
    return this.datos.cargos().find((cargo) => cargo.codigo === codigo)?.nombre ?? codigo;
  }

  gananciaObra(ingresos: number, gastos: number, presupuesto = 0): number {
    return presupuesto + ingresos - gastos;
  }

  iconoSvg(nombre: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(ICONOS[nombre] ?? ICONOS['grid']);
  }

  etiquetaVista(): string {
    if (this.vistaDetalleObra()) {
      return 'Detalle de obra';
    }
    if (this.vista() === 'trabajadores') {
      return 'Trabajadores';
    }
    if (this.vista() === 'cargos') {
      return 'Cargos';
    }
    if (this.vista() === 'clientes') {
      return 'Clientes';
    }
    if (this.vista() === 'categorias-gasto') {
      return 'Gastos: Categorias';
    }
    if (this.vista() === 'tipos-ingreso') {
      return 'Ingresos: Tipos';
    }
    return this.menu.find((item) => item.vista === this.vista())?.etiqueta ?? 'Portal';
  }

  descripcionVista(): string {
    const descripciones: Partial<Record<Vista, string>> = {
      mantenedor: 'Catálogos base para trabajadores y cargos',
      trabajadores: 'Registro y mantenimiento del personal operativo',
      cargos: 'Catálogo de cargos disponibles para trabajadores',
      clientes: 'Clientes disponibles para obras e ingresos',
      'categorias-gasto': 'Categorias disponibles para registrar gastos',
      'tipos-ingreso': 'Tipos disponibles para registrar ingresos',
      materiales: 'Control de stock, precios promedio y reposiciones por obra',
      almacen: 'Resumen de almacenes, valorizacion de inventario y stock critico',
      gastos: 'Registro operativo de egresos, comprobantes y aprobaciones',
      ingresos: 'Seguimiento de valorizaciones, adelantos y pagos recibidos',
      maquinaria: 'Disponibilidad, uso, responsables y mantenimiento programado',
      documentos: 'Expedientes tecnicos, contratos, planos y actas por obra',
      reportes: 'Informes ejecutivos listos para exportar y compartir',
      usuarios: 'Administracion de perfiles, permisos y accesos operativos',
      configuracion: 'Parametros generales del sistema y reglas de operacion',
    };
    return descripciones[this.vista()] ?? 'Gestion integral de obra';
  }

  accionVista(): string {
    const acciones: Partial<Record<Vista, string>> = {
      mantenedor: '+ Nuevo registro',
      trabajadores: '+ Nuevo trabajador',
      cargos: '+ Nuevo cargo',
      clientes: '+ Nuevo cliente',
      'categorias-gasto': '+ Nueva categoria',
      'tipos-ingreso': '+ Nuevo tipo',
      materiales: '+ Registrar compra',
      almacen: '+ Movimiento',
      gastos: '+ Nuevo gasto',
      ingresos: '+ Nuevo ingreso',
      maquinaria: '+ Asignar equipo',
      documentos: '+ Subir documento',
      reportes: 'Exportar reporte',
      usuarios: '+ Nuevo usuario',
      configuracion: 'Guardar cambios',
    };
    return acciones[this.vista()] ?? 'Accion principal';
  }

  ejecutarAccionVista(): void {
    const vista = this.vista();
    if (vista === 'trabajadores') {
      this.abrirModal('trabajador');
      return;
    }
    if (vista === 'cargos') {
      this.abrirModal('cargo');
      return;
    }
    if (vista === 'clientes') {
      this.abrirModal('cliente');
      return;
    }
    if (vista === 'categorias-gasto') {
      this.abrirModal('categoria-gasto');
      return;
    }
    if (vista === 'tipos-ingreso') {
      this.abrirModal('tipo-ingreso');
      return;
    }
    if (vista === 'materiales' || vista === 'almacen') {
      this.abrirModal('compra');
      return;
    }
    if (vista === 'gastos') {
      this.abrirModal('gasto');
      return;
    }
    if (vista === 'ingresos') {
      this.abrirModal('ingreso');
      return;
    }
    this.exportarReporte(this.etiquetaVista());
  }

  metricasVista(): MetricaModulo[] {
    const resumen = this.datos.resumen();
    const materiales = this.datos.materiales();
    const gastos = this.datos.gastos();
    const ingresos = this.datos.ingresos();
    const maquinaria = this.datos.maquinaria();

    switch (this.vista()) {
      case 'materiales':
        return [
          { icono: 'M', tono: 'blue', valor: `${materiales.length}`, etiqueta: 'Materiales activos', detalle: 'Catalogo valorizado' },
          { icono: '!', tono: 'red', valor: `${resumen.stockBajo}`, etiqueta: 'Stock bajo', detalle: 'Requiere reposicion' },
          { icono: 'S/', tono: 'green', valor: this.formatoMillones(materiales.reduce((total, item) => total + item.stock * item.precioPromedio, 0)), etiqueta: 'Valor en stock', detalle: 'Costo promedio' },
          { icono: 'OC', tono: 'orange', valor: '3', etiqueta: 'Compras abiertas', detalle: 'En revision' },
        ];
      case 'almacen':
        return [
          { icono: 'A', tono: 'blue', valor: '4', etiqueta: 'Almacenes', detalle: 'Central y obras' },
          { icono: 'SKU', tono: 'violet', valor: `${materiales.length}`, etiqueta: 'Items controlados', detalle: 'Inventario actualizado' },
          { icono: '!', tono: 'red', valor: `${resumen.stockBajo}`, etiqueta: 'Alertas de stock', detalle: 'Minimos superados' },
          { icono: 'S/', tono: 'green', valor: this.formatoMillones(materiales.reduce((total, item) => total + item.stock * item.precioPromedio, 0)), etiqueta: 'Valorizacion', detalle: 'Costo inventario' },
        ];
      case 'gastos':
        return [
          { icono: 'G', tono: 'orange', valor: this.formatoMillones(resumen.gastos), etiqueta: 'Gastos acumulados', detalle: 'Todas las obras' },
          { icono: 'P', tono: 'red', valor: `${gastos.filter((gasto) => gasto.estado === 'pendiente').length}`, etiqueta: 'Pendientes', detalle: 'Por aprobar' },
          { icono: 'C', tono: 'blue', valor: `${gastos.length}`, etiqueta: 'Comprobantes', detalle: 'Registrados' },
          { icono: '%', tono: 'cyan', valor: '47%', etiqueta: 'Del presupuesto', detalle: 'Ejecucion financiera' },
        ];
      case 'ingresos':
        return [
          { icono: 'I', tono: 'green', valor: this.formatoMillones(resumen.ingresos), etiqueta: 'Ingresos recibidos', detalle: 'Cobrados y conciliados' },
          { icono: 'P', tono: 'orange', valor: `${ingresos.filter((ingreso) => ingreso.estado === 'pendiente').length}`, etiqueta: 'Pendientes', detalle: 'Por cobrar' },
          { icono: 'V', tono: 'blue', valor: `${ingresos.length}`, etiqueta: 'Valorizaciones', detalle: 'Registradas' },
          { icono: '%', tono: 'mint', valor: '49%', etiqueta: 'Del contrato', detalle: 'Avance de cobranza' },
        ];
      case 'maquinaria':
        return [
          { icono: 'EQ', tono: 'blue', valor: `${maquinaria.length}`, etiqueta: 'Equipos', detalle: 'Registrados' },
          { icono: 'U', tono: 'green', valor: `${maquinaria.filter((item) => item.estado === 'en_uso').length}`, etiqueta: 'En uso', detalle: 'Asignados a obra' },
          { icono: 'M', tono: 'orange', valor: '1', etiqueta: 'Mantenimientos', detalle: 'Proximos 30 dias' },
          { icono: 'H', tono: 'violet', valor: `${maquinaria.reduce((total, item) => total + item.horasUso, 0)}`, etiqueta: 'Horas acumuladas', detalle: 'Control operativo' },
        ];
      case 'documentos':
        return [
          { icono: 'D', tono: 'blue', valor: '36', etiqueta: 'Documentos', detalle: 'Expediente digital' },
          { icono: 'P', tono: 'orange', valor: '5', etiqueta: 'Pendientes', detalle: 'Por firma o carga' },
          { icono: 'V', tono: 'green', valor: '28', etiqueta: 'Vigentes', detalle: 'Controlados' },
          { icono: 'E', tono: 'cyan', valor: '3', etiqueta: 'En revision', detalle: 'Area tecnica' },
        ];
      case 'rentabilidad':
        return [
          { icono: 'S/', tono: 'green', valor: 'S/ 2.4M', etiqueta: 'Ganancia actual', detalle: 'Margen 14.5%' },
          { icono: '%', tono: 'cyan', valor: '60.2%', etiqueta: 'Avance promedio', detalle: 'Todas las obras' },
          { icono: 'C', tono: 'orange', valor: 'S/ 5.8M', etiqueta: 'Cuentas por cobrar', detalle: '2 vencidas' },
          { icono: 'P', tono: 'red', valor: 'S/ 1.2M', etiqueta: 'Cuentas por pagar', detalle: '3 pendientes' },
        ];
      case 'reportes':
        return [
          { icono: 'R', tono: 'blue', valor: '12', etiqueta: 'Reportes', detalle: 'Plantillas activas' },
          { icono: 'PDF', tono: 'red', valor: '8', etiqueta: 'Exportados', detalle: 'Este mes' },
          { icono: 'BI', tono: 'green', valor: '4', etiqueta: 'Tableros', detalle: 'Indicadores clave' },
          { icono: 'S', tono: 'orange', valor: '6', etiqueta: 'Programados', detalle: 'Envio automatico' },
        ];
      case 'usuarios':
        return [
          { icono: 'U', tono: 'blue', valor: '9', etiqueta: 'Usuarios', detalle: 'Activos' },
          { icono: 'R', tono: 'violet', valor: '5', etiqueta: 'Roles', detalle: 'Perfiles operativos' },
          { icono: 'P', tono: 'green', valor: '42', etiqueta: 'Permisos', detalle: 'Configurados' },
          { icono: '2FA', tono: 'orange', valor: '7', etiqueta: 'Con doble factor', detalle: 'Seguridad activa' },
        ];
      case 'configuracion':
        return [
          { icono: 'C', tono: 'blue', valor: '18', etiqueta: 'Parametros', detalle: 'Sistema' },
          { icono: 'S', tono: 'green', valor: '100%', etiqueta: 'Sincronizacion', detalle: 'Servicios activos' },
          { icono: 'M', tono: 'orange', valor: '4', etiqueta: 'Modulos', detalle: 'Con reglas propias' },
          { icono: 'A', tono: 'violet', valor: '24h', etiqueta: 'Auditoria', detalle: 'Retencion diaria' },
        ];
      default:
        return [];
    }
  }

  columnasVista(): string[] {
    const columnas: Partial<Record<Vista, string[]>> = {
      materiales: ['Codigo', 'Material', 'Categoria', 'Stock', 'Minimo', 'Almacen', 'Estado'],
      almacen: ['Almacen', 'Responsable', 'Materiales', 'Valor stock', 'Stock bajo', 'Estado'],
      gastos: ['Fecha', 'Obra', 'Categoria', 'Descripcion', 'Responsable', 'Monto', 'Estado'],
      ingresos: ['Fecha', 'Cliente', 'Tipo', 'Obra', 'Monto', 'Estado'],
      maquinaria: ['Codigo', 'Equipo', 'Tipo', 'Obra', 'Responsable', 'Horas', 'Mantenimiento', 'Estado'],
      documentos: ['Documento', 'Obra', 'Tipo', 'Responsable', 'Actualizado', 'Estado'],
      rentabilidad: ['Obra', 'Presupuesto', 'Ingresos', 'Gastos', 'Ganancia', 'Margen', 'Estado'],
      reportes: ['Reporte', 'Periodo', 'Responsable', 'Ultima generacion', 'Formato', 'Estado'],
      usuarios: ['Usuario', 'Rol', 'Correo', 'Obra', 'Estado'],
      configuracion: ['Parametro', 'Modulo', 'Valor', 'Responsable', 'Estado'],
    };
    return columnas[this.vista()] ?? ['Codigo', 'Descripcion', 'Responsable', 'Estado'];
  }

  filasVista(): FilaModulo[] {
    switch (this.vista()) {
      case 'materiales':
        return this.datos.materiales().map((material) => ({
          Codigo: material.codigo,
          Material: material.nombre,
          Categoria: material.categoria,
          Stock: `${material.stock} ${material.unidad}`,
          Minimo: `${material.stockMin} ${material.unidad}`,
          Almacen: material.almacen,
          Estado: material.stock <= material.stockMin ? 'bajo' : 'disponible',
        }));
      case 'almacen':
        return [
          { Almacen: 'Almacen central', Responsable: 'Rosa Elena Chavez', Materiales: 46, 'Valor stock': 'S/ 486,500', 'Stock bajo': 1, Estado: 'activo' },
          { Almacen: 'Obra Las Torres', Responsable: 'Juan Carlos Flores', Materiales: 31, 'Valor stock': 'S/ 312,800', 'Stock bajo': 0, Estado: 'activo' },
          { Almacen: 'Obra Plaza Norte', Responsable: 'Ana Quispe', Materiales: 38, 'Valor stock': 'S/ 529,300', 'Stock bajo': 2, Estado: 'activo' },
          { Almacen: 'Planta Textil Andina', Responsable: 'Maria Torres', Materiales: 19, 'Valor stock': 'S/ 184,900', 'Stock bajo': 0, Estado: 'activo' },
        ];
      case 'gastos':
        return this.gastosFiltrados().map((gasto) => ({
          Fecha: gasto.fecha,
          Obra: this.datos.nombreObra(gasto.obraId),
          Categoria: gasto.categoria,
          Descripcion: gasto.descripcion,
          Monto: this.formatoMoneda(gasto.monto),
          Estado: gasto.estado,
        }));
      case 'ingresos':
        return this.datos.ingresos().map((ingreso) => ({
          Fecha: ingreso.fecha,
          Cliente: ingreso.cliente,
          Tipo: ingreso.tipo,
          Obra: this.datos.nombreObra(ingreso.obraId),
          Monto: this.formatoMoneda(ingreso.monto),
          Estado: ingreso.estado,
        }));
      case 'maquinaria':
        return this.datos.maquinaria().map((equipo) => ({
          Codigo: equipo.codigo,
          Equipo: equipo.nombre,
          Tipo: equipo.tipo,
          Obra: this.datos.nombreObra(equipo.obraId),
          Responsable: equipo.responsable,
          Horas: equipo.horasUso,
          Mantenimiento: equipo.mantenimiento,
          Estado: equipo.estado,
        }));
      case 'documentos':
        return [
          { Documento: 'Contrato principal - Las Torres', Obra: 'Edificio Residencial Las Torres', Tipo: 'Contrato', Responsable: 'Ing. Carlos Mendoza', Actualizado: '2024-11-21', Estado: 'vigente' },
          { Documento: 'Plano estructural E-214', Obra: 'Centro Comercial Plaza Norte', Tipo: 'Plano', Responsable: 'Ing. Ana Quispe', Actualizado: '2024-11-18', Estado: 'pendiente' },
          { Documento: 'Acta de valorizacion noviembre', Obra: 'Edificio Residencial Las Torres', Tipo: 'Acta', Responsable: 'Administracion', Actualizado: '2024-11-22', Estado: 'aprobado' },
          { Documento: 'Informe de seguridad semanal', Obra: 'Planta Industrial Textil Andina', Tipo: 'Informe', Responsable: 'Maria Torres', Actualizado: '2024-11-20', Estado: 'publicado' },
        ];
      case 'rentabilidad':
        return this.datos.obras().map((obra) => {
          const ganancia = this.gananciaObra(obra.ingresos, obra.gastos, obra.presupuesto);
          const baseMargen = obra.presupuesto + obra.ingresos;
          const margen = baseMargen ? Math.round((ganancia / baseMargen) * 100) : 0;
          return {
            Obra: obra.nombre,
            Presupuesto: this.formatoMoneda(obra.presupuesto),
            Ingresos: this.formatoMoneda(obra.ingresos),
            Gastos: this.formatoMoneda(obra.gastos),
            Ganancia: this.formatoMoneda(ganancia),
            Margen: `${margen}%`,
            Estado: obra.estado,
          };
        });
      case 'reportes':
        return [
          { Reporte: 'Resumen ejecutivo mensual', Periodo: 'Noviembre 2024', Responsable: 'Gerencia', 'Ultima generacion': '2024-11-22 08:30', Formato: 'PDF', Estado: 'publicado' },
          { Reporte: 'Rentabilidad por obra', Periodo: 'Ultimos 6 meses', Responsable: 'Finanzas', 'Ultima generacion': '2024-11-21 17:10', Formato: 'XLSX', Estado: 'vigente' },
          { Reporte: 'Asistencia y horas extras', Periodo: 'Semana 2', Responsable: 'RR.HH.', 'Ultima generacion': '2024-11-22 06:45', Formato: 'PDF', Estado: 'aprobado' },
          { Reporte: 'Stock critico de materiales', Periodo: 'Diario', Responsable: 'Almacen', 'Ultima generacion': '2024-11-22 07:15', Formato: 'PDF', Estado: 'pendiente' },
        ];
      case 'usuarios':
        return [
          { Usuario: 'Ing. Carlos Mendoza', Rol: 'Administrador', Correo: 'carlos.mendoza@constructcontrol.pe', Obra: 'Todas las obras', Estado: 'activo' },
          { Usuario: 'Ing. Ana Quispe', Rol: 'Residente de obra', Correo: 'ana.quispe@constructcontrol.pe', Obra: 'Plaza Norte', Estado: 'activo' },
          { Usuario: 'Rosa Elena Chavez', Rol: 'Almacen', Correo: 'rosa.chavez@constructcontrol.pe', Obra: 'Almacen central', Estado: 'activo' },
          { Usuario: 'Valeria Paredes', Rol: 'Finanzas', Correo: 'valeria.paredes@constructcontrol.pe', Obra: 'Todas las obras', Estado: 'activo' },
        ];
      case 'configuracion':
        return [
          { Parametro: 'Moneda base', Modulo: 'Finanzas', Valor: 'PEN - Sol peruano', Responsable: 'Administrador', Estado: 'sincronizado' },
          { Parametro: 'Jornada laboral', Modulo: 'Asistencia', Valor: '07:30 a 17:00', Responsable: 'RR.HH.', Estado: 'vigente' },
          { Parametro: 'Alerta stock minimo', Modulo: 'Almacen', Valor: 'Notificar al 100% del minimo', Responsable: 'Almacen', Estado: 'activo' },
          { Parametro: 'Aprobacion de gastos', Modulo: 'Gastos', Valor: 'Mayor a S/ 5,000', Responsable: 'Finanzas', Estado: 'activo' },
        ];
      default:
        return [];
    }
  }

  valorFila(fila: FilaModulo, columna: string): string | number {
    return fila[columna] ?? '';
  }

  anchoPorcentajeModulo(valor: string | number): number {
    const numero = Number(String(valor).replace('%', ''));
    return Number.isFinite(numero) ? Math.max(0, Math.min(100, numero)) : 0;
  }

  advertenciaCampo(formulario: FormGroup, nombre: string, tipo: 'campo' | 'select' = 'campo'): string {
    const control = formulario.controls[nombre];
    if (!control || !this.controlTieneError(control)) {
      return '';
    }

    if (control.hasError('required')) {
      return tipo === 'select' ? 'Selecciona una opcion.' : 'Este campo es obligatorio.';
    }
    if (control.hasError('pattern') && nombre === 'dni') {
      return 'Ingresa un DNI de 8 digitos.';
    }
    if (control.hasError('min')) {
      const minimo = control.getError('min')?.min;
      return minimo === 0.01 ? 'Debe ser mayor que 0.' : `Debe ser minimo ${minimo}.`;
    }
    if (control.hasError('max')) {
      return `Debe ser maximo ${control.getError('max')?.max}.`;
    }

    return 'Revisa este valor.';
  }

  private construirSemanasPlanillasPdf(detalles: PlanillaDetalle[]): PlanillaPdfSemana[] {
    if (!detalles.length) {
      return [];
    }

    const ordenadas = detalles.sort((a, b) => this.compararPlanillasPorFecha(a.planilla, b.planilla));
    const primeraFecha = ordenadas
      .map((detalle) => this.fechaLocal(detalle.planilla.fechaInicio ?? ''))
      .find((fecha): fecha is Date => fecha !== null);

    if (!primeraFecha) {
      return ordenadas.map((detalle, indice) => this.planillaDetallePdf(detalle, indice + 1, null));
    }

    const porSemana = new Map<number, PlanillaDetalle[]>();
    let semanaMaxima = 1;

    ordenadas.forEach((detalle, indice) => {
      const fecha = this.fechaLocal(detalle.planilla.fechaInicio ?? '');
      const numeroSemana = fecha
        ? Math.max(1, Math.floor(this.diferenciaDias(primeraFecha, fecha) / 7) + 1)
        : indice + 1;
      semanaMaxima = Math.max(semanaMaxima, numeroSemana);
      porSemana.set(numeroSemana, [...(porSemana.get(numeroSemana) ?? []), detalle]);
    });

    const semanas: PlanillaPdfSemana[] = [];
    for (let numero = 1; numero <= semanaMaxima; numero += 1) {
      const planillas = porSemana.get(numero) ?? [];
      if (!planillas.length) {
        semanas.push(this.planillaVaciaPdf(numero, this.sumarDias(primeraFecha, (numero - 1) * 7)));
        continue;
      }
      planillas.forEach((detalle) => semanas.push(this.planillaDetallePdf(detalle, numero, primeraFecha)));
    }
    return semanas;
  }

  private numeroSemanaPlanilla(planilla: Planilla): number {
    const primeraFecha = this.primeraFechaPlanillaObra(planilla.obraId);
    const fechaPlanilla = this.fechaLocal(planilla.fechaInicio ?? '');
    if (primeraFecha && fechaPlanilla) {
      return Math.max(1, Math.floor(this.diferenciaDias(primeraFecha, fechaPlanilla) / 7) + 1);
    }

    const indice = this.datos.planillas()
      .filter((item) => item.obraId === planilla.obraId)
      .sort((a, b) => this.compararPlanillasPorFecha(a, b))
      .findIndex((item) => item.id === planilla.id);
    return indice >= 0 ? indice + 1 : 1;
  }

  private primeraFechaPlanillaObra(obraId: number): Date | null {
    return this.datos.planillas()
      .filter((planilla) => planilla.obraId === obraId)
      .sort((a, b) => this.compararPlanillasPorFecha(a, b))
      .map((planilla) => this.fechaLocal(planilla.fechaInicio ?? ''))
      .find((fecha): fecha is Date => fecha !== null) ?? null;
  }

  private planillaDetallePdf(detalle: PlanillaDetalle, numeroSemana: number, primeraFecha: Date | null): PlanillaPdfSemana {
    const inicio = this.fechaLocal(detalle.planilla.fechaInicio ?? '')
      ?? (primeraFecha ? this.sumarDias(primeraFecha, (numeroSemana - 1) * 7) : null);
    const fin = this.fechaLocal(detalle.planilla.fechaFin ?? '')
      ?? (inicio ? this.sumarDias(inicio, this.diasBasePlanilla - 1) : null);
    const fechaInicio = inicio ? this.fechaIsoLocal(inicio) : (detalle.planilla.fechaInicio ?? '');
    const fechaFin = fin ? this.fechaIsoLocal(fin) : (detalle.planilla.fechaFin ?? '');
    const vacia = detalle.detalles.length === 0 || detalle.planilla.total <= 0;

    return {
      numero: numeroSemana,
      periodo: this.periodoSemana(numeroSemana, inicio, fin),
      fechaInicio,
      fechaFin,
      estado: vacia ? 'Sin trabajo' : this.estadoPlanillaEtiqueta(detalle.planilla),
      total: vacia ? 0 : detalle.planilla.total,
      vacia,
      detalles: detalle.detalles.map((fila) => {
        const trabajador = this.datos.trabajadores().find((item) => item.id === fila.trabajadorId);
        return {
          trabajador: fila.trabajador,
          dni: trabajador?.dni ?? '',
          cargo: this.cargoTrabajadorEtiqueta(fila.cargo),
          dias: fila.diasTrabajados,
          horasExtras: fila.horasExtras,
          sueldo: fila.sueldoBase,
          pagoExtras: fila.pagoHorasExtras,
          subtotal: fila.subtotal,
        };
      }),
    };
  }

  private planillaVaciaPdf(numeroSemana: number, inicio: Date): PlanillaPdfSemana {
    const fin = this.sumarDias(inicio, this.diasBasePlanilla - 1);
    return {
      numero: numeroSemana,
      periodo: this.periodoSemana(numeroSemana, inicio, fin),
      fechaInicio: this.fechaIsoLocal(inicio),
      fechaFin: this.fechaIsoLocal(fin),
      estado: 'Sin trabajo',
      total: 0,
      detalles: [],
      vacia: true,
    };
  }

  private compararPlanillasPorFecha(a: Planilla, b: Planilla): number {
    const fechaA = a.fechaInicio ?? '';
    const fechaB = b.fechaInicio ?? '';
    return fechaA.localeCompare(fechaB) || a.id - b.id;
  }

  private periodoSemana(numeroSemana: number, inicio: Date | null, fin: Date | null): string {
    if (!inicio || !fin) {
      return `Semana ${numeroSemana}`;
    }
    return `Semana ${numeroSemana} - ${this.rangoPeriodo(inicio, fin)}`;
  }

  private rangoPeriodo(inicio: Date, fin: Date): string {
    const mismoMes = inicio.getMonth() === fin.getMonth() && inicio.getFullYear() === fin.getFullYear();
    if (mismoMes) {
      return `${this.diaDosDigitos(inicio)}-${this.diaDosDigitos(fin)} ${this.mesCorto(fin)} ${fin.getFullYear()}`;
    }
    return `${this.diaDosDigitos(inicio)} ${this.mesCorto(inicio)} - ${this.diaDosDigitos(fin)} ${this.mesCorto(fin)} ${fin.getFullYear()}`;
  }

  private fechaLocal(fecha: string): Date | null {
    const [anio, mes, dia] = fecha.split('-').map((parte) => Number(parte));
    if (!anio || !mes || !dia) {
      return null;
    }
    return new Date(anio, mes - 1, dia);
  }

  private sumarDias(fecha: Date, dias: number): Date {
    const copia = new Date(fecha);
    copia.setDate(copia.getDate() + dias);
    return copia;
  }

  private diferenciaDias(inicio: Date, fin: Date): number {
    const inicioUtc = Date.UTC(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
    const finUtc = Date.UTC(fin.getFullYear(), fin.getMonth(), fin.getDate());
    return Math.floor((finUtc - inicioUtc) / 86_400_000);
  }

  private fechaIsoLocal(fecha: Date): string {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${this.diaDosDigitos(fecha)}`;
  }

  private diaDosDigitos(fecha: Date): string {
    return String(fecha.getDate()).padStart(2, '0');
  }

  private mesCorto(fecha: Date): string {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return meses[fecha.getMonth()];
  }

  private validarFormulario(formulario: FormGroup, mensaje = 'Completa los campos obligatorios resaltados.'): boolean {
    this.limpiarCamposTexto(formulario);

    if (formulario.valid) {
      return true;
    }

    formulario.markAllAsTouched();
    this.mostrarMensaje(mensaje);
    return false;
  }

  private limpiarCamposTexto(formulario: FormGroup): void {
    Object.values(formulario.controls).forEach((control) => {
      const valor = control.value;
      if (typeof valor === 'string') {
        control.setValue(valor.trim(), { emitEvent: false });
      }
    });
  }

  private controlTieneError(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  private mostrarMensaje(texto: string): void {
    this.mensaje.set(texto);
    window.setTimeout(() => this.mensaje.set(''), 2800);
  }

  private prepararNuevoTrabajador(): void {
    this.trabajadorEditandoId.set(null);
    this.trabajadorForm.reset({
      nombres: '',
      apellidos: '',
      dni: '',
      cargo: '',
      estado: 'activo',
    });
  }

  private prepararNuevoCargo(): void {
    this.cargoEditandoId.set(null);
    this.cargoForm.reset({
      nombre: '',
      sueldo: null,
      estado: 'activo',
    });
  }

  private prepararNuevoCliente(): void {
    this.clienteEditandoId.set(null);
    this.clienteForm.reset({ nombres: '', apellidos: '', telefono: '', direccion: '', estado: 'activo' });
  }

  private prepararNuevaCategoriaGasto(): void {
    this.categoriaGastoEditandoId.set(null);
    this.categoriaGastoForm.reset({ nombre: '', estado: 'activo' });
  }

  private prepararNuevoTipoIngreso(): void {
    this.tipoIngresoEditandoId.set(null);
    this.tipoIngresoForm.reset({ nombre: '', estado: 'activo' });
  }

  private esVistaMantenedor(vista: Vista): vista is VistaMantenedor {
    return ['trabajadores', 'cargos', 'clientes', 'categorias-gasto', 'tipos-ingreso'].includes(vista);
  }

  private prepararNuevaPlanilla(): void {
    const hoy = new Date();
    const dia = hoy.getDay() || 7;
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - dia + 1);
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 5);
    const obraSeleccionada = this.obraPlanillasSeleccionada() ?? this.datos.obras()[0];

    this.planillaForm.reset({
      obraId: obraSeleccionada?.id ?? 1,
      fechaInicio: this.fechaIso(inicio),
      fechaFin: this.fechaIso(fin),
    });

    this.diasPlanilla.set(Object.fromEntries(this.trabajadoresPlanilla().map((trabajador) => [trabajador.id, this.diasBasePlanilla])));
    this.horasExtrasPlanilla.set(Object.fromEntries(this.trabajadoresPlanilla().map((trabajador) => [trabajador.id, 0])));
    this.planillaRangoVersion.update((valor) => valor + 1);
  }

  private diasEntreFechas(inicio: string, fin: string): number {
    if (!inicio || !fin) {
      return 0;
    }
    const fechaInicio = new Date(`${inicio}T00:00:00`);
    const fechaFin = new Date(`${fin}T00:00:00`);
    const diferencia = fechaFin.getTime() - fechaInicio.getTime();
    if (!Number.isFinite(diferencia) || diferencia < 0) {
      return 0;
    }
    return Math.min(31, Math.floor(diferencia / 86_400_000) + 1);
  }

  private fechaIso(fecha: Date): string {
    return fecha.toISOString().slice(0, 10);
  }
}
