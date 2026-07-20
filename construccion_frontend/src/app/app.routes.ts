import { Routes } from '@angular/router';
import { requiereSesionGuard, soloInvitadoGuard } from './nucleo/guards/autenticacion.guard';

const panel = () => import('./paginas/panel/panel').then((m) => m.PanelComponent);

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./paginas/login/login').then((m) => m.LoginComponent),
    canActivate: [soloInvitadoGuard],
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', loadComponent: panel, canActivate: [requiereSesionGuard], data: { vista: 'dashboard' } },
  { path: 'obras', loadComponent: panel, canActivate: [requiereSesionGuard], data: { vista: 'obras' } },
  { path: 'mantenedor', pathMatch: 'full', redirectTo: 'mantenedor/trabajadores' },
  { path: 'mantenedor/trabajadores', loadComponent: panel, canActivate: [requiereSesionGuard], data: { vista: 'trabajadores' } },
  { path: 'mantenedor/cargos', loadComponent: panel, canActivate: [requiereSesionGuard], data: { vista: 'cargos' } },
  { path: 'mantenedor/clientes', loadComponent: panel, canActivate: [requiereSesionGuard], data: { vista: 'clientes' } },
  { path: 'mantenedor/categorias-gasto', loadComponent: panel, canActivate: [requiereSesionGuard], data: { vista: 'categorias-gasto' } },
  { path: 'mantenedor/tipos-ingreso', loadComponent: panel, canActivate: [requiereSesionGuard], data: { vista: 'tipos-ingreso' } },
  { path: 'planillas', loadComponent: panel, canActivate: [requiereSesionGuard], data: { vista: 'planillas' } },
  { path: 'gastos', loadComponent: panel, canActivate: [requiereSesionGuard], data: { vista: 'gastos' } },
  { path: 'ingresos', loadComponent: panel, canActivate: [requiereSesionGuard], data: { vista: 'ingresos' } },
  { path: 'reportes', loadComponent: panel, canActivate: [requiereSesionGuard], data: { vista: 'reportes' } },
  { path: 'usuarios', loadComponent: panel, canActivate: [requiereSesionGuard], data: { vista: 'usuarios' } },
  { path: 'configuracion', loadComponent: panel, canActivate: [requiereSesionGuard], data: { vista: 'configuracion' } },
  { path: '**', redirectTo: 'dashboard' },
];
