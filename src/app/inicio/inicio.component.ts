
import { Component, AfterViewInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swiper from 'swiper';
import { Navigation, Autoplay } from 'swiper/modules';

Swiper.use([Navigation, Autoplay]);

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent implements AfterViewInit {
  searchDate: string = '';
  searchTime: string = '';
  searchPeople: number | null = null;
  availableTables: any[] = [];

  constructor(private router: Router) {}

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

  searchTables(): void {
    // Lógica para buscar mesas
    console.log('Buscando mesas con:', this.searchDate, this.searchTime, this.searchPeople);
    // Simulación de mesas disponibles
    this.availableTables = [
      { id: 1, capacity: 4 },
      { id: 2, capacity: 2 },
      { id: 3, capacity: 6 },
    ];
  }
}
