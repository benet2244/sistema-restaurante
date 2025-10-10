import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceRestaurant, Mesa } from '../data.service';

@Component({
  selector: 'app-mesas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './mesas.component.html',
  styleUrls: ['./mesas.component.css']
})
export class MesasComponent implements OnInit {
  listaMesas: Mesa[] = [];
  mostrarFormulario: boolean = false;

  nuevaMesa: Partial<Mesa> = {
    label: '',
    zone: '',
    capacity: 1,
    table_status: 'available',
    notes: ''
  };

  statusMap: { [key: string]: string } = {
    'available': 'Disponible',
    'occupied': 'Ocupada',
    'reserved': 'Reservada',
    'maintenance': 'Mantenimiento'
  };

  constructor(private tableService: ServiceRestaurant) {}

  ngOnInit(): void {
    this.cargarMesas();
  }

  cargarMesas(): void {
    this.tableService.getTables().subscribe({
      next: (response: any) => {
        if (Array.isArray(response)) {
          this.listaMesas = response;
        } else if (response && Array.isArray(response.data)) {
          this.listaMesas = response.data;
        } else {
          this.listaMesas = [];
        }
      },
      error: (err: any) => {
        console.error('Error al cargar las mesas:', err);
        alert('No se pudieron cargar los datos de las mesas.');
      }
    });
  }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
  }

  guardarMesa(): void {
    this.tableService.createTable(this.nuevaMesa).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.nuevaMesa = {
            label: '',
            zone: '',
            capacity: 1,
            table_status: 'available',
            notes: ''
          };
          this.mostrarFormulario = false;
          this.cargarMesas();
        } else {
          alert('Error al crear la mesa: ' + response.message);
        }
      },
      error: (err: any) => {
        console.error('Error al crear mesa:', err);
        alert('No se pudo crear la mesa.');
      }
    });
  }

  editarMesa(mesa: Mesa): void {
    this.nuevaMesa = { ...mesa };
    this.mostrarFormulario = true;
  }

eliminarMesa(id: number): void {
  if (!id || typeof id !== 'number') {
    alert('ID inválido para eliminar la mesa.');
    return;
  }

  this.tableService.deleteTable(id).subscribe({
    next: (response: any) => {
      if (response && response.success) {
        this.cargarMesas();
      } else {
        const msg = response?.message || 'Respuesta vacía del servidor.';
        alert('Error al eliminar la mesa: ' + msg);
      }
    },
    error: (err: any) => {
      console.error('Error al eliminar mesa:', err);
      alert('No se pudo eliminar la mesa. Verifica tu conexión o permisos.');
    }
  });
}


  getStatusDisplay(status: string): string {
    return this.statusMap[status] || 'Desconocido';
  }
}
