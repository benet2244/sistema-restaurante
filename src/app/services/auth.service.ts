// src/app/services/auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoginResponse } from '../models/auth.models'; // <-- ¡IMPORTACIÓN ACTUALIZADA!

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = "http://localhost/api";

  constructor(private http: HttpClient) { }

  login(credenciales: any): Observable<LoginResponse> {
    const endpoint = `${this.apiUrl}/auth.php?action=login`; 

    return this.http.post<LoginResponse>(endpoint, credenciales).pipe(
      tap(response => {
        if (response.user_id) {
          localStorage.setItem('user_id', String(response.user_id));
        }
        // Usamos first_name del backend y lo guardamos como user_name
        if (response.first_name) {
          localStorage.setItem('user_name', response.first_name);
        }
        if (response.token) {
          localStorage.setItem('auth_token', response.token);
        }
        if (response.rol) {
          localStorage.setItem('user_role', response.rol);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('user_id'); 
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
  }
  
  getUserId(): number | null {
    const idString = localStorage.getItem('user_id');
    return idString ? parseInt(idString, 10) : null; 
  }

  getUserName(): string | null {
    return localStorage.getItem('user_name');
  }

  /**
   * Envía una solicitud al backend para iniciar el proceso de recuperación de contraseña.
   * @param email El correo electrónico del usuario que solicita la recuperación.
   * @returns Un Observable que emite la respuesta del servidor.
   */
  solicitarRecuperacion(email: string): Observable<any> {
    // CORREGIDO: El nombre de la acción ahora coincide con el backend
    const endpoint = `${this.apiUrl}/auth.php?action=solicitar_recuperacion`;
    return this.http.post(endpoint, { email });
  }
}
