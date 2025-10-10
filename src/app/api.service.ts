import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // --- MÉTODOS DE AUTENTICACIÓN ---

  /**
   * Envía las credenciales para iniciar sesión.
   * @param credenciales Objeto con email y password.
   */
  login(credenciales: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, credenciales);
  }

  /**
   * Registra un nuevo usuario.
   * @param datosUsuario Objeto con los datos del nuevo cliente.
   */
  registro(datosUsuario: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/registro`, datosUsuario);
  }

  // --- MÉTODOS PARA RESERVAS ---

  /**
   * Obtiene todas las reservas (para la vista de administrador).
   */
  obtenerReservas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/reservas`);
  }

  /**
   * Obtiene las reservas de un cliente específico.
   * @param clienteId El ID del cliente.
   */
  obtenerReservasPorCliente(clienteId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/reservas/cliente/${clienteId}`);
  }

  /**
   * Crea una nueva reserva.
   * @param datosReserva Objeto con los detalles de la reserva.
   */
  crearReserva(datosReserva: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/reservas`, datosReserva);
  }

  /**
   * Actualiza una reserva existente.
   * @param reservaId El ID de la reserva a modificar.
   * @param datosReserva Objeto con los nuevos datos.
   */
  actualizarReserva(reservaId: number, datosReserva: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/reservas/${reservaId}`, datosReserva);
  }

  /**
   * Cancela una reserva.
   * @param reservaId El ID de la reserva a cancelar.
   */
  cancelarReserva(reservaId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reservas/${reservaId}`);
  }

  // --- MÉTODOS PARA MESAS ---

  /**
   * Obtiene el estado actual de todas las mesas.
   */
  obtenerMesas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/mesas`);
  }

  /**
   * Obtiene los horarios disponibles para una fecha.
   * @param fecha La fecha en formato YYYY-MM-DD.
   */
  obtenerHorariosDisponibles(fecha: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/disponibilidad/horarios?fecha=${fecha}`);
  }

   /**
   * Obtiene las zonas del restaurante (Terraza, Interior, etc.).
   */
  obtenerZonas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/zonas`);
  }

}
