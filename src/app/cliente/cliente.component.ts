import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ServiceRestaurant, Mesa, RestauranteConfig } from '../data.service'; // Importar RestauranteConfig
import { AuthService } from '../services/auth.service';

// ... (interfaces de Reserva y Mesa) ...

@Component({
  selector: 'app-cliente',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './cliente.component.html',
  styleUrls: ['./cliente.component.css']
})
export class ClienteComponent implements OnInit {
  // ... (propiedades de reservas) ...
  misReservas: any[] = [];
  horariosDisponibles: string[] = [];
  zonasRestaurante: string[] = [];
  mesasDisponibles: Mesa[] = [];
  mesaSeleccionada: Mesa | null = null;
  reservaAEditar: any | null = null;

  // Propiedad para almacenar la información del restaurante
  infoRestaurante: RestauranteConfig = {};

  nuevaReserva = {
    fecha: '',
    horario: '',
    cantidadPersonas: null as number | null,
    zonaPreferida: ''
  };

  constructor(
    private router: Router,
    private apiService: ServiceRestaurant,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  private mapReservationStatusToClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'status-confirmed';
      case 'cancelled': return 'status-cancelled';
      case 'pending': return 'status-pending';
      default: return 'status-ok';
    }
  }

  cargarDatosIniciales(): void {
    // Cargar información del restaurante
    this.apiService.obtenerConfiguracionRestaurante().subscribe({
      next: (data) => {
        this.infoRestaurante = data;
      },
      error: (error) => {
        console.error('Error al cargar la configuración del restaurante', error);
        // Opcional: Asignar valores por defecto si falla la carga
        this.infoRestaurante = {
          nombre: 'Nombre no disponible',
          direccion: 'Dirección no disponible',
          telefono: 'Teléfono no disponible',
          horario_apertura: '-',
          horario_cierre: '-'
        };
      }
    });

    const clienteId = this.authService.getUserId();
    if (clienteId) {
      this.apiService.obtenerReservasPorCliente(clienteId).subscribe({
        next: (data: any) => {
          const reservasArray = data?.data || data;
          if (Array.isArray(reservasArray)) {
            this.misReservas = reservasArray.map((item: any) => ({
              ...item,
              horario: item.horario ? String(item.horario).substring(0, 5) : '',
              statusClass: this.mapReservationStatusToClass(item.reservation_status)
            }));
          } else {
            this.misReservas = [];
          }
        },
        error: () => this.misReservas = []
      });
    }

    this.apiService.getTables().subscribe({
      next: (response: any) => {
        const mesas = response.data || response;
        this.zonasRestaurante = Array.from(new Set((mesas as any[]).map((m: any) => String(m.zone))));
      },
      error: () => this.zonasRestaurante = []
    });
  }

  // ... (resto de los métodos: onFechaChange, verMesasDisponibles, confirmarReserva, etc.)

  onFechaChange(): void {
    this.mesasDisponibles = [];
    this.mesaSeleccionada = null;
    
    if (!this.reservaAEditar) {
        this.nuevaReserva.horario = ''; 
    }

    const fechaSeleccionada = this.nuevaReserva.fecha;
    if (fechaSeleccionada) {
      this.apiService.obtenerHorariosDisponibles(fechaSeleccionada).subscribe({
        next: (data: string[]) => this.horariosDisponibles = data,
        error: (error: HttpErrorResponse) => this.horariosDisponibles = []
      });
    } else {
      this.horariosDisponibles = [];
    }
  }

  verMesasDisponibles(): void {
    this.mesasDisponibles = [];
    this.mesaSeleccionada = null; 

    const { zonaPreferida, cantidadPersonas, horario, fecha } = this.nuevaReserva;
    if (!zonaPreferida || !cantidadPersonas || !horario || !fecha) {
      console.error('Por favor selecciona fecha, horario, zona y cantidad de personas.');
      return;
    }

    const filtros = {
      fecha: fecha,
      horario: horario,
      personas: cantidadPersonas,
      zona: zonaPreferida
    };

    this.apiService.obtenerMesasDisponibles(filtros).subscribe({
      next: (mesas) => {
        this.mesasDisponibles = mesas;
      },
      error: (error) => {
        console.error('Error al obtener las mesas disponibles:', error);
        this.mesasDisponibles = [];
      }
    });
  }

  confirmarReserva(): void {
    const clienteId = this.authService.getUserId();
    
    if (!clienteId || !this.mesaSeleccionada || !this.nuevaReserva.cantidadPersonas) {
      console.error('Datos insuficientes para la reserva.');
      return;
    }

    const datosReserva = {
      user_id: clienteId,
      mesa_id: this.mesaSeleccionada.id,
      hora: this.nuevaReserva.horario,
      fecha: this.nuevaReserva.fecha,
      comensales: this.nuevaReserva.cantidadPersonas,
      reservation_status: 'confirmed'
    };

    const apiCall = this.reservaAEditar
      ? this.apiService.actualizarReserva({ id: this.reservaAEditar.id, ...datosReserva })
      : this.apiService.crearReserva(datosReserva);

    apiCall.subscribe({
      next: () => {
        this.cargarDatosIniciales(); 
        this.reservaAEditar ? this.closeModal() : this.resetearFormulario();
      },
      error: (error) => console.error('Error al procesar la reserva.', error)
    });
  } 

  resetearFormulario(): void {
    this.nuevaReserva = { fecha: '', horario: '', cantidadPersonas: null, zonaPreferida: '' };
    this.mesasDisponibles = [];
    this.mesaSeleccionada = null;
    this.reservaAEditar = null;
  }

  openModal(reservaId: number): void {
    const reserva = this.misReservas.find(r => r.id === reservaId);
    if (reserva) {
      this.reservaAEditar = { ...reserva };
      this.nuevaReserva = {
          fecha: reserva.fecha, 
          horario: reserva.horario,
          cantidadPersonas: reserva.personas,
          zonaPreferida: reserva.zona 
      };
      this.onFechaChange();
      this.verMesasDisponibles();
    }
  }

  closeModal(): void {
    this.resetearFormulario();
  }

  cancelarReserva(reservaId: number): void {
    const clienteId = this.authService.getUserId();
    if (!clienteId) return;
    this.apiService.cancelarReserva(reservaId).subscribe({
      next: () => this.cargarDatosIniciales(),
      error: (error) => console.error('Error al cancelar la reserva', error)
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
