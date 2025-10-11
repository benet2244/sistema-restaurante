import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ServiceRestaurant } from '../data.service';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs'; // Necesario para tipar el Observable en la llamada PUT

interface MesaDisponible {
  id: number;
  label: string;
  capacity: number;
  zone: string;
}

// Interfaz extendida para tipar las reservas
interface Reserva {
  id: number;
  fecha: string;
  horario: string;
  mesa: string;
  zona: string;
  personas: number;
  reservation_status: string; // 'confirmed', 'cancelled', 'pending'
  nombre_cliente: string;
  apellido_cliente: string;
  statusClass: string; // Clase CSS calculada en el frontend
}

@Component({
  selector: 'app-cliente',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './cliente.component.html',
  styleUrls: ['./cliente.component.css']
})
export class ClienteComponent implements OnInit {
  misReservas: Reserva[] = [];
  horariosDisponibles: string[] = [];
  zonasRestaurante: string[] = [];
  mesasDisponibles: MesaDisponible[] = [];
  mesaSeleccionada: MesaDisponible | null = null;
  
  // PROPIEDAD CLAVE PARA EL MODAL DE EDICIÓN
  reservaAEditar: Reserva | null = null; 

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

  // Mapea el estado de la reserva del backend a una clase CSS para el frontend
  private mapReservationStatusToClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'status-confirmed';
      case 'cancelled':
        return 'status-cancelled';
      case 'pending':
        return 'status-pending';
      default:
        return 'status-ok';
    }
  }

  // FUNCIÓN CLAVE: Carga inicial de datos, incluyendo las reservas existentes
  cargarDatosIniciales(): void {
    const clienteId = this.authService.getUserId();
    
    /*
    // ========================
    //  BLOQUEO TEMPORALMENTE DESACTIVADO PARA DESARROLLO
    // ========================
    if (!clienteId) {
      console.error('No se pudo obtener el ID del cliente. Redirigiendo a login');
      this.router.navigate(['/login']);
      return;
    }
    */
    
    // 1. Carga las reservas del cliente
    (this.apiService as any).obtenerReservasPorCliente(clienteId).subscribe({
      next: (data: any) => {
        const reservasArray = data?.data || data;

        if (Array.isArray(reservasArray)) {
            this.misReservas = reservasArray.map((item: any) => ({
                ...item,
                // Asegurar que el horario se muestre correctamente (solo HH:MM)
                horario: item.horario ? String(item.horario).substring(0, 5) : '', 
                statusClass: this.mapReservationStatusToClass(item.reservation_status)
            })) as Reserva[];
        } else {
            console.error('[ERROR ESTRUCTURA] La respuesta del servidor no es un array en la estructura esperada:', data);
            this.misReservas = [];
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error al cargar las reservas (API):', error);
        this.misReservas = [];
      }
    });

    // 2. Carga las zonas disponibles (se mantiene la lógica existente)
    (this.apiService as any).getTables().subscribe({
      next: (response: any) => {
        const mesas = response.data || response;
        this.zonasRestaurante = Array.from(new Set((mesas as any[]).map((m: any) => String(m.zone))));
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al cargar las zonas desde mesas.php:', error);
        this.zonasRestaurante = [];
      }
    });
  }

  // Carga los horarios disponibles y reinicia las mesas
  onFechaChange(): void {
    // Si estamos en modo edición, no reiniciamos completamente el formulario
    // pero sí la disponibilidad de mesas.
    this.mesasDisponibles = [];
    this.mesaSeleccionada = null;
    
    // Si no estamos editando, reiniciamos el horario para que el usuario seleccione uno nuevo
    if (!this.reservaAEditar) {
        this.nuevaReserva.horario = ''; 
    }


    const fechaSeleccionada = this.nuevaReserva.fecha;
    if (fechaSeleccionada && fechaSeleccionada.trim() !== '') {
      (this.apiService as any).obtenerHorariosDisponibles(fechaSeleccionada).subscribe({
        next: (data: string[]) => (this.horariosDisponibles = data),
        error: (error: HttpErrorResponse) => {
          console.error('Error al cargar horarios disponibles:', error);
          this.horariosDisponibles = [];
        }
      });
    } else {
      this.horariosDisponibles = [];
    }
  }

  // Filtra las mesas basadas en los criterios del formulario
  verMesasDisponibles(): void {
    // Resetear la selección de mesa si se cambian los filtros
    this.mesasDisponibles = [];
    this.mesaSeleccionada = null; 

    const { zonaPreferida, cantidadPersonas, horario, fecha } = this.nuevaReserva;
    if (!zonaPreferida || !cantidadPersonas || !horario || !fecha) {
      // No mostrar error si estamos usando el formulario principal para una nueva reserva
      if (this.reservaAEditar) {
         console.warn('Faltan datos en el modal para buscar mesas.');
      } else {
         console.error('Por favor selecciona fecha, horario, zona y cantidad de personas.');
      }
      return;
    }

    (this.apiService as any).getTables().subscribe({
      next: (response: any) => {
        const mesas = response.data || response;
        this.mesasDisponibles = (mesas as MesaDisponible[]).filter((m: any) => {
          const zonaCoincide = m.zone === zonaPreferida;
          const capacidadOk = m.capacity >= cantidadPersonas;
          // Asumiendo que 'available' es un buen filtro inicial. 
          const estadoDisponible = m.table_status === 'available'; 
          
          return zonaCoincide && capacidadOk && estadoDisponible;
        });

        if (this.mesasDisponibles.length === 0) {
          console.log('No hay mesas disponibles en este horario para esta zona.');
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al cargar mesas:', error);
        this.mesasDisponibles = [];
      }
    });
  }

  // Maneja tanto la creación como la actualización de la reserva
  confirmarReserva(): void {
    const clienteId = this.authService.getUserId();
    
    if (!clienteId || !this.mesaSeleccionada || !this.nuevaReserva.cantidadPersonas) {
      console.error('No se puede confirmar/actualizar la reserva: Faltan datos esenciales (cliente, mesa o comensales).');
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

    if (this.reservaAEditar) {
      // ------------------------------------------------
      // CASO 1: ACTUALIZAR RESERVA EXISTENTE (MÉTODO PUT)
      // ------------------------------------------------
      const datosUpdate = { id: this.reservaAEditar.id, ...datosReserva };
      
      // La tipificación del método está en el ServiceRestaurant, por eso se mantiene el 'as any' 
      // si aún no has actualizado el archivo del servicio.
      (this.apiService as any).actualizarReserva(datosUpdate).subscribe({ 
          next: (response: any) => { 
              console.log('✅ Reserva actualizada con éxito:', response);
              this.cargarDatosIniciales(); 
              this.closeModal(); // Cierra el modal después de actualizar
          },
          error: (error: HttpErrorResponse) => {
              console.error('❌ Error al actualizar la reserva:', error);
          }
      });
      
    } else {
      // ------------------------------------------------
      // CASO 2: CREAR NUEVA RESERVA (MÉTODO POST)
      // ------------------------------------------------
      (this.apiService as any).crearReserva(datosReserva).subscribe({
        next: (response: any) => { 
          console.log('✅ Reserva confirmada con éxito:', response);
          this.cargarDatosIniciales(); 
          this.resetearFormulario();
        },
        error: (error: HttpErrorResponse) => { 
          console.error('❌ Error al confirmar la reserva:', error);
        }
      });
    }
  }
  
  // Resetea todos los campos del formulario de reserva y la selección de mesas
  resetearFormulario(): void {
    this.nuevaReserva = { fecha: '', horario: '', cantidadPersonas: null, zonaPreferida: '' };
    this.mesasDisponibles = [];
    this.mesaSeleccionada = null;
    this.limpiarModificacion(); // Asegura que se quite el modo edición
  }

  // Desactiva el modo edición (oculta el modal)
  limpiarModificacion(): void {
      this.reservaAEditar = null;
      console.log('Modo edición desactivado.');
  }
  
  // --- Lógica del Modal ---

  // Carga los datos de la reserva en el formulario temporal y abre el modal
  openModal(reservaId: number): void {
      const reserva = this.misReservas.find(r => r.id === reservaId);
      
      if (reserva) {
          console.log(`[MODIFICAR] Abriendo modal para editar reserva #${reservaId}`);
          this.reservaAEditar = { ...reserva }; // 1. Setear el estado de edición
          
          // 2. Cargar los datos de la reserva en el formulario
          this.nuevaReserva = {
              fecha: reserva.fecha, 
              horario: reserva.horario, // Ya está limpia (HH:MM)
              cantidadPersonas: reserva.personas,
              zonaPreferida: reserva.zona 
          };

          // 3. Inicializar horarios y mesas disponibles para la fecha actual
          this.onFechaChange(); 
          
          // 4. Establecer la mesa actual como la seleccionada para que se vea preseleccionada
          this.mesaSeleccionada = { 
              // Usar 0 o null es un placeholder. Lo ideal es obtener el ID de la mesa real del backend.
              id: 0, 
              label: reserva.mesa, 
              capacity: reserva.personas, 
              zone: reserva.zona 
          };
          
          // 5. Mostrar mesas disponibles con los criterios actuales (para que el usuario vea si hay opciones)
          this.verMesasDisponibles();
      }
  }

  // Cierra el modal y resetea el formulario
  closeModal(): void {
      this.limpiarModificacion(); // Desactiva el modo edición (oculta el modal)
      this.resetearFormulario(); // Reinicia el formulario de la parte principal del panel
  }

  // El método modificarReserva original ahora solo llama a openModal
  modificarReserva(reservaId: number): void {
    this.openModal(reservaId);
  }

  // --- Lógica de Cancelación ---
  cancelarReserva(reservaId: number): void {
    console.log('Solicitud de cancelación de reserva enviada al servidor.');

    (this.apiService as any).cancelarReserva(reservaId).subscribe({
      next: () => {
        console.log('✅ Reserva cancelada con éxito.');
        this.cargarDatosIniciales();
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error al cancelar la reserva', error);
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
