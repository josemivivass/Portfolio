import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, AdminUser } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';

type Tab = 'dashboard' | 'users' | 'projects' | 'experience' | 'visitors' | 'logins' | 'messages';
type SortDir = 'asc' | 'desc';
type SortTable = 'users' | 'projects' | 'experiences' | 'visitors' | 'logins';
interface SortState { col: string; dir: SortDir; }

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

  // ─── Dashboard line chart geometry ───
  readonly lineChart = {
    w: 880,
    h: 280,
    padL: 52,
    padR: 28,
    padT: 24,
    padB: 46
  };
  lineChartMax = 1;
  lineChartTicks: { y: number; value: number }[] = [];
  lineChartXAxis: { x: number; label: string; date: string }[] = [];
  visitorPoints: { x: number; y: number; value: number; label: string; date: string }[] = [];
  loginPoints: { x: number; y: number; value: number; label: string; date: string }[] = [];
  visitorLinePath = '';
  loginLinePath = '';
  visitorAreaPath = '';
  loginAreaPath = '';
  hoverIndex: number | null = null;

  // ─── Sort state per table ───
  sortState: Record<SortTable, SortState> = {
    users: { col: 'id', dir: 'asc' },
    projects: { col: 'id', dir: 'asc' },
    experiences: { col: 'start_date', dir: 'desc' },
    visitors: { col: 'entry_time', dir: 'desc' },
    logins: { col: 'login_time', dir: 'desc' }
  };

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
    @Inject(PLATFORM_ID) private platformId: Object,
    public i18n: TranslationService
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

    this.buildLineChart();
  }

  private buildLineChart(): void {
    const { w, h, padL, padR, padT, padB } = this.lineChart;
    const n = Math.max(this.visitorChart.length, this.loginChart.length);
    if (n === 0) {
      this.visitorPoints = [];
      this.loginPoints = [];
      this.visitorLinePath = this.loginLinePath = '';
      this.visitorAreaPath = this.loginAreaPath = '';
      this.lineChartTicks = [];
      this.lineChartXAxis = [];
      return;
    }

    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const stepX = n > 1 ? innerW / (n - 1) : 0;

    const rawMax = Math.max(
      1,
      ...this.visitorChart.map(b => b.value),
      ...this.loginChart.map(b => b.value)
    );
    const niceMax = this.niceCeil(rawMax);
    this.lineChartMax = niceMax;

    const project = (series: ChartBar[]) =>
      series.map((b, i) => ({
        x: padL + i * stepX,
        y: padT + innerH - (b.value / niceMax) * innerH,
        value: b.value,
        label: b.label,
        date: b.date
      }));

    this.visitorPoints = project(this.visitorChart);
    this.loginPoints = project(this.loginChart);

    this.visitorLinePath = this.buildSmoothPath(this.visitorPoints);
    this.loginLinePath = this.buildSmoothPath(this.loginPoints);
    this.visitorAreaPath = this.buildAreaPath(this.visitorPoints, padT + innerH);
    this.loginAreaPath = this.buildAreaPath(this.loginPoints, padT + innerH);

    // 4 horizontal gridlines (5 ticks with 0)
    this.lineChartTicks = [];
    const tickCount = 4;
    for (let i = 0; i <= tickCount; i++) {
      const value = Math.round((niceMax * (tickCount - i)) / tickCount);
      this.lineChartTicks.push({
        y: padT + (innerH * i) / tickCount,
        value
      });
    }

    // X-axis labels (show every other day so it doesn't get crowded)
    this.lineChartXAxis = this.visitorChart.map((b, i) => ({
      x: padL + i * stepX,
      label: (i % 2 === 0 || i === n - 1) ? b.label : '',
      date: b.date
    }));
  }

  private niceCeil(value: number): number {
    if (value <= 1) return 1;
    if (value <= 5) return 5;
    if (value <= 10) return 10;
    const pow = Math.pow(10, Math.floor(Math.log10(value)));
    const norm = value / pow;
    let nice: number;
    if (norm <= 2) nice = 2;
    else if (norm <= 5) nice = 5;
    else nice = 10;
    return nice * pow;
  }

  private buildSmoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    const tension = 0.22;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  }

  private buildAreaPath(pts: { x: number; y: number }[], baseY: number): string {
    if (pts.length === 0) return '';
    const line = this.buildSmoothPath(pts);
    const last = pts[pts.length - 1];
    const first = pts[0];
    return `${line} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;
  }

  onChartHover(i: number | null): void {
    this.hoverIndex = i;
  }

  get hoverData(): {
    x: number;
    date: string;
    visitors: number;
    logins: number;
    tooltipX: number;
  } | null {
    if (this.hoverIndex === null) return null;
    const v = this.visitorPoints[this.hoverIndex];
    const l = this.loginPoints[this.hoverIndex];
    if (!v) return null;
    const tooltipX = v.x > this.lineChart.w / 2 ? v.x - 132 : v.x + 12;
    return {
      x: v.x,
      date: v.date,
      visitors: v.value,
      logins: l?.value ?? 0,
      tooltipX
    };
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
      error: (err) => { alert(this.i18n.t('admin.error.role')); console.error(err); }
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
        const msg = err?.error?.message || this.i18n.t('admin.error.user.update');
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
      alert(this.i18n.t('admin.error.self.delete'));
      return;
    }
    this.askConfirm(
      this.i18n.t('admin.confirm.user.title'),
      this.i18n.t('admin.confirm.user.msg', { name: u.email }),
      () => {
        const prev = this.users;
        this.users = this.users.filter(x => x.id !== u.id);
        this.adminService.deleteUser(u.id).subscribe({
          error: (err) => {
            this.users = prev;
            const msg = err?.error?.message || this.i18n.t('admin.error.user.delete');
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
          alert(this.i18n.t('admin.error.project.save'));
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
        error: (err) => { alert(this.i18n.t('admin.error.project.create')); console.error(err); }
      });
    }
  }

  cancelProjectEdit(): void { this.editingProject = null; }

  deleteProject(p: any): void {
    if (!this.isAdmin) return;
    this.askConfirm(
      this.i18n.t('admin.confirm.project.title'),
      this.i18n.t('admin.confirm.project.msg', { name: p.title }),
      () => {
        const prev = this.projects;
        this.projects = this.projects.filter(x => x.id !== p.id);
        this.adminService.deleteProject(p.id).subscribe({
          error: (err) => {
            this.projects = prev;
            alert(this.i18n.t('admin.error.project.delete'));
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
          alert(this.i18n.t('admin.error.experience.save'));
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
        error: (err) => { alert(this.i18n.t('admin.error.experience.create')); console.error(err); }
      });
    }
  }

  cancelExperienceEdit(): void { this.editingExperience = null; }

  deleteExperience(e: any): void {
    if (!this.isAdmin) return;
    this.askConfirm(
      this.i18n.t('admin.confirm.experience.title'),
      this.i18n.t('admin.confirm.experience.msg', { name: e.title }),
      () => {
        const prev = this.experiences;
        this.experiences = this.experiences.filter(x => x.id !== e.id);
        this.adminService.deleteExperience(e.id).subscribe({
          error: (err) => {
            this.experiences = prev;
            alert(this.i18n.t('admin.error.experience.delete'));
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
      this.i18n.t('admin.confirm.message.title'),
      this.i18n.t('admin.confirm.message.msg', { name: m.name }),
      () => {
        const prev = this.messages;
        this.messages = this.messages.filter(x => x.id !== m.id);
        this.adminService.deleteContactMessage(m.id).subscribe({
          error: (err) => {
            this.messages = prev;
            alert(this.i18n.t('admin.error.message.delete'));
            console.error(err);
            this.cdr.markForCheck();
          }
        });
      }
    );
  }

  private askConfirm(title: string, message: string, onConfirm: () => void, confirmLabel?: string): void {
    this.confirmModal = {
      title,
      message,
      confirmLabel: confirmLabel ?? this.i18n.t('admin.action.delete'),
      onConfirm
    };
  }

  confirmAction(): void {
    const cb = this.confirmModal?.onConfirm;
    this.confirmModal = null;
    if (cb) cb();
  }

  cancelConfirm(): void {
    this.confirmModal = null;
  }

  // ─── Sorting ───
  toggleSort(table: SortTable, col: string): void {
    const cur = this.sortState[table];
    if (cur.col === col) {
      cur.dir = cur.dir === 'asc' ? 'desc' : 'asc';
    } else {
      cur.col = col;
      cur.dir = 'asc';
    }
  }

  sortDir(table: SortTable, col: string): SortDir | null {
    const s = this.sortState[table];
    return s.col === col ? s.dir : null;
  }

  private sortRows<T>(rows: T[], col: string, dir: SortDir): T[] {
    const mult = dir === 'asc' ? 1 : -1;
    const dateRe = /^\d{4}-\d{2}-\d{2}/;
    return [...rows].sort((a: any, b: any) => {
      const av = a?.[col];
      const bv = b?.[col];
      const aNil = av === null || av === undefined || av === '';
      const bNil = bv === null || bv === undefined || bv === '';
      if (aNil && bNil) return 0;
      if (aNil) return 1;
      if (bNil) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * mult;
      }
      if (typeof av === 'boolean' && typeof bv === 'boolean') {
        return ((av ? 1 : 0) - (bv ? 1 : 0)) * mult;
      }
      if (typeof av === 'string' && typeof bv === 'string' && dateRe.test(av) && dateRe.test(bv)) {
        const ad = Date.parse(av);
        const bd = Date.parse(bv);
        if (!isNaN(ad) && !isNaN(bd)) return (ad - bd) * mult;
      }
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * mult;
    });
  }

  get sortedUsers(): AdminUser[] {
    const s = this.sortState.users;
    return this.sortRows(this.users, s.col, s.dir);
  }
  get sortedProjects(): any[] {
    const s = this.sortState.projects;
    return this.sortRows(this.projects, s.col, s.dir);
  }
  get sortedExperiences(): any[] {
    const s = this.sortState.experiences;
    return this.sortRows(this.experiences, s.col, s.dir);
  }
  get sortedVisitorLogs(): any[] {
    const s = this.sortState.visitors;
    return this.sortRows(this.visitorLogs, s.col, s.dir);
  }
  get sortedLoginLogs(): any[] {
    const s = this.sortState.logins;
    return this.sortRows(this.loginLogs, s.col, s.dir);
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
