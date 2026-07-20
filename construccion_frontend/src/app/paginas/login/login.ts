import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { AutenticacionService } from '../../nucleo/servicios/autenticacion.service';

type CampoLogin = 'usuario' | 'contrasena';
type CampoRegistro = 'nombre' | 'usuario' | 'correo' | 'contrasena' | 'confirmacionContrasena';

const CONTRASENA_SEGURA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

const contrasenasCoinciden: ValidatorFn = (formulario: AbstractControl): ValidationErrors | null => {
  const contrasena = formulario.get('contrasena')?.value;
  const confirmacion = formulario.get('confirmacionContrasena')?.value;
  return contrasena && confirmacion && contrasena !== confirmacion
    ? { contrasenasNoCoinciden: true }
    : null;
};

const ICONOS_LOGIN: Record<string, string> = {
  helmet:
    '<svg viewBox="0 0 24 24"><path d="M4 15h16"/><path d="M5 15a7 7 0 0 1 14 0"/><path d="M8 15V9"/><path d="M16 15V9"/><path d="M3 18h18"/></svg>',
  mail:
    '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  lock:
    '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  user:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  eye:
    '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>',
  eyeOff:
    '<svg viewBox="0 0 24 24"><path d="m3 3 18 18"/><path d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6.5 0 10 6 10 6a16 16 0 0 1-2.2 3"/><path d="M6.6 6.6C3.6 8.4 2 12 2 12s3.5 6 10 6c1 0 2-.2 2.8-.4"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
};

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AutenticacionService);

  readonly modoRegistro = signal(false);
  readonly mostrarContrasenaLogin = signal(false);
  readonly mostrarContrasenaRegistro = signal(false);
  readonly mostrarConfirmacion = signal(false);
  readonly mostrarAyudaRecuperacion = signal(false);
  readonly mensaje = signal('');
  readonly tipoMensaje = signal<'error' | 'success' | 'info'>('error');
  readonly erroresRegistro = signal<Record<string, string>>({});
  readonly cargando = signal(false);

  readonly loginForm = this.fb.nonNullable.group({
    usuario: ['', [Validators.required]],
    contrasena: ['', [Validators.required]],
    recordar: [true],
  });

  readonly registroForm = this.fb.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
      usuario: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(80), Validators.pattern(/^[A-Za-z0-9._-]+$/)]],
      correo: ['', [Validators.email, Validators.maxLength(160)]],
      contrasena: ['', [Validators.required, Validators.pattern(CONTRASENA_SEGURA)]],
      confirmacionContrasena: ['', [Validators.required]],
    },
    { validators: contrasenasCoinciden },
  );

  constructor() {
    if (this.route.snapshot.queryParamMap.get('sesion') === 'expirada') {
      this.tipoMensaje.set('info');
      this.mensaje.set('Tu sesión expiró. Ingresa nuevamente para continuar.');
    }
  }

  iniciarSesion(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { usuario, contrasena, recordar } = this.loginForm.getRawValue();
    this.cargando.set(true);
    this.mensaje.set('');
    this.auth.iniciarSesion({ usuario: usuario.trim(), contrasena }, recordar).subscribe({
      next: () => {
        this.cargando.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.cargando.set(false);
        this.tipoMensaje.set('error');
        this.mensaje.set(error?.error?.mensaje ?? 'No se pudo iniciar sesión. Verifica tus credenciales.');
      },
    });
  }

  crearCuenta(): void {
    this.erroresRegistro.set({});
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }

    const datos = this.registroForm.getRawValue();
    this.cargando.set(true);
    this.mensaje.set('');
    this.auth.registrarCuenta({
      nombre: datos.nombre.trim(),
      usuario: datos.usuario.trim(),
      correo: datos.correo.trim() || null,
      contrasena: datos.contrasena,
      contrasena_confirmation: datos.confirmacionContrasena,
    }).subscribe({
      next: (mensaje) => {
        this.cargando.set(false);
        this.loginForm.patchValue({ usuario: datos.usuario.trim(), contrasena: '' });
        this.registroForm.reset({
          nombre: '',
          usuario: '',
          correo: '',
          contrasena: '',
          confirmacionContrasena: '',
        });
        this.modoRegistro.set(false);
        this.tipoMensaje.set('success');
        this.mensaje.set(mensaje);
      },
      error: (error) => {
        this.cargando.set(false);
        const errores = error?.error?.errors;
        if (errores && typeof errores === 'object') {
          this.erroresRegistro.set(
            Object.fromEntries(
              Object.entries(errores).map(([campo, mensajes]) => [
                campo,
                Array.isArray(mensajes) ? String(mensajes[0]) : String(mensajes),
              ]),
            ),
          );
          return;
        }
        this.tipoMensaje.set('error');
        this.mensaje.set(error?.error?.mensaje ?? 'No se pudo crear la cuenta. Intenta nuevamente.');
      },
    });
  }

  cambiarModo(registro: boolean): void {
    this.modoRegistro.set(registro);
    this.mostrarAyudaRecuperacion.set(false);
    this.mensaje.set('');
    this.erroresRegistro.set({});
  }

  campoLoginInvalido(campo: CampoLogin): boolean {
    const control = this.loginForm.controls[campo];
    return control.touched && control.invalid;
  }

  mensajeCampoLogin(campo: CampoLogin): string {
    const control = this.loginForm.controls[campo];
    if (control.hasError('required')) {
      return campo === 'usuario' ? 'Ingresa tu usuario o correo electrónico.' : 'Ingresa tu contraseña.';
    }
    return '';
  }

  campoRegistroInvalido(campo: CampoRegistro): boolean {
    const control = this.registroForm.controls[campo];
    if (campo === 'confirmacionContrasena') {
      return control.touched && (control.invalid || this.registroForm.hasError('contrasenasNoCoinciden'));
    }
    return control.touched && control.invalid;
  }

  mensajeCampoRegistro(campo: CampoRegistro): string {
    const campoApi = campo === 'confirmacionContrasena' ? 'contrasena_confirmation' : campo;
    const mensajeApi = this.erroresRegistro()[campoApi];
    if (mensajeApi) {
      return mensajeApi;
    }

    const control = this.registroForm.controls[campo];
    if (control.hasError('required')) {
      const nombres: Record<CampoRegistro, string> = {
        nombre: 'Ingresa tu nombre completo.',
        usuario: 'Crea un nombre de usuario.',
        correo: '',
        contrasena: 'Crea una contraseña.',
        confirmacionContrasena: 'Confirma tu contraseña.',
      };
      return nombres[campo];
    }
    if (campo === 'correo') {
      return 'Ingresa un correo electrónico válido.';
    }
    if (campo === 'usuario') {
      return 'Usa al menos 4 caracteres: letras, números, punto, guion o guion bajo.';
    }
    if (campo === 'nombre') {
      return 'El nombre debe tener al menos 3 caracteres.';
    }
    if (campo === 'contrasena') {
      return 'Usa al menos 8 caracteres, mayúscula, minúscula, número y símbolo.';
    }
    return 'Las contraseñas no coinciden.';
  }

  iconoSvg(nombre: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(ICONOS_LOGIN[nombre] ?? '');
  }
}
