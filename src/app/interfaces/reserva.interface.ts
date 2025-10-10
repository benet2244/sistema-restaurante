export interface ReservaGeneral {
  id: number;
  nombre_cliente: string; 
  apellido_cliente: string; 
  fecha: string; 
  horario: string; 
  mesa: string; 
  zona: string; 
  personas: number; 
  estado: 'confirmed' | 'pending' | 'cancelled' | string; 
}
