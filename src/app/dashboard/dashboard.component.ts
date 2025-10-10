import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import {
  ServiceRestaurant,
  DailyStatsResponse,
  ReservaDia,
  Mesa, 
  ApiResponse,
  TodayReservationsResponse // Importar para tipar la respuesta de reservas
} from '../data.service'; 

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule], 
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  stats: DailyStatsResponse['stats'] | null = null;
  reservasDelDia: ReservaDia[] = [];
  estadoDeMesas: Mesa[] = []; 

  statusMap: { [key: string]: string } = {
    'available': 'Disponible',
    'occupied': 'Ocupado',
    'reserved': 'Reservado',
    'maintenance': 'Mantenimiento'
  };

  constructor(private restaurantService: ServiceRestaurant) {}

  ngOnInit(): void {
    // Estas son las llamadas que fallan si los métodos de abajo no existen:
    this.loadDailyStats(); // 👈 TS2339 (Ahora definido abajo)
    this.loadTodayReservations();
    this.loadTableStatus(); 
  }

  /**
   * 🔴 MÉTODO CORREGIDO: Carga las estadísticas del día
   */
  loadDailyStats(): void {
    this.restaurantService.getDailyStats().subscribe({
      // 👈 TS7006 corregido: tipando 'response'
      next: (response: DailyStatsResponse) => { 
        if (response.success && response.stats) {
          this.stats = response.stats;
        } else {
          console.error('Error al cargar stats:', response.message);
        }
      },
      // 👈 TS7006 corregido: tipando 'err'
      error: (err: any) => { 
        console.error('Error de API al cargar las estadísticas:', err);
      },
    });
  }

  /**
   * 🔴 MÉTODO CORREGIDO: Carga la lista detallada de reservas para el día de hoy
   * (Esto asume que el método getTodayReservations() existe en el servicio.)
   */
  loadTodayReservations(): void {
    // 👈 TS2551: Si este error persiste, significa que 'getTodayReservations' 
    // está mal escrito o no existe en data.service. Revisa que se llame así.
    this.restaurantService.getTodayReservations().subscribe({
      // 👈 TS7006 corregido: tipando 'response'
      next: (response: TodayReservationsResponse) => {
        if (response.success && response.data) {
          this.reservasDelDia = response.data;
        } else {
          console.error('Error al cargar reservas:', response.message);
        }
      },
      // 👈 TS7006 corregido: tipando 'err'
      error: (err: any) => { 
        console.error('Error de API al cargar las reservas:', err);
      },
    });
  }

  /**
   * 🔴 MÉTODO CORREGIDO: Carga el estado de TODAS las mesas
   */
  loadTableStatus(): void {
    this.restaurantService.getTables().subscribe({
      next: (response: ApiResponse) => {
        if (response.success && response.data) {
          this.estadoDeMesas = response.data;
        } else {
          console.error('Error al cargar mesas:', response.message);
          this.estadoDeMesas = [];
        }
      },
      error: (err: any) => {
        console.error('Error al cargar las mesas:', err);
        this.estadoDeMesas = [];
      }
    });
  }

  // Helper para obtener el nombre del estado en español
  getStatusDisplay(status: string): string {
    return this.statusMap[status.toLowerCase()] || 'Desconocido';
  }

  // Helper para obtener la clase CSS para el estado de la reserva.
  getStatusClass(estado: string): string {
    const estadoLimpio = estado.toLowerCase().trim();
    if (estadoLimpio.includes('confirmado')) {
      return 'confirmed';
    } else if (estadoLimpio.includes('pendiente')) {
      return 'reserved'; 
    } else if (estadoLimpio.includes('ocupado')) {
      return 'occupied'; 
    } else if (estadoLimpio.includes('cancelado')) {
      return 'maintenance'; 
    }
    return ''; 
  }
}