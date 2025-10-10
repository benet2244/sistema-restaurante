// src/app/login/login.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { LoginResponse } from '../models/auth.models'; // <-- ¡IMPORTACIÓN DEL NUEVO ARCHIVO!

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credenciales = {
    email: '',
    password: ''
  };  

  constructor(private authService: AuthService, private router: Router) {}

  iniciarSesion(): void {
    if (!this.credenciales.email || !this.credenciales.password) {
      alert('Por Favor, ingresa tu correo y contraseña.');
      return;
    }

    this.authService.login(this.credenciales).subscribe({
      next: (respuesta: LoginResponse) => {
        const rolReal = respuesta.rol;
        this.redirigirPorRol(rolReal);
      },
      error: (error: any) => {
        console.error('Login Fallido: ', error);
        // Usa la propiedad 'error' de la respuesta si está disponible
        const errorMessage = error.error?.mensaje || 'Credenciales incorrectas o error de conexión. Intenta de nuevo';
        alert(errorMessage);
      }
    });
  }

  redirigirPorRol(role: string): void {
    if (role === 'customer') {
      this.router.navigate(['/cliente']);
    } else if (role === 'admin') {
      this.router.navigate(['/administrador/dashboard']);
    } else {
      alert(`Rol '${role}' desconocido. Redirigiendo a inicio.`);
      this.router.navigate(['/']);
    }
  }
}