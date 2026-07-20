import { Injectable, signal } from '@angular/core';

const TEMA_KEY = 'construct_control_tema';

@Injectable({ providedIn: 'root' })
export class TemaService {
  readonly oscuro = signal(this.leerTemaGuardado());

  alternar(): void {
    this.establecer(!this.oscuro());
  }

  establecer(oscuro: boolean): void {
    this.oscuro.set(oscuro);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TEMA_KEY, oscuro ? 'oscuro' : 'claro');
    }
  }

  private leerTemaGuardado(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.localStorage.getItem(TEMA_KEY) === 'oscuro';
  }
}
