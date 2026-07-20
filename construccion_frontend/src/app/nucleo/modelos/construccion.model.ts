export type EstadoObra = 'en_ejecucion' | 'finalizada';

export interface Obra {
  id: number;
  codigo: string;
  nombre: string;
  cliente: string;
  responsable: string;
  ubicacion: string;
  presupuesto: number;
  ingresos: number;
  gastos: number;
  avance: number;
  estado: EstadoObra;
  fechaInicio: string;
  fechaFin: string;
  imagen: string;
}

export interface DatosObra {
  codigo: string;
  nombre: string;
  cliente: string;
  ubicacion: string;
  presupuesto: number;
  avance: number;
  estado: EstadoObra;
  fechaInicio: string;
  fechaFin: string;
}

export interface Trabajador {
  id: number;
  nombres: string;
  apellidos: string;
  dni: string;
  cargo: string;
  sueldo: number;
  estado: 'activo' | 'inactivo';
}

export interface Cargo {
  id: number;
  codigo: string;
  nombre: string;
  sueldo: number;
  estado: 'activo' | 'inactivo';
}

export interface Cliente {
  id: number;
  nombres: string;
  apellidos: string;
  telefono: string;
  direccion: string;
  estado: 'activo' | 'inactivo';
}

export interface CategoriaGasto {
  id: number;
  nombre: string;
  estado: 'activo' | 'inactivo';
}

export interface TipoIngreso {
  id: number;
  nombre: string;
  estado: 'activo' | 'inactivo';
}

export interface Material {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: string;
  stock: number;
  stockMin: number;
  precioPromedio: number;
  almacen: string;
}

export interface Gasto {
  id: number;
  obraId: number;
  categoria: string;
  descripcion: string;
  monto: number;
  fecha: string;
  estado: 'pendiente' | 'pagado';
}

export interface Ingreso {
  id: number;
  obraId: number;
  cliente: string;
  tipo: string;
  monto: number;
  fecha: string;
  estado: 'pendiente' | 'pagado';
}

export interface Maquinaria {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  propiedad: string;
  obraId: number;
  responsable: string;
  estado: 'disponible' | 'en_uso' | 'mantenimiento' | 'averiada';
  horasUso: number;
  mantenimiento: string;
}

export interface AlertaSistema {
  tipo: 'danger' | 'warning' | 'info' | 'success';
  texto: string;
  tiempo: string;
}

export interface Asistencia {
  id: number;
  trabajadorId: number;
  trabajador: string;
  cargo: string;
  foto: string;
  obraId: number;
  fecha: string;
  entrada: string | null;
  salida: string | null;
  estado: 'presente' | 'tardanza' | 'falta' | 'permiso' | 'descanso';
  horasNormales: number;
  horasExtras: number;
  observacion: string | null;
}

export interface Planilla {
  id: number;
  periodo: string;
  obraId: number;
  obra: string;
  trabajadores: number;
  total: number;
  estado: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface DetallePlanilla {
  trabajadorId: number;
  diasTrabajados: number;
  horasExtras: number;
}

export interface DetallePlanillaVista {
  trabajadorId: number;
  trabajador: string;
  cargo: string;
  diasTrabajados: number;
  horasExtras: number;
  sueldoBase: number;
  pagoHorasExtras: number;
  subtotal: number;
}

export interface PlanillaDetalle {
  planilla: Planilla;
  detalles: DetallePlanillaVista[];
}

export interface NuevaPlanilla {
  obraId: number;
  fechaInicio: string;
  fechaFin: string;
  detalles: DetallePlanilla[];
}

export interface PuntoGrafico {
  etiqueta: string;
  valorA: number;
  valorB?: number;
}
