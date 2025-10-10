import { Component, NgModule } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { ServiceRestaurant } from '../data.service';
import { FormsModule, NgModel } from '@angular/forms';

interface newUser{
  first_name: string;
  last_name: string;
  phone: string;
  email: string; 
  password: string;
}

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css']
})
export class RegistroComponent {

  user: newUser = {
    first_name:'',
    last_name: '',
    phone:'',
    email: '',
    password: '',
  }

  constructor(
    private serviceRestaurant: ServiceRestaurant,
    private router: Router
  ) {}

  onSubmit(): void {
    if(!this.user.first_name || !this.user.last_name || !this.user.email || !this.user.phone || !this.user.password) {
      alert('Por favor, complete los campos obligatorios.');
      return;
    }

  const userPayload = {
      first_name: this.user.first_name,
      last_name: this.user.last_name,
      phone: this.user.phone,
      email: this.user.email,
      password: this.user.password,
    };

    this.serviceRestaurant.registerUser(userPayload).subscribe({
      next: (response) => {
        console.log('user registered successfully', response);
        alert('Registro completeado exitosamente, ahora puedes iniciar sesion.');

        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Érror durante el registro:' , err);
        const errorMessage = err.error?.message || 'Error desconocido al registrar. Intentato de nuevo';
        alert(`Fallo en el registro: ${errorMessage}`);
      }
    });
  }
}
