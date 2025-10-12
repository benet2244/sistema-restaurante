// src/app/services/auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { LoginResponse } from '../models/auth.models';

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
        // Este tap sigue siendo útil para debugging o acciones que no necesitan esperar
        console.log("Respuesta recibida del backend:", response);
      }),
      map(response => {
        // Usamos map para transformar la respuesta y asegurarnos de que el guardado se complete
        if (response && response.user_id && response.token && response.rol) {
          localStorage.setItem('user_id', String(response.user_id));
          localStorage.setItem('user_name', response.first_name || ''); // Guardar nombre
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('user_role', response.rol);
        } else {
          // Si la respuesta no es válida, lanzamos un error para que la subscripción falle
          throw new Error('Respuesta de login inválida del servidor.');
        }
        // Devolvemos la respuesta original para que el componente la pueda usar
        return response;
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

  solicitarRecuperacion(email: string): Observable<any> {
    const endpoint = `${this.apiUrl}/auth.php?action=solicitar_recuperacion`;
    return this.http.post(endpoint, { email });
  }
}
