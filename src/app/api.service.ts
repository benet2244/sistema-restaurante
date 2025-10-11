import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://127.0.0.1:3000/api'; // URL del backend

  constructor(private http: HttpClient) { }

  // --- MÉTODOS DE AUTENTICACIÓN ---

  login(credenciales: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, credenciales);
  }

  registro(datosUsuario: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/registro`, datosUsuario);
  }

  // --- MÉTODOS PARA RESERVAS ---

  obtenerReservas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/reservas`);
  }

  obtenerReservasPorCliente(clienteId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/reservas/cliente/${clienteId}`);
  }

  crearReserva(datosReserva: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/reservas`, datosReserva);
  }

  actualizarReserva(reservaId: number, datosReserva: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/reservas/${reservaId}`, datosReserva);
  }

  cancelarReserva(reservaId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reservas/${reservaId}`);
  }

  // --- MÉTODOS PARA MESAS Y DISPONIBILIDAD ---

  obtenerMesas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/mesas`);
  }

  obtenerHorariosDisponibles(fecha: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/disponibilidad/horarios?fecha=${fecha}`);
  }

  getAvailableTables(fecha: string, hora: string, personas: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/disponibilidad/mesas?fecha=${fecha}&hora=${hora}&personas=${personas}`);
  }

  obtenerZonas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/zonas`);
  }
}
