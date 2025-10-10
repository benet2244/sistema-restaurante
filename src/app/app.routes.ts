import { Routes } from '@angular/router';
import { InicioComponent } from './inicio/inicio.component';
import { LoginComponent } from './login/login.component';
import { ClienteComponent } from './cliente/cliente.component';
import { AdministradorComponent } from './administrador/administrador.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MesasComponent } from './mesas/mesas.component';
import { ReportesComponent } from './reportes/reportes.component';
import { ConfiguracionComponent } from './configuracion/configuracion.component';
import { ReservasComponent } from './reservas/reservas.component';
import { RegistroComponent } from './registro/registro.component';

export const routes: Routes = [
    { path: 'inicio', component: InicioComponent },
    { path: 'login', component: LoginComponent },
    { path: 'registro', component: RegistroComponent },
    { 
        path: 'cliente', 
        component: ClienteComponent
    },
    { 
        path: 'administrador', 
        component: AdministradorComponent,
        children: [
            { path: 'dashboard', component: DashboardComponent },
            { path: 'reservas', component: ReservasComponent },
            { path: 'mesas', component: MesasComponent },
            { path: 'reportes', component: ReportesComponent },
            { path: 'configuracion', component: ConfiguracionComponent },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
    },
    { path: '', redirectTo: '/inicio', pathMatch: 'full' },
    { path: '**', redirectTo: '/inicio' }
];
