import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ContactComponent } from './components/contact/contact.component';
import { AdminComponent } from './components/admin/admin.component';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  // Ruta raíz: el contenido home se renderiza directamente desde AppComponent (<app-home>)
  // por lo que '/' y '/proyectos' no necesitan componente en el outlet.
  { path: '', children: [] },
  { path: 'proyectos', redirectTo: '' },
  { path: 'contacto', component: ContactComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
  { path: '**', redirectTo: '' }
];
