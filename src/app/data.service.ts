import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// ... (otras interfaces) ...

// INTERFAZ PARA LA CONFIGURACIÓN DEL RESTAURANTE
export interface RestauranteConfig {
  id?: number;
  nombre?: string;
  direccion?: string;
  telefono?: string;
  horario_apertura?: string;
  horario_cierre?: string;
  [key: string]: any; // Para flexibilidad
}

@Injectable({ providedIn: 'root' })
export class ServiceRestaurant {
  private apiUrl = 'http://localhost/api';

  private headers = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  constructor(private http: HttpClient) {}

  // ========================================================================
  // MÉTODOS PARA LA CONFIGURACIÓN DEL RESTAURANTE
  // ========================================================================

  obtenerConfiguracionRestaurante(): Observable<RestauranteConfig> {
    const endpoint = `${this.apiUrl}/configuracion.php`;
    return this.http.get<RestauranteConfig>(endpoint).pipe(catchError(this.handleError));
  }

  actualizarConfiguracionRestaurante(config: RestauranteConfig): Observable<any> {
    const endpoint = `${this.apiUrl}/configuracion.php`;
    return this.http.put<any>(endpoint, config, { headers: this.headers }).pipe(catchError(this.handleError));
  }

  // ... (resto de los métodos existentes) ...
  getTables(): Observable<any> {
    const endpoint = `${this.apiUrl}/mesas.php`;
    return this.http.get<any>(endpoint).pipe(catchError(this.handleError));
  }

  obtenerMesasDisponibles(filtros: { fecha: string; horario: string; personas: number; zona: string }): Observable<Mesa[]> {
    const endpoint = `${this.apiUrl}/mesas_disponibles.php`;
    const params = new HttpParams()
      .set('fecha', filtros.fecha)
      .set('horario', filtros.horario)
      .set('personas', filtros.personas.toString())
      .set('zona', filtros.zona);
    return this.http.get<Mesa[]>(endpoint, { params }).pipe(catchError(this.handleError));
  }
  
  getTableById(id: number): Observable<any> {
    const endpoint = `${this.apiUrl}/mesas.php/${id}`;
    return this.http.get<any>(endpoint).pipe(catchError(this.handleError));
  }

  createTable(nuevaMesa: Partial<Mesa>): Observable<any> {
    const endpoint = `${this.apiUrl}/mesas.php`;
    return this.http.post<any>(endpoint, nuevaMesa, { headers: this.headers }).pipe(catchError(this.handleError));
  }

  updateTable(mesa: Partial<Mesa>): Observable<any> {
    const endpoint = `${this.apiUrl}/mesas.php?id=${mesa.id}`;
    return this.http.put<any>(endpoint, mesa, { headers: this.headers }).pipe(catchError(this.handleError));
  }

  deleteTable(id: number): Observable<any> {
    const endpoint = `${this.apiUrl}/mesas.php?id=${id}`;
    return this.http.delete<any>(endpoint, { headers: this.headers }).pipe(catchError(this.handleError));
  }

  getDailyStats(): Observable<DailyStatsResponse> {
    const endpoint = `${this.apiUrl}/stats.php`;
    return this.http.get<DailyStatsResponse>(endpoint).pipe(catchError(this.handleError));
  }

  getTodayReservations(): Observable<TodayReservationsResponse> {
    const endpoint = `${this.apiUrl}/reservas_hoy.php`;
    return this.http.get<TodayReservationsResponse>(endpoint).pipe(catchError(this.handleError));
  }

  obtenerReservas(action: 'all_reservations' | string): Observable<any> {
    const endpoint = `${this.apiUrl}/reservas.php?action=${action}`;
    return this.http.get<ReservaGeneral[]>(endpoint).pipe(catchError(this.handleError));
  }

  getReservations(): Observable<any[]> {
    const endpoint = `${this.apiUrl}/reservas.php`;
    return this.http.get<any[]>(endpoint).pipe(catchError(this.handleError));
  }

  crearReserva(reservaData: any): Observable<any> {
    const endpoint = `${this.apiUrl}/reservas.php`;
    return this.http.post<any>(endpoint, reservaData, { headers: this.headers }).pipe(catchError(this.handleError));
  }

  actualizarReserva(reservaData: any): Observable<any> {
    const reservaID = reservaData.id;
    const endpoint = `${this.apiUrl}/reservas.php?id=${reservaID}`;
    return this.http.put<any>(endpoint, reservaData, { headers: this.headers }).pipe(catchError(this.handleError));
  }

  cancelarReserva(reservaId: number): Observable<any> {
    const endpoint = `${this.apiUrl}/reservas.php?id=${reservaId}`;
    return this.http.delete<any>(endpoint).pipe(catchError(this.handleError));
  }

  getReservebyUserID(userId: number): Observable<any[]> {
    const endpoint = `${this.apiUrl}/reservas.php?userID=${userId}`;
    return this.http.get<any[]>(endpoint).pipe(catchError(this.handleError));
  }

  obtenerReservasPorCliente(clienteId: number): Observable<any[]> {
    const endpoint = `${this.apiUrl}/reservas.php?clienteId=${clienteId}`;
    return this.http.get<any[]>(endpoint).pipe(catchError(this.handleError));
  }

  obtenerHorariosDisponibles(fecha: string): Observable<string[]> {
    const endpoint = `${this.apiUrl}/timeframes.php?action=available_slots_by_date&fecha=${fecha}`;
    return this.http.get<string[]>(endpoint).pipe(catchError(this.handleError));
  }

  getTimeSlots(): Observable<any[]> {
    const endpoint = `${this.apiUrl}/timeframes.php?action=available_slots`;
    return this.http.get<any[]>(endpoint).pipe(catchError(this.handleError));
  }

  registerUser(newUser: any): Observable<any> {
    const endpoint = `${this.apiUrl}/auth.php?action=register`;
    return this.http.post<any>(endpoint, newUser).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error desconocido en ServiceRestaurant';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      errorMessage = `Código de error del servidor: ${error.status}, mensaje: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
// Asegúrate de que las demás interfaces (Mesa, ApiResponse, etc.) estén definidas aquí o importadas.
export interface Mesa { id: number; label: string; zone: string; capacity: number; table_status: string; notes: string; }
export interface ApiResponse { success: boolean; data: Mesa[]; message?: string; }
export interface DailyStatsResponse { success: boolean; message?: string; stats: any; }
export interface ReservaDia { id: number; personas: number; estado: string; nombre_cliente: string; apellido_cliente: string; mesa: string; hora_reserva: string; }
export interface TodayReservationsResponse { success: boolean; message?: string; data: ReservaDia[]; }
export interface ReservaGeneral { id: number; nombre_cliente: string; apellido_cliente: string; fecha: string; horario: string; mesa: string; zona: string; personas: number; estado: string; }