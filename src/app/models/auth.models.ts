export interface LoginResponse {
  token: string;
  rol: 'admin' | 'customer' | string;
  user_id?: number;
  mensaje: string;
  first_name: string;
}