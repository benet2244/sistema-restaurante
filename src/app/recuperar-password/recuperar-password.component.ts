import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, // Para usar [(ngModel)]
    RouterLink   // Para usar [routerLink]
  ],
  templateUrl: './recuperar-password.component.html',
  styleUrls: ['./recuperar-password.component.css']
})
export class RecuperarPasswordComponent {
  email: string = '';
  mensaje: string = '';
  error: boolean = false;
  enviando: boolean = false;

  constructor(private authService: AuthService) { }

  /**
   * Se ejecuta al enviar el formulario de recuperación.
   */
  onSubmit(): void {
    if (!this.email) {
      this.mostrarMensaje('Por favor, ingresa tu correo electrónico.', true);
      return;
    }

    this.enviando = true;
    this.mensaje = '';

    this.authService.solicitarRecuperacion(this.email).subscribe({
      next: (respuesta) => {
        this.enviando = false;
        // Mensaje genérico para no revelar si un email está o no en la base de datos
        this.mostrarMensaje('Si tu correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.', false);
        this.email = ''; // Limpiar el campo
      },
      error: (err) => {
        this.enviando = false;
        // En un caso real, aquí se registraría el error, pero al usuario se le da un mensaje genérico.
        this.mostrarMensaje('Ocurrió un error en el proceso. Por favor, inténtalo de nuevo más tarde.', true);
        console.error('Error al solicitar recuperación:', err);
      }
    });
  }

  /**
   * Muestra un mensaje en la interfaz.
   * @param texto El mensaje a mostrar.
   * @param esError Define si el mensaje es de error (para aplicar estilos).
   */
  private mostrarMensaje(texto: string, esError: boolean): void {
    this.mensaje = texto;
    this.error = esError;
  }
}
