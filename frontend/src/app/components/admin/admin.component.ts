import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
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

  constructor(
    private adminService: AdminService,
    private auth: AuthService,
    private router: Router,
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
    const requests: any = {
      projects: this.adminService.listProjects(),
      experiences: this.adminService.listExperience(),
      visitors: this.adminService.listVisitorLogs(),
      logins: this.adminService.listLoginLogs(),
      messages: this.adminService.listContactMessages()
    };
    if (this.isAdmin) {
      requests.users = this.adminService.listUsers();
    }

    forkJoin(requests).subscribe({
      next: (res: any) => {
        this.projects = res.projects ?? [];
        this.experiences = res.experiences ?? [];
        this.visitorLogs = res.visitors ?? [];
        this.loginLogs = res.logins ?? [];
        this.messages = res.messages ?? [];
        if (res.users) this.users = res.users;
        this.buildCharts();
        this.initialLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Error al cargar los datos del panel';
        this.initialLoading = false;
      }
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
    if (tab === 'users' && !this.isAdmin) return;
    this.activeTab = tab;
    this.editingProject = null;
    this.editingExperience = null;
  }

  // ─── Users ───
  changeRole(user: AdminUser, role: AdminUser['role']): void {
    if (user.role === role) return;
    this.adminService.updateUserRole(user.id, role).subscribe({
      next: () => { user.role = role; },
      error: (err) => { alert('No se pudo actualizar el rol'); console.error(err); }
    });
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
    const obs = p.id
      ? this.adminService.updateProject(p.id, p)
      : this.adminService.createProject(p);
    obs.subscribe({
      next: () => {
        this.editingProject = null;
        this.adminService.listProjects().subscribe(d => this.projects = d);
      },
      error: (err) => { alert('Error al guardar proyecto'); console.error(err); }
    });
  }

  cancelProjectEdit(): void { this.editingProject = null; }

  deleteProject(p: any): void {
    if (!this.isAdmin) return;
    if (!confirm(`¿Eliminar el proyecto "${p.title}"?`)) return;
    this.adminService.deleteProject(p.id).subscribe({
      next: () => { this.projects = this.projects.filter(x => x.id !== p.id); },
      error: (err) => { alert('Error al eliminar proyecto'); console.error(err); }
    });
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
    const obs = e.id
      ? this.adminService.updateExperience(e.id, e)
      : this.adminService.createExperience(e);
    obs.subscribe({
      next: () => {
        this.editingExperience = null;
        this.adminService.listExperience().subscribe(d => this.experiences = d);
      },
      error: (err) => { alert('Error al guardar experiencia'); console.error(err); }
    });
  }

  cancelExperienceEdit(): void { this.editingExperience = null; }

  deleteExperience(e: any): void {
    if (!this.isAdmin) return;
    if (!confirm(`¿Eliminar la experiencia "${e.title}"?`)) return;
    this.adminService.deleteExperience(e.id).subscribe({
      next: () => { this.experiences = this.experiences.filter(x => x.id !== e.id); },
      error: (err) => { alert('Error al eliminar experiencia'); console.error(err); }
    });
  }

  // ─── Messages ───
  deleteMessage(m: any): void {
    if (!this.isAdmin) return;
    if (!confirm(`¿Eliminar el mensaje de "${m.name}"?`)) return;
    this.adminService.deleteContactMessage(m.id).subscribe({
      next: () => { this.messages = this.messages.filter(x => x.id !== m.id); },
      error: (err) => { alert('Error al eliminar mensaje'); console.error(err); }
    });
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
