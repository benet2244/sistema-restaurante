import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy } from '@angular/core';
import { ServiceRestaurant} from '../data.service';
import { ReservaGeneral } from '../interfaces/reserva.interface';

interface ReservaForm {
  id?: number | null;
  nombre_cliente: string;
  apellido_cliente: string;
  phone: string;
  fecha: string;
  horario: string;
  mesa: string;
  personas: number;
  estado: 'confirmed' | 'pending' | 'cancelled' | string;
  user_id: number;
  table_id: number;
  time_id: number;
}

@Component({
  selector: 'app-reservas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservas.component.html',
  styleUrls: ['./reservas.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservasComponent implements OnInit {
  todasLasReservas = signal<ReservaGeneral[]>([]);
  reservasFiltradas = signal<ReservaGeneral[]>([]);
  isLoading = signal(true);

  filterDate: string = '';
  filterStatus: string = '';

  showConfirmModal = signal(false);
  reservaToCancel = signal<ReservaGeneral | null>(null);
  confirmationMessage = signal('');

  showEditModal = signal(false);
  isNewReservation: boolean = true;
  reservaForm: ReservaForm = this.getInitialReservationForm();

  horariosDisponibles: { id: number; hora: string }[] = [];
  mesasDisponibles: { id: number; label: string; zone: string }[] = [];

  constructor(private service: ServiceRestaurant) {}

  ngOnInit(): void {
    this.filterDate = this.getCurrentDateFormatted();
    this.loadAllReservations();
  }

  getCurrentDateFormatted(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getInitialReservationForm(): ReservaForm {
    return {
      nombre_cliente: '',
      apellido_cliente: '',
      phone: '',
      fecha: this.getCurrentDateFormatted(),
      horario: '',
      mesa: '',
      personas: 2,
      estado: 'pending',
      user_id: 1,
      table_id: 1,
      time_id: 1
    };
  }

  loadAllReservations(): void {
    this.isLoading.set(true);
    this.service.obtenerReservas('all_reservations').subscribe({
      next: (response: any) => {
        let reservationArray: ReservaGeneral[] = [];

        if (response && response.success === true && Array.isArray(response.data)) {
          reservationArray = response.data;
        } else if (Array.isArray(response)) {
          reservationArray = response;
        }

        this.todasLasReservas.set(reservationArray);
        this.isLoading.set(false);
        this.applyFilters();
      },
      error: (err: any) => {
        console.error('Error al cargar reservas:', err);
        this.isLoading.set(false);
      },
    });
  }

  applyFilters(): void {
    let filtered = this.todasLasReservas();

    if (this.filterStatus) {
      filtered = filtered.filter(reserva =>
        reserva.estado.toLowerCase().trim() === this.filterStatus.toLowerCase().trim()
      );
    }

    if (this.filterDate) {
      filtered = filtered.filter(reserva =>
        reserva.fecha === this.filterDate
      );
    }

    this.reservasFiltradas.set(filtered);
  }

  resetFilters(): void {
    this.filterDate = this.getCurrentDateFormatted();
    this.filterStatus = '';
    this.loadAllReservations();
  }

  // ========= FUNCIÓN AÑADIDA PARA CORREGIR EL ERROR =========
  getStatusClass(status: string): string {
    if (!status) return 'pending';
    const s = status.toLowerCase().trim();
    switch (s) {
      case 'confirmed': return 'confirmed';
      case 'pending': return 'pending';
      case 'cancelled': return 'cancelled';
      default: return 'pending';
    }
  }

  getStatusInfo(status: string): { text: string, class: string } {
    const s = status.toLowerCase().trim();
    switch (s) {
      case 'confirmed': return { text: 'Confirmado', class: 'confirmed' };
      case 'pending': return { text: 'Pendiente', class: 'pending' };
      case 'cancelled': return { text: 'Cancelado', class: 'cancelled' };
      default: return { text: 'Desconocido', class: 'pending' };
    }
  }

  onView(reserva: ReservaGeneral): void {
    console.log('Ver reserva:', reserva);
  }

  onEdit(reserva: ReservaGeneral | null): void {
    this.isNewReservation = reserva === null;

    this.reservaForm = reserva
      ? {
          id: reserva.id,
          nombre_cliente: reserva.nombre_cliente,
          apellido_cliente: reserva.apellido_cliente,
          phone: '', // Asumiendo que el teléfono no viene en ReservaGeneral
          fecha: reserva.fecha,
          horario: reserva.horario,
          mesa: reserva.mesa,
          personas: reserva.personas,
          estado: reserva.estado,
          user_id: 1, // Estos valores deberían venir de la reserva si existen
          table_id: 1,
          time_id: 1
        }
      : this.getInitialReservationForm();

    this.service.obtenerHorariosDisponibles(this.reservaForm.fecha).subscribe({
      next: (horarios: string[]) => {
        this.horariosDisponibles = horarios.map((hora, index) => ({ id: index + 1, hora }));
      },
      error: () => { this.horariosDisponibles = []; }
    });

    this.service.getTables().subscribe({
      next: (response: any) => {
        const mesas = Array.isArray(response) ? response : response.data;
        this.mesasDisponibles = mesas.map((mesa: any) => ({ id: mesa.id, label: mesa.label, zone: mesa.zone }));
      },
      error: () => { this.mesasDisponibles = []; }
    });

    this.showEditModal.set(true);
  }

  saveReservation(): void {
    const horarioSeleccionado = this.horariosDisponibles.find(h => h.hora === this.reservaForm.horario);
    const mesaSeleccionada = this.mesasDisponibles.find(m => m.label === this.reservaForm.mesa);

    const time_id = horarioSeleccionado ? horarioSeleccionado.id : 1;
    const table_id = mesaSeleccionada ? mesaSeleccionada.id : 1;

    const dataToSend = {
      user_id: this.reservaForm.user_id,
      table_id,
      time_id,
      reservation_date: this.reservaForm.fecha,
      number_of_people: this.reservaForm.personas,
      reservation_status: this.reservaForm.estado,
      nombre_cliente: this.reservaForm.nombre_cliente,
      apellido_cliente: this.reservaForm.apellido_cliente,
      phone: this.reservaForm.phone
    };

    const apiCall = this.isNewReservation
      ? this.service.crearReserva(dataToSend)
      : this.service.actualizarReserva({ ...dataToSend, id: this.reservaForm.id });

    apiCall.subscribe({
      next: () => {
        this.closeEditModal();
        this.loadAllReservations();
      },
      error: (err: any) => {
        console.error('Error al guardar/actualizar la reserva:', err);
      }
    });
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
  }

  onCancel(reserva: ReservaGeneral): void {
    if (reserva.estado.toLowerCase() === 'cancelled') return;
    this.reservaToCancel.set(reserva);
    this.confirmationMessage.set(`¿Estás seguro de que deseas cancelar la reserva #${reserva.id}?`);
    this.showConfirmModal.set(true);
  }

  closeModal(): void {
    this.showConfirmModal.set(false);
    this.reservaToCancel.set(null);
    this.confirmationMessage.set('');
  }

  confirmCancellation(): void {
    if (!this.reservaToCancel()) return;
    const id = this.reservaToCancel()!.id;
    this.service.cancelarReserva(id).subscribe({
      next: () => {
        this.closeModal();
        this.loadAllReservations();
      },
      error: (err: any) => {
        console.error(`Error al cancelar reserva #${id}:`, err);
        this.closeModal();
      }
    });
  }
}
