import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, AdminUser } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';

type Tab = 'dashboard' | 'users' | 'projects' | 'experience' | 'visitors' | 'logins' | 'messages';

interface ChartBar {
  label: string;
  value: number;
  height: number;
  date: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  activeTab: Tab = 'dashboard';
  isAdmin = false;
  isEditor = false;
  currentUserEmail = '';

  users: AdminUser[] = [];
  projects: any[] = [];
  experiences: any[] = [];
  visitorLogs: any[] = [];
  loginLogs: any[] = [];
  messages: any[] = [];

  visitorChart: ChartBar[] = [];
  loginChart: ChartBar[] = [];
  visitorChartMax = 0;
  loginChartMax = 0;

  initialLoading = true;
  errorMessage = '';

  editingProject: any = null;
  editingExperience: any = null;
  editingUser: (AdminUser & { _original?: AdminUser }) | null = null;

  confirmModal: {
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null = null;

  constructor(
    private adminService: AdminService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.isAdmin = this.auth.isAdmin();
    this.isEditor = this.auth.isEditor();

    if (!this.isAdmin && !this.isEditor) {
      this.router.navigate(['/']);
      return;
    }

    const token = this.auth.getToken();
    if (token) {
      try {
        this.currentUserEmail = JSON.parse(atob(token.split('.')[1]))?.email ?? '';
      } catch {}
    }

    this.loadAllData();
  }

  private loadAllData(): void {
    this.initialLoading = true;
    let pending = 6;
    const done = () => {
      pending--;
      if (pending <= 0) {
        this.buildCharts();
        this.initialLoading = false;
      }
      this.cdr.markForCheck();
    };
    const fail = (label: string) => (err: any) => {
      console.error(`[admin] ${label} failed`, err);
      done();
    };

    this.adminService.listProjects().subscribe({
      next: d => { this.projects = d ?? []; done(); },
      error: fail('projects')
    });
    this.adminService.listExperience().subscribe({
      next: d => { this.experiences = d ?? []; done(); },
      error: fail('experience')
    });
    this.adminService.listVisitorLogs().subscribe({
      next: d => { this.visitorLogs = d ?? []; this.buildCharts(); done(); },
      error: fail('visitors')
    });
    this.adminService.listLoginLogs().subscribe({
      next: d => { this.loginLogs = d ?? []; this.buildCharts(); done(); },
      error: fail('logins')
    });
    this.adminService.listContactMessages().subscribe({
      next: d => { this.messages = d ?? []; done(); },
      error: fail('messages')
    });
    this.adminService.listUsers().subscribe({
      next: d => { this.users = d ?? []; done(); },
      error: fail('users')
    });
  }

  // ─── Stats ───
  get totalUsers(): number { return this.users.length; }
  get totalProjects(): number { return this.projects.length; }
  get totalVisits(): number { return this.visitorLogs.length; }
  get totalLogins(): number { return this.loginLogs.length; }
  get totalMessages(): number { return this.messages.length; }
  get uniqueVisitors(): number {
    return new Set(this.visitorLogs.map(v => v.visitor_uuid)).size;
  }

  // ─── Charts (últimos 14 días) ───
  private buildCharts(): void {
    this.visitorChart = this.buildDailyChart(this.visitorLogs, 'entry_time');
    this.visitorChartMax = Math.max(1, ...this.visitorChart.map(b => b.value));
    this.visitorChart.forEach(b => b.height = (b.value / this.visitorChartMax) * 100);

    this.loginChart = this.buildDailyChart(this.loginLogs, 'login_time');
    this.loginChartMax = Math.max(1, ...this.loginChart.map(b => b.value));
    this.loginChart.forEach(b => b.height = (b.value / this.loginChartMax) * 100);
  }

  private buildDailyChart(rows: any[], dateField: string): ChartBar[] {
    const days = 14;
    const buckets: { [key: string]: number } = {};
    const result: ChartBar[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().substring(0, 10);
      buckets[key] = 0;
    }

    rows.forEach(r => {
      const raw = r[dateField];
      if (!raw) return;
      const key = new Date(raw).toISOString().substring(0, 10);
      if (key in buckets) buckets[key]++;
    });

    Object.keys(buckets).forEach(key => {
      const d = new Date(key);
      result.push({
        label: String(d.getDate()),
        date: key,
        value: buckets[key],
        height: 0
      });
    });

    return result;
  }

  // ─── Tabs ───
  setTab(tab: Tab): void {
    if (tab === 'users' && !this.isAdmin && !this.isEditor) return;
    this.activeTab = tab;
    this.editingProject = null;
    this.editingExperience = null;
    this.editingUser = null;
  }

  // ─── Users ───
  changeRole(user: AdminUser, role: AdminUser['role']): void {
    if (user.role === role) return;
    this.adminService.updateUserRole(user.id, role).subscribe({
      next: () => { user.role = role; this.cdr.markForCheck(); },
      error: (err) => { alert('No se pudo actualizar el rol'); console.error(err); }
    });
  }

  editUser(u: AdminUser): void {
    if (!this.isAdmin && !this.isEditor) return;
    if (!this.isAdmin && u.role === 'admin') return;
    this.editingUser = { ...u, _original: u };
  }

  saveUser(): void {
    const u = this.editingUser;
    if (!u) return;
    const payload: { email: string; role?: AdminUser['role'] } = { email: u.email };
    if (this.isAdmin) payload.role = u.role;

    const idx = this.users.findIndex(x => x.id === u.id);
    const prev = idx >= 0 ? { ...this.users[idx] } : null;
    if (idx >= 0) {
      const updated = { ...this.users[idx], email: u.email };
      if (this.isAdmin) updated.role = u.role;
      this.users = [
        ...this.users.slice(0, idx),
        updated,
        ...this.users.slice(idx + 1)
      ];
    }
    this.editingUser = null;

    this.adminService.updateUser(u.id, payload).subscribe({
      error: (err) => {
        if (idx >= 0 && prev) {
          this.users = [
            ...this.users.slice(0, idx),
            prev,
            ...this.users.slice(idx + 1)
          ];
        }
        const msg = err?.error?.message || 'No se pudo actualizar el usuario';
        alert(msg);
        console.error(err);
        this.cdr.markForCheck();
      }
    });
  }

  cancelUserEdit(): void { this.editingUser = null; }

  deleteUser(u: AdminUser): void {
    if (!this.isAdmin) return;
    if (u.email === this.currentUserEmail) {
      alert('No puedes eliminar tu propia cuenta');
      return;
    }
    this.askConfirm(
      'Eliminar usuario',
      `¿Seguro que quieres eliminar al usuario "${u.email}"? Esta acción no se puede deshacer.`,
      () => {
        const prev = this.users;
        this.users = this.users.filter(x => x.id !== u.id);
        this.adminService.deleteUser(u.id).subscribe({
          error: (err) => {
            this.users = prev;
            const msg = err?.error?.message || 'No se pudo eliminar el usuario';
            alert(msg);
            console.error(err);
            this.cdr.markForCheck();
          }
        });
      }
    );
  }

  // ─── Projects ───
  newProject(): void {
    this.editingProject = {
      id: null,
      title: '', title_en: '', description: '', description_en: '',
      project_date: '', repo_url: '', live_url: '', image_url: '',
      tags: '', is_featured: false
    };
  }

  editProject(p: any): void {
    this.editingProject = { ...p, project_date: p.project_date ? p.project_date.substring(0, 10) : '' };
  }

  saveProject(): void {
    const p = this.editingProject;
    if (!p) return;
    const payload = { ...p };
    this.editingProject = null;

    if (payload.id) {
      const idx = this.projects.findIndex(x => x.id === payload.id);
      const prev = idx >= 0 ? this.projects[idx] : null;
      if (idx >= 0) {
        this.projects = [
          ...this.projects.slice(0, idx),
          { ...this.projects[idx], ...payload },
          ...this.projects.slice(idx + 1)
        ];
      }
      this.adminService.updateProject(payload.id, payload).subscribe({
        error: (err) => {
          if (idx >= 0 && prev) {
            this.projects = [
              ...this.projects.slice(0, idx),
              prev,
              ...this.projects.slice(idx + 1)
            ];
          }
          alert('Error al guardar proyecto');
          console.error(err);
          this.cdr.markForCheck();
        }
      });
    } else {
      this.adminService.createProject(payload).subscribe({
        next: (res: any) => {
          const created = { ...payload, id: res?.id };
          this.projects = [created, ...this.projects];
          this.cdr.markForCheck();
        },
        error: (err) => { alert('Error al crear proyecto'); console.error(err); }
      });
    }
  }

  cancelProjectEdit(): void { this.editingProject = null; }

  deleteProject(p: any): void {
    if (!this.isAdmin) return;
    this.askConfirm(
      'Eliminar proyecto',
      `¿Seguro que quieres eliminar el proyecto "${p.title}"? Esta acción no se puede deshacer.`,
      () => {
        const prev = this.projects;
        this.projects = this.projects.filter(x => x.id !== p.id);
        this.adminService.deleteProject(p.id).subscribe({
          error: (err) => {
            this.projects = prev;
            alert('Error al eliminar proyecto');
            console.error(err);
            this.cdr.markForCheck();
          }
        });
      }
    );
  }

  // ─── Experience ───
  newExperience(): void {
    this.editingExperience = {
      id: null,
      start_date: '', end_date: '', title: '', title_en: '', company: '',
      contract_type: '', contract_type_en: '', description: '', description_en: '',
      location: '', location_en: '', tags: ''
    };
  }

  editExperience(e: any): void {
    this.editingExperience = {
      ...e,
      start_date: e.start_date ? e.start_date.substring(0, 10) : '',
      end_date: e.end_date ? e.end_date.substring(0, 10) : ''
    };
  }

  saveExperience(): void {
    const e = this.editingExperience;
    if (!e) return;
    const payload = { ...e };
    this.editingExperience = null;

    if (payload.id) {
      const idx = this.experiences.findIndex(x => x.id === payload.id);
      const prev = idx >= 0 ? this.experiences[idx] : null;
      if (idx >= 0) {
        this.experiences = [
          ...this.experiences.slice(0, idx),
          { ...this.experiences[idx], ...payload },
          ...this.experiences.slice(idx + 1)
        ];
      }
      this.adminService.updateExperience(payload.id, payload).subscribe({
        error: (err) => {
          if (idx >= 0 && prev) {
            this.experiences = [
              ...this.experiences.slice(0, idx),
              prev,
              ...this.experiences.slice(idx + 1)
            ];
          }
          alert('Error al guardar experiencia');
          console.error(err);
          this.cdr.markForCheck();
        }
      });
    } else {
      this.adminService.createExperience(payload).subscribe({
        next: (res: any) => {
          const created = { ...payload, id: res?.id };
          this.experiences = [created, ...this.experiences];
          this.cdr.markForCheck();
        },
        error: (err) => { alert('Error al crear experiencia'); console.error(err); }
      });
    }
  }

  cancelExperienceEdit(): void { this.editingExperience = null; }

  deleteExperience(e: any): void {
    if (!this.isAdmin) return;
    this.askConfirm(
      'Eliminar experiencia',
      `¿Seguro que quieres eliminar la experiencia "${e.title}"? Esta acción no se puede deshacer.`,
      () => {
        const prev = this.experiences;
        this.experiences = this.experiences.filter(x => x.id !== e.id);
        this.adminService.deleteExperience(e.id).subscribe({
          error: (err) => {
            this.experiences = prev;
            alert('Error al eliminar experiencia');
            console.error(err);
            this.cdr.markForCheck();
          }
        });
      }
    );
  }

  // ─── Messages ───
  deleteMessage(m: any): void {
    if (!this.isAdmin) return;
    this.askConfirm(
      'Eliminar mensaje',
      `¿Seguro que quieres eliminar el mensaje de "${m.name}"? Esta acción no se puede deshacer.`,
      () => {
        const prev = this.messages;
        this.messages = this.messages.filter(x => x.id !== m.id);
        this.adminService.deleteContactMessage(m.id).subscribe({
          error: (err) => {
            this.messages = prev;
            alert('Error al eliminar mensaje');
            console.error(err);
            this.cdr.markForCheck();
          }
        });
      }
    );
  }

  private askConfirm(title: string, message: string, onConfirm: () => void, confirmLabel = 'Eliminar'): void {
    this.confirmModal = { title, message, confirmLabel, onConfirm };
  }

  confirmAction(): void {
    const cb = this.confirmModal?.onConfirm;
    this.confirmModal = null;
    if (cb) cb();
  }

  cancelConfirm(): void {
    this.confirmModal = null;
  }

  shortUA(ua: string): string {
    if (!ua) return '—';
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    return ua.substring(0, 24) + '…';
  }
}
