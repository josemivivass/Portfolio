import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./tabs/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    data: { tab: 'dashboard' }
  },
  {
    path: 'profile',
    loadComponent: () => import('./tabs/profile/admin-profile.component').then(m => m.AdminProfileComponent),
    data: { tab: 'profile' }
  },
  {
    path: 'projects',
    loadComponent: () => import('./tabs/projects/admin-projects.component').then(m => m.AdminProjectsComponent),
    data: { tab: 'projects' }
  },
  {
    path: 'experience',
    loadComponent: () => import('./tabs/experience/admin-experience.component').then(m => m.AdminExperienceComponent),
    data: { tab: 'experience' }
  },
  {
    path: 'education',
    loadComponent: () => import('./tabs/education/admin-education.component').then(m => m.AdminEducationComponent),
    data: { tab: 'education' }
  },
  {
    path: 'visitors',
    loadComponent: () => import('./tabs/visitors/admin-visitors.component').then(m => m.AdminVisitorsComponent),
    data: { tab: 'visitors' }
  },
  {
    path: 'logins',
    loadComponent: () => import('./tabs/logins/admin-logins.component').then(m => m.AdminLoginsComponent),
    data: { tab: 'logins' }
  },
  {
    path: 'messages',
    loadComponent: () => import('./tabs/messages/admin-messages.component').then(m => m.AdminMessagesComponent),
    data: { tab: 'messages' }
  },
  {
    path: 'chatbot',
    loadComponent: () => import('./tabs/chatbot/admin-chatbot.component').then(m => m.AdminChatbotComponent),
    data: { tab: 'chatbot' }
  },
  {
    path: 'users',
    loadComponent: () => import('./tabs/users/admin-users.component').then(m => m.AdminUsersComponent),
    data: { tab: 'users' }
  },
  { path: '**', redirectTo: 'dashboard' }
];