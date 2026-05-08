import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ContactComponent } from './components/contact/contact.component';
import { adminGuard } from './guards/admin.guard';
import { adminExitGuard } from './guards/admin-exit.guard';

export const routes: Routes = [
  { path: '', children: [] },
  { path: 'experiencia', children: [] },
  { path: 'proyectos', children: [] },
  { path: 'contacto', component: ContactComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'admin',
    canActivate: [adminGuard],
    canDeactivate: [adminExitGuard],
    loadComponent: () => import('./components/admin/admin.component').then(m => m.AdminComponent),
    loadChildren: () => import('./components/admin/admin.routes').then(m => m.adminRoutes)
  },
  { path: '**', redirectTo: '' }
];
