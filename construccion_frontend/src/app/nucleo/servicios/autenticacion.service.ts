import { HttpClient } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, EMPTY, exhaustMap, map, Observable, take, timeout, timer, tap } from 'rxjs';
import { API_URL } from '../configuracion/api.config';

interface RespuestaApi<T> {
  exito: boolean;
  mensaje: string;
  datos: T;
  errores: unknown;
}

export interface UsuarioSesion {
  id: number;
  nombre: string;
  usuario: string;
  email: string | null;
  cargo: string;
  rol: string;
  foto: string;
}

interface RespuestaLogin extends UsuarioSesion {
  token: string;
  expiraEn: string;
  duracionMinutos: number;
}

interface CredencialesLogin {
  usuario: string;
  contrasena: string;
}

export interface RegistroUsuario {
  nombre: string;
  usuario: string;
  correo: string | null;
  contrasena: string;
  contrasena_confirmation: string;
}

interface SesionGuardada {
  usuario: UsuarioSesion;
  token: string;
  expiraEn: string;
  duracionMinutos: number;
  recordar: boolean;
}

const SESION_KEY = 'construct_control_sesion';
const SESION_USUARIO_ANTERIOR_KEY = 'construct_control_usuario';

@Injectable({ providedIn: 'root' })
export class AutenticacionService {
  private readonly apiUrl = API_URL;
  private readonly sesion = signal<SesionGuardada | null>(this.obtenerSesionGuardada());
  private temporizadorExpiracion: ReturnType<typeof setTimeout> | null = null;

  readonly usuario = computed(() => this.sesion()?.usuario ?? null);
  readonly expiraEn = computed(() => this.sesion()?.expiraEn ?? null);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {
    this.programarCierreAutomatico();
  }

  iniciarSesion(credenciales: CredencialesLogin, recordar: boolean): Observable<UsuarioSesion> {
    return this.http.post<RespuestaApi<RespuestaLogin>>(`${this.apiUrl}/autenticacion/iniciar-sesion`, {
      ...credenciales,
      recordar,
    }).pipe(
      map((respuesta) => {
        if (!respuesta.exito) {
          throw new Error(respuesta.mensaje || 'No se pudo iniciar sesion.');
        }
        return respuesta.datos;
      }),
      tap((datos) => this.guardarSesion(datos, recordar)),
      map((datos) => this.usuarioDesdeRespuesta(datos)),
    );
  }

  activarServidor(): Observable<void> {
    return timer(0, 3_000).pipe(
      exhaustMap(() =>
        this.http.get(`${this.apiUrl}/salud`, { responseType: 'text' }).pipe(
          timeout(10_000),
          catchError(() => EMPTY),
        ),
      ),
      take(1),
      timeout(90_000),
      map(() => undefined),
    );
  }

  registrarCuenta(datos: RegistroUsuario): Observable<string> {
    return this.http.post<RespuestaApi<null>>(`${this.apiUrl}/autenticacion/registrar`, datos).pipe(
      map((respuesta) => respuesta.mensaje),
    );
  }

  estaAutenticado(): boolean {
    const sesion = this.sesion();
    if (!sesion) {
      return false;
    }

    if (this.sesionExpirada(sesion)) {
      this.cerrarSesionPorExpiracion();
      return false;
    }

    return true;
  }

  token(): string | null {
    if (!this.estaAutenticado()) {
      return null;
    }
    return this.sesion()?.token ?? null;
  }

  cerrarSesion(notificarBackend = true): void {
    const token = this.sesion()?.token;
    this.limpiarSesion();

    if (notificarBackend && token) {
      this.http.post(`${this.apiUrl}/autenticacion/cerrar-sesion`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      }).subscribe({ error: () => undefined });
    }
  }

  forzarCierrePorServidor(): void {
    this.limpiarSesion();
  }

  private guardarSesion(datos: RespuestaLogin, recordar: boolean): void {
    const sesion: SesionGuardada = {
      usuario: this.usuarioDesdeRespuesta(datos),
      token: datos.token,
      expiraEn: datos.expiraEn,
      duracionMinutos: datos.duracionMinutos,
      recordar,
    };

    this.sesion.set(sesion);
    this.guardarSesionEnNavegador(sesion);
    this.programarCierreAutomatico();
  }

  private usuarioDesdeRespuesta(datos: RespuestaLogin): UsuarioSesion {
    return {
      id: datos.id,
      nombre: datos.nombre,
      usuario: datos.usuario,
      email: datos.email,
      cargo: datos.cargo,
      rol: datos.rol,
      foto: datos.foto,
    };
  }

  private guardarSesionEnNavegador(sesion: SesionGuardada): void {
    if (typeof window === 'undefined') {
      return;
    }

    const destino = sesion.recordar ? window.localStorage : window.sessionStorage;
    const opuesto = sesion.recordar ? window.sessionStorage : window.localStorage;
    destino.setItem(SESION_KEY, JSON.stringify(sesion));
    opuesto.removeItem(SESION_KEY);
    window.localStorage.removeItem(SESION_USUARIO_ANTERIOR_KEY);
    window.sessionStorage.removeItem(SESION_USUARIO_ANTERIOR_KEY);
  }

  private obtenerSesionGuardada(): SesionGuardada | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const guardada = window.localStorage.getItem(SESION_KEY) ?? window.sessionStorage.getItem(SESION_KEY);
    if (!guardada) {
      window.localStorage.removeItem(SESION_USUARIO_ANTERIOR_KEY);
      window.sessionStorage.removeItem(SESION_USUARIO_ANTERIOR_KEY);
      return null;
    }

    try {
      const sesion = JSON.parse(guardada) as SesionGuardada;
      if (!sesion.token || !sesion.expiraEn || this.sesionExpirada(sesion)) {
        this.removerSesionGuardada();
        return null;
      }
      return sesion;
    } catch {
      this.removerSesionGuardada();
      return null;
    }
  }

  private programarCierreAutomatico(): void {
    if (this.temporizadorExpiracion) {
      clearTimeout(this.temporizadorExpiracion);
      this.temporizadorExpiracion = null;
    }

    const sesion = this.sesion();
    if (!sesion || typeof window === 'undefined') {
      return;
    }

    const milisegundos = new Date(sesion.expiraEn).getTime() - Date.now();
    if (milisegundos <= 0) {
      this.cerrarSesionPorExpiracion();
      return;
    }

    this.temporizadorExpiracion = setTimeout(() => this.cerrarSesionPorExpiracion(), milisegundos);
  }

  private cerrarSesionPorExpiracion(): void {
    this.limpiarSesion();
    this.router.navigate(['/login'], { queryParams: { sesion: 'expirada' } }).catch(() => undefined);
  }

  private limpiarSesion(): void {
    if (this.temporizadorExpiracion) {
      clearTimeout(this.temporizadorExpiracion);
      this.temporizadorExpiracion = null;
    }
    this.sesion.set(null);
    this.removerSesionGuardada();
  }

  private removerSesionGuardada(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(SESION_KEY);
    window.sessionStorage.removeItem(SESION_KEY);
    window.localStorage.removeItem(SESION_USUARIO_ANTERIOR_KEY);
    window.sessionStorage.removeItem(SESION_USUARIO_ANTERIOR_KEY);
  }

  private sesionExpirada(sesion: SesionGuardada): boolean {
    return new Date(sesion.expiraEn).getTime() <= Date.now();
  }
}
