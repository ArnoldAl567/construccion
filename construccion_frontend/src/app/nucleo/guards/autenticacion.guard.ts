import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AutenticacionService } from '../servicios/autenticacion.service';

export const requiereSesionGuard: CanActivateFn = () => {
  const auth = inject(AutenticacionService);
  const router = inject(Router);
  return auth.estaAutenticado() ? true : router.createUrlTree(['/login']);
};

export const soloInvitadoGuard: CanActivateFn = () => {
  const auth = inject(AutenticacionService);
  const router = inject(Router);
  return auth.estaAutenticado() ? router.createUrlTree(['/dashboard']) : true;
};
