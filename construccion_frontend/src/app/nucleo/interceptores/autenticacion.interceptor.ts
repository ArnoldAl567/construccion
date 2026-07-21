import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../configuracion/api.config';
import { AutenticacionService } from '../servicios/autenticacion.service';

export const autenticacionInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AutenticacionService);
  const router = inject(Router);
  const token = auth.token();
  const esApi = request.url.startsWith(API_URL);
  const esAutenticacionPublica = request.url.includes('/autenticacion/iniciar-sesion')
    || request.url.includes('/autenticacion/registrar');

  const solicitud = esApi && token && !esAutenticacionPublica
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(solicitud).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && esApi && !esAutenticacionPublica) {
        auth.forzarCierrePorServidor();
        router.navigate(['/login'], { queryParams: { sesion: 'expirada' } }).catch(() => undefined);
      }

      return throwError(() => error);
    }),
  );
};
