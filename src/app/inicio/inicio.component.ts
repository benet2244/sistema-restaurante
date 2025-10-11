
import { Component, AfterViewInit, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swiper from 'swiper';
import { Navigation, Autoplay } from 'swiper/modules';
import { ServiceRestaurant, Mesa } from '../data.service'; // <-- Importar servicio y la interfaz Mesa
import { HttpErrorResponse } from '@angular/common/http';

Swiper.use([Navigation, Autoplay]);

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent implements AfterViewInit, OnInit {
  searchDate: string = '';
  searchTime: string = '';
  searchPeople: number | null = null;
  
  horariosDisponibles: string[] = [];
  availableTables: Mesa[] = []; // <-- Tipado con la interfaz Mesa

  // Mensaje para el usuario
  searchMessage: string = '';

  constructor(
    private router: Router,
    private restaurantService: ServiceRestaurant // <-- Inyectar el servicio
  ) {}

  ngOnInit(): void {
    // Inicializar la fecha con el día actual
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    this.searchDate = `${year}-${month}-${day}`;
    // Cargar horarios para el día de hoy al iniciar
    this.onDateChange();
  }

  ngAfterViewInit(): void {
    const swiper = new Swiper('.swiper-container', {
      loop: true,
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      autoplay: {
        delay: 3000,
        disableOnInteraction: false,
      },
    });
  }

  // Se ejecuta cuando el usuario cambia la fecha
  onDateChange(): void {
    this.availableTables = [];
    this.searchMessage = '';
    this.searchTime = ''; // Reiniciar hora seleccionada
    
    if (this.searchDate) {
      this.restaurantService.obtenerHorariosDisponibles(this.searchDate).subscribe({
        next: (data: string[]) => {
          this.horariosDisponibles = data;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error al cargar horarios disponibles:', error);
          this.horariosDisponibles = [];
          this.searchMessage = 'No se pudieron cargar los horarios para esta fecha.';
        }
      });
    } else {
      this.horariosDisponibles = [];
    }
  }

  // Lógica REAL para buscar mesas
  searchTables(): void {
    this.availableTables = []; // Limpiar resultados anteriores
    this.searchMessage = '';

    if (!this.searchDate || !this.searchTime || !this.searchPeople) {
      this.searchMessage = 'Por favor, complete todos los campos para la búsqueda.';
      return;
    }

    this.restaurantService.getTables().subscribe({
      next: (response: any) => {
        const todasLasMesas: Mesa[] = Array.isArray(response) ? response : response.data || [];
        
        // Simulación de disponibilidad: asumimos que una mesa está disponible si su estado no es 'maintenance'
        // En un sistema real, la disponibilidad dependería de las reservas existentes para esa fecha y hora.
        // Por ahora, solo filtramos por capacidad y estado general.
        const mesasFiltradas = todasLasMesas.filter(mesa => 
          mesa.capacity >= this.searchPeople! && mesa.table_status !== 'maintenance'
        );

        this.availableTables = mesasFiltradas;

        if (this.availableTables.length === 0) {
          this.searchMessage = 'No se encontraron mesas disponibles con los criterios seleccionados.';
        }
      },
      error: (err: any) => {
        console.error('Error al buscar mesas:', err);
        this.searchMessage = 'Ocurrió un error al buscar las mesas. Intente de nuevo.';
      }
    });
  }

  // Navegar al registro para completar la reserva
  goToRegister(): void {
    this.router.navigate(['/registro']);
  }
}
