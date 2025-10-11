# Guía para Conectar el Frontend de Angular a un Backend

Este documento explica los pasos y conceptos clave para conectar esta aplicación de Angular a un backend, permitiendo que deje de ser una maqueta con datos estáticos y se convierta en una aplicación web dinámica y funcional.

## 1. El Rol del Backend

El backend actuará como el **cerebro y la memoria central** de la aplicación. Será la **única fuente de verdad** para todos los datos.

- **Gestión de Datos:** Se encargará de guardar, modificar, eliminar y consultar toda la información (usuarios, reservas, mesas, etc.) en una base de datos.
- **Lógica de Negocio:** Contendrá las reglas importantes (ej: no permitir reservas si no hay mesas disponibles, validar que un usuario exista, etc.).
- **Seguridad:** Gestionará la autenticación (login) y los permisos (qué puede hacer un cliente vs. un administrador).

## 2. Pasos para la Integración en Angular

### Paso A: Centralizar la URL de la API

La URL del backend puede cambiar (de un entorno de desarrollo a producción). Para no tener que cambiarla en múltiples archivos, la definimos en los archivos de entorno de Angular.

**Acción:** Abrir el archivo `src/environments/environment.ts` y añadir la URL base de la API.

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'https://restauranteapi-wqd6.onrender.com/SISTEMARESTAURANTE/public' // URL base del backend
};
```

**Si la API cambia, solo tendrás que modificar esta línea.**

### Paso B: Crear un Servicio para la API

En lugar de que cada componente se comunique directamente con el backend, creamos un servicio intermediario. Esto centraliza la lógica de comunicación y hace el código más limpio y mantenible.

**Acción:** Crear un nuevo servicio (ej. `src/app/services/api.service.ts`). Este servicio usará el `HttpClient` de Angular para hacer las peticiones.

*Ejemplo de cómo se vería el servicio:*

```typescript
// api.service.ts (Ejemplo)
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // --- Reservas ---
  obtenerReservas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/reservas`);
  }

  crearReserva(datosReserva: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/reservas`, datosReserva);
  }

  // --- Mesas ---
  obtenerEstadoMesas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/mesas`);
  }
  
  // ... y así para cada tipo de dato (clientes, etc.)
}
```

### Paso C: Usar el Servicio en los Componentes

Ahora, los componentes ya no usarán datos de ejemplo. En su lugar, inyectarán el `ApiService` y lo usarán para obtener o enviar datos reales.

*Ejemplo de cómo cambiaría un componente (`reservas.component.ts`):*

**Antes (con datos falsos):**
```typescript
// reservas.component.ts (Antes)
import { Component, OnInit } from '@angular/core';

@Component({...})
export class ReservasComponent implements OnInit {
  reservas: any[] = [
    { id: '#1024', cliente: 'Carlos Sánchez', fecha: '2024-10-26 20:00', ... }, // Dato falso
    { id: '#1023', cliente: 'Ana Martínez', fecha: '2024-10-26 19:30', ... }   // Dato falso
  ];

  ngOnInit(): void { }
}
```

**Después (conectado al backend):**
```typescript
// reservas.component.ts (Después)
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service'; // Se importa el servicio

@Component({...})
export class ReservasComponent implements OnInit {
  reservas: any[] = []; // El array inicial está vacío

  constructor(private apiService: ApiService) { } // Se inyecta el servicio

  ngOnInit(): void {
    // Se le pide al servicio que traiga las reservas del backend
    this.apiService.obtenerReservas().subscribe(data => {
      this.reservas = data; // Se llena el array con los datos reales
    });
  }
}
```
