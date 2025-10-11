import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common'; // Importar CommonModule

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    CommonModule, // Añadir CommonModule para directivas como *ngFor
    RouterModule
  ],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent {

  currentSlide = 0;
  menuImages = [
    {
      src: 'https://images.squarespace-cdn.com/content/v1/57fc23aebe65940e0ba5851c/1756480332004-OCK9HOZCKUDU5Y6UR204/Dise%C3%B1o+sin+t%C3%ADtulo+%2821%29.png?format=1500w', // Imagen de ejemplo',
      alt: 'Menú principal del restaurante'
    },
    {
      src: 'https://images.squarespace-cdn.com/content/v1/57fc23aebe65940e0ba5851c/1756490984627-RERT6PHFOC9BGP65Q3RY/Menu+de+almuerzo+agosto+2025_page-0013.jpg?format=1500w', // Imagen de ejemplo
      alt: 'Una selección de nuestros postres'
    },
    {
      src: 'https://images.squarespace-cdn.com/content/v1/57fc23aebe65940e0ba5851c/1756490862843-A9PTSEOMHKUX9BVENNL0/Menu+de+almuerzo+agosto+2025_page-0002.jpg?format=1500w', // Imagen de ejemplo
      alt: 'Nuestra carta de vinos seleccionados'
    }
  ];

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.menuImages.length;
  }

  prevSlide() {
    this.currentSlide = (this.currentSlide - 1 + this.menuImages.length) % this.menuImages.length;
  }

}
