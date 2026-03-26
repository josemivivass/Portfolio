import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ContactComponent } from './components/contact/contact.component';
import { ProjectsGsapComponent } from './components/projects-gsap/projects-gsap.component';

export const routes: Routes = [
  // Ruta raíz: Angular requiere un componente aquí. El HTML ocultará el outlet, así que es un formalismo.
  { path: '', component: ProjectsGsapComponent },
  { path: 'proyectos', component: ProjectsGsapComponent },
  { path: 'contacto', component: ContactComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: '**', redirectTo: '' }
];