import { Injectable } from '@angular/core';

export interface PlanillaPdfObra {
  codigo: string;
  nombre: string;
  cliente: string;
  ubicacion: string;
}

export interface PlanillaPdfDetalle {
  trabajador: string;
  dni: string;
  cargo: string;
  dias: number;
  horasExtras: number;
  sueldo: number;
  pagoExtras: number;
  subtotal: number;
}

export interface PlanillaPdfSemana {
  numero: number;
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'Pagada' | 'Pendiente' | 'Sin trabajo';
  total: number;
  detalles: PlanillaPdfDetalle[];
  vacia: boolean;
}

type ColorPdf = [number, number, number];

const COLOR = {
  navy: [11, 31, 58] as ColorPdf,
  navySoft: [20, 51, 86] as ColorPdf,
  blue: [37, 99, 235] as ColorPdf,
  border: [205, 218, 236] as ColorPdf,
  muted: [83, 106, 145] as ColorPdf,
  orange: [255, 153, 0] as ColorPdf,
  green: [0, 173, 96] as ColorPdf,
  red: [239, 68, 68] as ColorPdf,
  amber: [245, 158, 11] as ColorPdf,
  lightBlue: [239, 246, 255] as ColorPdf,
  lightOrange: [255, 247, 237] as ColorPdf,
  white: [255, 255, 255] as ColorPdf,
  row: [248, 251, 255] as ColorPdf,
};

@Injectable({ providedIn: 'root' })
export class PlanillasPdfService {
  descargarPlanillasObra(obra: PlanillaPdfObra, semanas: PlanillaPdfSemana[]): void {
    const documento = new PdfDocument();

    this.dibujarCabeceraPrincipal(documento, obra);
    this.dibujarResumen(documento, obra, semanas);
    this.dibujarTituloSeccion(documento, 'Detalle semanal de planillas');

    semanas.forEach((semana) => this.dibujarSemana(documento, obra, semana));
    documento.agregarPies(`Planillas - ${obra.nombre}`);

    const url = URL.createObjectURL(documento.crearBlob());
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `planillas-${this.nombreArchivo(obra.nombre)}.pdf`;
    enlace.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  descargarPlanilla(obra: PlanillaPdfObra, semana: PlanillaPdfSemana): void {
    const documento = new PdfDocument();

    this.dibujarCabeceraPrincipal(documento, obra, 'Detalle de planilla semanal');
    this.dibujarResumenPlanilla(documento, obra, semana);
    this.dibujarTituloSeccion(documento, 'Detalle de trabajadores');
    this.dibujarSemana(documento, obra, semana);
    documento.agregarPies(`Planilla - ${obra.nombre} - ${semana.periodo}`);

    const url = URL.createObjectURL(documento.crearBlob());
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `planilla-${this.nombreArchivo(obra.nombre)}-semana-${semana.numero}.pdf`;
    enlace.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  private dibujarCabeceraPrincipal(documento: PdfDocument, obra: PlanillaPdfObra, titulo = 'Reporte detallado de planillas'): void {
    documento.rect(0, documento.alto - 82, documento.ancho, 82, COLOR.navy);
    documento.rect(34, documento.alto - 60, 34, 34, COLOR.orange);
    documento.texto('CC', 45, documento.alto - 48, 12, true, COLOR.white);
    documento.texto('ConstructControl', 78, documento.alto - 38, 12, true, COLOR.white);
    documento.texto(titulo, 78, documento.alto - 60, 22, true, COLOR.white);
    documento.texto(this.recortar(obra.nombre, 60), 78, documento.alto - 76, 10, false, [195, 213, 238]);
    documento.texto(
      `Generado: ${this.fechaGeneracion()}`,
      documento.ancho - 34,
      documento.alto - 39,
      9,
      false,
      [195, 213, 238],
      'right',
    );
    documento.y = documento.alto - 112;
  }

  private dibujarResumenPlanilla(documento: PdfDocument, obra: PlanillaPdfObra, semana: PlanillaPdfSemana): void {
    const trabajadores = semana.detalles.length;
    const dias = semana.detalles.reduce((total, detalle) => total + detalle.dias, 0);
    const horasExtras = semana.detalles.reduce((total, detalle) => total + detalle.horasExtras, 0);

    this.dibujarCajaDato(documento, 34, documento.y, 255, 42, 'OBRA', obra.nombre);
    this.dibujarCajaDato(documento, 306, documento.y, 255, 42, 'CODIGO', obra.codigo || 'No registrado');
    documento.y -= 50;
    this.dibujarCajaDato(documento, 34, documento.y, 255, 42, 'CLIENTE', obra.cliente || 'No registrado');
    this.dibujarCajaDato(documento, 306, documento.y, 255, 42, 'UBICACION', obra.ubicacion || 'No registrada');
    documento.y -= 50;
    this.dibujarCajaDato(documento, 34, documento.y, 255, 42, 'PERIODO', semana.periodo);
    this.dibujarCajaDato(documento, 306, documento.y, 255, 42, 'FECHAS', `${this.fechaCorta(semana.fechaInicio)} - ${this.fechaCorta(semana.fechaFin)}`);
    documento.y -= 62;

    const ancho = 121;
    const espacios = [34, 34 + ancho + 11, 34 + (ancho + 11) * 2, 34 + (ancho + 11) * 3];
    this.dibujarTarjetaResumen(documento, espacios[0], documento.y, ancho, 'SEMANA', `${semana.numero}`, COLOR.blue);
    this.dibujarTarjetaResumen(documento, espacios[1], documento.y, ancho, 'ESTADO', semana.estado, semana.estado === 'Pagada' ? COLOR.green : COLOR.amber);
    this.dibujarTarjetaResumen(documento, espacios[2], documento.y, ancho, 'TRABAJADORES', `${trabajadores}`, COLOR.navySoft);
    this.dibujarTarjetaResumen(documento, espacios[3], documento.y, ancho, 'TOTAL', this.moneda(semana.total), COLOR.green);
    documento.y -= 62;

    documento.rect(34, documento.y - 34, 527, 34, [250, 252, 255], COLOR.border);
    documento.texto(`Dias registrados: ${this.numero(dias)}`, 48, documento.y - 14, 10, true, COLOR.navy);
    documento.texto(`Horas extra: ${this.numero(horasExtras)}`, 210, documento.y - 14, 10, true, COLOR.orange);
    documento.texto(`Trabajadores incluidos: ${trabajadores}`, 548, documento.y - 14, 10, true, COLOR.muted, 'right');
    documento.y -= 54;
  }

  private dibujarResumen(documento: PdfDocument, obra: PlanillaPdfObra, semanas: PlanillaPdfSemana[]): void {
    const planillasRegistradas = semanas.filter((semana) => !semana.vacia).length;
    const semanasVacias = semanas.filter((semana) => semana.vacia).length;
    const totalGeneral = semanas.reduce((total, semana) => total + semana.total, 0);
    const totalPagado = semanas
      .filter((semana) => semana.estado === 'Pagada')
      .reduce((total, semana) => total + semana.total, 0);
    const totalPendiente = semanas
      .filter((semana) => semana.estado === 'Pendiente')
      .reduce((total, semana) => total + semana.total, 0);

    this.dibujarCajaDato(documento, 34, documento.y, 255, 42, 'OBRA', obra.nombre);
    this.dibujarCajaDato(documento, 306, documento.y, 255, 42, 'CODIGO', obra.codigo || 'No registrado');
    documento.y -= 50;
    this.dibujarCajaDato(documento, 34, documento.y, 255, 42, 'CLIENTE', obra.cliente || 'No registrado');
    this.dibujarCajaDato(documento, 306, documento.y, 255, 42, 'UBICACION', obra.ubicacion || 'No registrada');
    documento.y -= 62;

    const ancho = 121;
    const espacios = [34, 34 + ancho + 11, 34 + (ancho + 11) * 2, 34 + (ancho + 11) * 3];
    this.dibujarTarjetaResumen(documento, espacios[0], documento.y, ancho, 'SEMANAS', `${semanas.length}`, COLOR.blue);
    this.dibujarTarjetaResumen(documento, espacios[1], documento.y, ancho, 'PLANILLAS', `${planillasRegistradas}`, COLOR.navySoft);
    this.dibujarTarjetaResumen(documento, espacios[2], documento.y, ancho, 'SIN TRABAJO', `${semanasVacias}`, COLOR.orange);
    this.dibujarTarjetaResumen(documento, espacios[3], documento.y, ancho, 'TOTAL', this.moneda(totalGeneral), COLOR.green);
    documento.y -= 62;

    documento.rect(34, documento.y - 34, 527, 34, [250, 252, 255], COLOR.border);
    documento.texto(`Pagadas: ${this.moneda(totalPagado)}`, 48, documento.y - 14, 10, true, COLOR.green);
    documento.texto(`Pendientes: ${this.moneda(totalPendiente)}`, 210, documento.y - 14, 10, true, COLOR.amber);
    documento.texto(
      'Las semanas sin trabajo se incluyen para mantener la secuencia real desde la primera planilla.',
      48,
      documento.y - 27,
      8,
      false,
      COLOR.muted,
    );
    documento.y -= 54;
  }

  private dibujarTituloSeccion(documento: PdfDocument, titulo: string): void {
    documento.texto(titulo, 34, documento.y, 14, true, COLOR.navy);
    documento.linea(34, documento.y - 8, 561, documento.y - 8, COLOR.border);
    documento.y -= 26;
  }

  private dibujarSemana(documento: PdfDocument, obra: PlanillaPdfObra, semana: PlanillaPdfSemana): void {
    const altoMinimo = semana.vacia ? 82 : 112;
    this.asegurarEspacio(documento, obra, altoMinimo);

    const inicioY = documento.y;
    documento.rect(34, inicioY - 42, 527, 42, semana.vacia ? COLOR.lightOrange : COLOR.lightBlue, COLOR.border);
    documento.texto(semana.periodo, 48, inicioY - 16, 12, true, COLOR.navy);
    documento.texto(`${this.fechaCorta(semana.fechaInicio)} - ${this.fechaCorta(semana.fechaFin)}`, 48, inicioY - 31, 8, false, COLOR.muted);

    const colorEstado = semana.estado === 'Pagada' ? COLOR.green : semana.estado === 'Pendiente' ? COLOR.amber : COLOR.red;
    documento.rect(440, inicioY - 30, 58, 18, colorEstado);
    documento.texto(semana.estado, 469, inicioY - 24, 7, true, COLOR.white, 'center');
    documento.texto(this.moneda(semana.total), 548, inicioY - 23, 12, true, semana.vacia ? COLOR.red : COLOR.green, 'right');
    documento.y -= 52;

    if (semana.vacia) {
      documento.rect(34, documento.y - 34, 527, 34, [255, 252, 247], COLOR.border);
      documento.texto('No hubo trabajadores registrados en esta semana.', 48, documento.y - 15, 10, true, COLOR.red);
      documento.texto('Total de la semana: S/ 0', 548, documento.y - 15, 9, true, COLOR.red, 'right');
      documento.y -= 48;
      return;
    }

    this.dibujarCabeceraTabla(documento);
    semana.detalles.forEach((detalle, indice) => {
      this.asegurarEspacio(documento, obra, 34, () => {
        documento.texto(`${semana.periodo} (continuacion)`, 34, documento.y, 11, true, COLOR.navy);
        documento.y -= 18;
        this.dibujarCabeceraTabla(documento);
      });
      this.dibujarFilaDetalle(documento, detalle, indice % 2 === 0);
    });
    documento.y -= 14;
  }

  private dibujarCabeceraTabla(documento: PdfDocument): void {
    const y = documento.y;
    documento.rect(34, y - 24, 527, 24, COLOR.navySoft);
    const columnas = this.columnasTabla();
    columnas.forEach((columna) => {
      documento.texto(columna.titulo, columna.x + 4, y - 15, 7, true, COLOR.white);
    });
    documento.y -= 24;
  }

  private dibujarFilaDetalle(documento: PdfDocument, detalle: PlanillaPdfDetalle, alterna: boolean): void {
    const y = documento.y;
    documento.rect(34, y - 30, 527, 30, alterna ? COLOR.row : COLOR.white, COLOR.border);
    const columnas = this.columnasTabla();

    documento.texto(this.recortar(detalle.trabajador, 25), columnas[0].x + 4, y - 12, 8, true, COLOR.navy);
    documento.texto(`DNI ${detalle.dni || 'No registrado'}`, columnas[0].x + 4, y - 24, 7, false, COLOR.muted);
    documento.texto(this.recortar(detalle.cargo, 18), columnas[1].x + 4, y - 17, 8, false, COLOR.navy);
    documento.texto(this.numero(detalle.dias), columnas[2].x + columnas[2].w / 2, y - 17, 8, true, COLOR.navy, 'center');
    documento.texto(this.numero(detalle.horasExtras), columnas[3].x + columnas[3].w / 2, y - 17, 8, true, COLOR.navy, 'center');
    documento.texto(this.moneda(detalle.sueldo), columnas[4].x + columnas[4].w - 5, y - 17, 8, false, COLOR.navy, 'right');
    documento.texto(this.moneda(detalle.pagoExtras), columnas[5].x + columnas[5].w - 5, y - 17, 8, false, COLOR.navy, 'right');
    documento.texto(this.moneda(detalle.subtotal), columnas[6].x + columnas[6].w - 5, y - 17, 8, true, COLOR.green, 'right');
    documento.y -= 30;
  }

  private dibujarCajaDato(documento: PdfDocument, x: number, y: number, ancho: number, alto: number, etiqueta: string, valor: string): void {
    documento.rect(x, y - alto, ancho, alto, [250, 252, 255], COLOR.border);
    documento.texto(etiqueta, x + 12, y - 15, 7, true, COLOR.muted);
    documento.texto(this.recortar(valor, 44), x + 12, y - 30, 9, true, COLOR.navy);
  }

  private dibujarTarjetaResumen(documento: PdfDocument, x: number, y: number, ancho: number, etiqueta: string, valor: string, color: ColorPdf): void {
    documento.rect(x, y - 50, ancho, 50, COLOR.white, COLOR.border);
    documento.rect(x, y - 50, 4, 50, color);
    documento.texto(etiqueta, x + 14, y - 17, 7, true, COLOR.muted);
    documento.texto(valor, x + 14, y - 36, 13, true, color);
  }

  private asegurarEspacio(documento: PdfDocument, obra: PlanillaPdfObra, alto: number, despuesDeNuevaPagina?: () => void): void {
    if (documento.y - alto >= 58) {
      return;
    }
    documento.agregarPagina();
    this.dibujarCabeceraPagina(documento, obra);
    despuesDeNuevaPagina?.();
  }

  private dibujarCabeceraPagina(documento: PdfDocument, obra: PlanillaPdfObra): void {
    documento.rect(0, documento.alto - 42, documento.ancho, 42, COLOR.navy);
    documento.texto('ConstructControl', 34, documento.alto - 18, 10, true, COLOR.white);
    documento.texto(this.recortar(obra.nombre, 52), 34, documento.alto - 32, 8, false, [195, 213, 238]);
    documento.y = documento.alto - 66;
  }

  private columnasTabla(): { titulo: string; x: number; w: number }[] {
    return [
      { titulo: 'Trabajador', x: 34, w: 145 },
      { titulo: 'Cargo', x: 179, w: 75 },
      { titulo: 'Dias', x: 254, w: 38 },
      { titulo: 'H. extras', x: 292, w: 54 },
      { titulo: 'Sueldo', x: 346, w: 70 },
      { titulo: 'Extras', x: 416, w: 70 },
      { titulo: 'Subtotal', x: 486, w: 75 },
    ];
  }

  private moneda(valor: number): string {
    return `S/ ${Math.round(valor || 0).toLocaleString('en-US')}`;
  }

  private numero(valor: number): string {
    return Number.isInteger(valor) ? `${valor}` : `${valor.toFixed(1)}`;
  }

  private fechaCorta(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-').map((parte) => Number(parte));
    if (!anio || !mes || !dia) {
      return fecha;
    }
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${String(dia).padStart(2, '0')} ${meses[mes - 1]} ${anio}`;
  }

  private fechaGeneracion(): string {
    const hoy = new Date();
    return `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
  }

  private recortar(valor: string, maximo: number): string {
    const texto = this.limpiarTexto(valor);
    return texto.length <= maximo ? texto : `${texto.slice(0, Math.max(0, maximo - 3))}...`;
  }

  private nombreArchivo(valor: string): string {
    return this.limpiarTexto(valor)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'obra';
  }

  private limpiarTexto(valor: string): string {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

class PdfDocument {
  readonly ancho = 595.28;
  readonly alto = 841.89;
  y = 0;
  private paginas: string[][] = [];
  private paginaActual: string[] = [];

  constructor() {
    this.agregarPagina();
  }

  agregarPagina(): void {
    this.paginaActual = [];
    this.paginas.push(this.paginaActual);
    this.y = this.alto - 34;
  }

  rect(x: number, y: number, ancho: number, alto: number, relleno?: ColorPdf, borde?: ColorPdf): void {
    if (relleno) {
      this.paginaActual.push(`${this.color(relleno, 'rg')} ${this.n(x)} ${this.n(y)} ${this.n(ancho)} ${this.n(alto)} re f`);
    }
    if (borde) {
      this.paginaActual.push(`${this.color(borde, 'RG')} 0.8 w ${this.n(x)} ${this.n(y)} ${this.n(ancho)} ${this.n(alto)} re S`);
    }
  }

  linea(x1: number, y1: number, x2: number, y2: number, color: ColorPdf): void {
    this.paginaActual.push(`${this.color(color, 'RG')} 0.8 w ${this.n(x1)} ${this.n(y1)} m ${this.n(x2)} ${this.n(y2)} l S`);
  }

  texto(texto: string, x: number, y: number, tamano: number, negrita = false, color: ColorPdf = COLOR.navy, alinear: 'left' | 'center' | 'right' = 'left'): void {
    const limpio = this.prepararTexto(texto);
    const anchoEstimado = limpio.length * tamano * 0.48;
    const textoX = alinear === 'right' ? x - anchoEstimado : alinear === 'center' ? x - anchoEstimado / 2 : x;
    this.paginaActual.push(`${this.color(color, 'rg')} BT /${negrita ? 'F2' : 'F1'} ${this.n(tamano)} Tf ${this.n(textoX)} ${this.n(y)} Td (${this.escapar(limpio)}) Tj ET`);
  }

  agregarPies(titulo: string): void {
    const total = this.paginas.length;
    this.paginas.forEach((pagina, indice) => {
      pagina.push(`${this.color(COLOR.border, 'RG')} 0.6 w 34 34 m 561 34 l S`);
      pagina.push(`${this.color(COLOR.muted, 'rg')} BT /F1 7 Tf 34 20 Td (${this.escapar(this.prepararTexto(titulo))}) Tj ET`);
      pagina.push(`${this.color(COLOR.muted, 'rg')} BT /F1 7 Tf 520 20 Td (${this.escapar(`Pagina ${indice + 1} de ${total}`)}) Tj ET`);
    });
  }

  crearBlob(): Blob {
    const objetos: string[] = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      `<< /Type /Pages /Kids [${this.paginas.map((_, indice) => `${5 + indice * 2} 0 R`).join(' ')}] /Count ${this.paginas.length} >>`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    ];

    this.paginas.forEach((pagina, indice) => {
      const paginaObjeto = 5 + indice * 2;
      const contenidoObjeto = paginaObjeto + 1;
      const contenido = pagina.join('\n');
      objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.n(this.ancho)} ${this.n(this.alto)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contenidoObjeto} 0 R >>`);
      objetos.push(`<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`);
    });

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];
    objetos.forEach((objeto, indice) => {
      offsets.push(pdf.length);
      pdf += `${indice + 1} 0 obj\n${objeto}\nendobj\n`;
    });

    const inicioXref = pdf.length;
    pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;

    return new Blob([pdf], { type: 'application/pdf' });
  }

  private color(color: ColorPdf, operador: 'rg' | 'RG'): string {
    return `${this.n(color[0] / 255)} ${this.n(color[1] / 255)} ${this.n(color[2] / 255)} ${operador}`;
  }

  private n(valor: number): string {
    return Number(valor.toFixed(2)).toString();
  }

  private prepararTexto(valor: string): string {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private escapar(valor: string): string {
    return valor.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}
