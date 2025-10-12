import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceRestaurant, RestauranteConfig } from '../data.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.css']
})
export class ConfiguracionComponent implements OnInit {

  // Objeto para vincular con el formulario. Inicializado vacío.
  config: RestauranteConfig = {};

  // Mensajes para el usuario
  mensajeExito: string | null = null;
  mensajeError: string | null = null;

  constructor(private apiService: ServiceRestaurant) {}

  ngOnInit(): void {
    // Al cargar el componente, obtenemos la configuración actual del restaurante
    this.cargarConfiguracion();
  }

  cargarConfiguracion(): void {
    this.apiService.obtenerConfiguracionRestaurante().subscribe({
      next: (data) => {
        // Rellenamos el objeto 'config' con los datos del backend
        this.config = data;
      },
      error: (err: HttpErrorResponse) => {
        this.mostrarError('No se pudo cargar la configuración actual.');
        console.error(err);
      }
    });
  }

  guardarCambios(): void {
    // Ocultar mensajes previos
    this.mensajeExito = null;
    this.mensajeError = null;

    // Llamamos al servicio para actualizar la configuración en el backend
    this.apiService.actualizarConfiguracionRestaurante(this.config).subscribe({
      next: (response) => {
        this.mostrarExito('¡La configuración se ha guardado correctamente!');
      },
      error: (err: HttpErrorResponse) => {
        this.mostrarError('Error al guardar los cambios. Por favor, inténtalo de nuevo.');
        console.error(err);
      }
    });
  }

  // Helpers para mostrar mensajes de estado al usuario
  private mostrarExito(mensaje: string): void {
    this.mensajeExito = mensaje;
    setTimeout(() => this.mensajeExito = null, 5000); // El mensaje desaparece después de 5 segundos
  }

  private mostrarError(mensaje: string): void {
    this.mensajeError = mensaje;
    setTimeout(() => this.mensajeError = null, 7000); // El mensaje de error dura un poco más
  }
}
