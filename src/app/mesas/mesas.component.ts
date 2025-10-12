import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceRestaurant, Mesa } from '../data.service';

@Component({
  selector: 'app-mesas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mesas.component.html',
  styleUrls: ['./mesas.component.css']
})
export class MesasComponent implements OnInit {
  listaMesas: Mesa[] = [];
  mostrarFormulario: boolean = false;
  esModoEdicion: boolean = false;

  // Usaremos un objeto completo de Mesa para la edición
  mesaActual: Partial<Mesa> = {};

  constructor(private tableService: ServiceRestaurant) {}

  ngOnInit(): void {
    this.cargarMesas();
  }

  cargarMesas(): void {
    this.tableService.getTables().subscribe({
      next: (response: any) => {
        this.listaMesas = Array.isArray(response) ? response : (response?.data || []);
      },
      error: (err: any) => {
        console.error('Error al cargar las mesas:', err);
        alert('No se pudieron cargar los datos de las mesas.');
      }
    });
  }

  // Prepara el formulario para una nueva mesa
  prepararNuevo(): void {
    this.esModoEdicion = false;
    this.mesaActual = {
      label: '',
      zone: '',
      capacity: 1,
      table_status: 'available',
      notes: ''
    };
    this.mostrarFormulario = true;
  }

  // Prepara el formulario para editar una mesa existente
  prepararEditar(mesa: Mesa): void {
    this.esModoEdicion = true;
    // Copiamos la mesa completa, incluyendo su ID
    this.mesaActual = { ...mesa };
    this.mostrarFormulario = true;
  }

  cancelarFormulario(): void {
    this.mostrarFormulario = false;
    this.esModoEdicion = false;
    this.mesaActual = {}; // Limpiamos el objeto
  }

  guardarMesa(): void {
    if (this.esModoEdicion) {
      // Si estamos editando, llamamos al método para actualizar
      if (!this.mesaActual.id) return; // Seguridad
      this.tableService.updateTable(this.mesaActual).subscribe({
        next: () => {
          this.finalizarGuardado();
        },
        error: (err) => alert('Error al actualizar la mesa: ' + err.message)
      });
    } else {
      // Si estamos creando, llamamos al método original
      this.tableService.createTable(this.mesaActual).subscribe({
        next: () => {
          this.finalizarGuardado();
        },
        error: (err) => alert('Error al crear la mesa: ' + err.message)
      });
    }
  }

  private finalizarGuardado(): void {
    this.cargarMesas();
    this.cancelarFormulario();
  }

  eliminarMesa(id: number): void {
    if (!id) {
      alert('ID inválido para eliminar.');
      return;
    }
    if (confirm('¿Estás seguro de que quieres eliminar esta mesa?')) {
      this.tableService.deleteTable(id).subscribe({
        next: () => {
          this.cargarMesas();
        },
        error: (err) => alert('Error al eliminar la mesa: ' + err.message)
      });
    }
  }
}
