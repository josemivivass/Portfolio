import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, AdminUser, ProfileData } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';

type Tab = 'dashboard' | 'users' | 'projects' | 'experience' | 'visitors' | 'logins' | 'messages' | 'chatbot' | 'profile';
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
  private tabScroll: Record<Tab, number> = {
    dashboard: 0, users: 0, projects: 0, experience: 0,
    visitors: 0, logins: 0, messages: 0, chatbot: 0, profile: 0
  };
  isAdmin = false;
  isEditor = false;
  currentUserEmail = '';

  users: AdminUser[] = [];
  projects: any[] = [];
  experiences: any[] = [];
  visitorLogs: any[] = [];
  loginLogs: any[] = [];
  messages: any[] = [];

  // ─── Messages filters ───
  messagesSearch = '';
  messagesStatus: 'all' | 'answered' | 'pending' = 'all';
  messagesSort: 'newest' | 'oldest' = 'newest';

  // ─── Chatbot ───
  chatbotMessages: any[] = [];
  chatbotClears: any[] = [];
  chatbotSearch = '';
  chatbotSort: 'newest' | 'oldest' = 'newest';
  expandedConversation: string | null = null;

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

  // ─── Tokens line chart ───
  readonly tokensChart = {
    w: 880, h: 280, padL: 62, padR: 28, padT: 24, padB: 46
  };
  tokensChartMax = 1;
  tokensChartTicks: { y: number; value: number }[] = [];
  tokensChartXAxis: { x: number; label: string; date: string }[] = [];
  tokensPoints: { x: number; y: number; value: number; label: string; date: string }[] = [];
  tokensLinePath = '';
  tokensAreaPath = '';
  tokensHoverIndex: number | null = null;

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
  mobileMenuOpen = false;

  editingProject: any = null;
  editingExperience: any = null;
  editingUser: (AdminUser & { _original?: AdminUser }) | null = null;

  // ─── Profile ───
  readonly profileApiUrl = 'http://127.0.0.1:3000/api/profile/photo';
  readonly profileFields: { key: string; labelKey: string; type: 'text' | 'textarea' }[] = [
    { key: 'hero.tagline', labelKey: 'admin.profile.field.hero.tagline', type: 'text' },
    { key: 'about.p1',     labelKey: 'admin.profile.field.about.p1',     type: 'textarea' },
    { key: 'about.p2',     labelKey: 'admin.profile.field.about.p2',     type: 'textarea' },
    { key: 'footer.role',  labelKey: 'admin.profile.field.footer.role',  type: 'text' }
  ];
  profileTexts: { es: Record<string, string>; en: Record<string, string> } = { es: {}, en: {} };
  editingProfileTexts: { es: Record<string, string>; en: Record<string, string> } | null = null;
  profilePhotoVersion = 0;
  profilePhotoPreview: string | null = null;
  profilePhotoDataUrl: string | null = null;
  profilePhotoFileName = '';
  profileSavingTexts = false;
  profileUploadingPhoto = false;
  profileTextsStatus: 'idle' | 'saved' | 'error' = 'idle';
  profilePhotoStatus: 'idle' | 'saved' | 'error' = 'idle';
  profilePhotoError = '';
  profileTextsError = '';

  // Prompt del chatbot
  chatbotPrompt = '';
  chatbotPromptDefault = '';
  chatbotPromptSaving = false;
  chatbotPromptStatus: 'idle' | 'saved' | 'error' = 'idle';
  chatbotPromptError = '';

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
    let pending = 9;
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
    this.adminService.listChatbotMessages().subscribe({
      next: d => { this.chatbotMessages = d?.messages ?? []; this.chatbotClears = d?.clears ?? []; done(); },
      error: fail('chatbot')
    });
    this.adminService.getProfile().subscribe({
      next: d => { this.applyProfileData(d); done(); },
      error: fail('profile')
    });
    this.adminService.getChatbotPrompt().subscribe({
      next: d => {
        this.chatbotPrompt = d?.prompt ?? '';
        this.chatbotPromptDefault = d?.default_prompt ?? '';
        done();
      },
      error: fail('chatbot-prompt')
    });
  }

  private applyProfileData(data: ProfileData | null | undefined): void {
    const es: Record<string, string> = {};
    const en: Record<string, string> = {};
    for (const f of this.profileFields) {
      es[f.key] = data?.es?.[f.key] ?? '';
      en[f.key] = data?.en?.[f.key] ?? '';
    }
    this.profileTexts = { es, en };
    this.profilePhotoVersion = data?.photo_updated_at ?? 0;
    this.i18n.applyOverrides(data?.es ?? {}, data?.en ?? {});
  }

  get profilePhotoUrl(): string {
    return `${this.profileApiUrl}?v=${this.profilePhotoVersion}`;
  }

  onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const okType = /^image\/(jpeg|jpg|png|webp)$/.test(file.type);
    if (!okType || file.size > 5 * 1024 * 1024) {
      this.profilePhotoStatus = 'error';
      this.profilePhotoError = this.i18n.t('admin.profile.photo.invalid');
      this.cdr.markForCheck();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.profilePhotoDataUrl = String(reader.result || '');
      this.profilePhotoPreview = this.profilePhotoDataUrl;
      this.profilePhotoFileName = file.name;
      this.profilePhotoStatus = 'idle';
      this.profilePhotoError = '';
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  clearProfilePhotoSelection(): void {
    this.profilePhotoPreview = null;
    this.profilePhotoDataUrl = null;
    this.profilePhotoFileName = '';
    this.profilePhotoStatus = 'idle';
    this.profilePhotoError = '';
  }

  uploadProfilePhoto(): void {
    if (!this.profilePhotoDataUrl || this.profileUploadingPhoto) return;
    this.profileUploadingPhoto = true;
    this.profilePhotoStatus = 'idle';
    this.adminService.uploadProfilePhoto(this.profilePhotoDataUrl).subscribe({
      next: (res) => {
        this.profilePhotoVersion = res?.photo_updated_at ?? Date.now();
        this.profileUploadingPhoto = false;
        this.profilePhotoStatus = 'saved';
        this.clearProfilePhotoSelection();
        this.profilePhotoStatus = 'saved';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.profileUploadingPhoto = false;
        this.profilePhotoStatus = 'error';
        this.profilePhotoError = err?.error?.message || this.i18n.t('admin.profile.photo.error');
        console.error(err);
        this.cdr.markForCheck();
      }
    });
  }

  startEditProfileTexts(): void {
    this.editingProfileTexts = {
      es: { ...this.profileTexts.es },
      en: { ...this.profileTexts.en }
    };
    this.profileTextsStatus = 'idle';
    this.profileTextsError = '';
  }

  cancelEditProfileTexts(): void {
    if (this.profileSavingTexts) return;
    this.editingProfileTexts = null;
    this.profileTextsStatus = 'idle';
    this.profileTextsError = '';
  }

  saveProfileTexts(): void {
    if (this.profileSavingTexts || !this.editingProfileTexts) return;
    const payload = this.editingProfileTexts;
    this.profileSavingTexts = true;
    this.profileTextsStatus = 'idle';
    this.adminService.updateProfileTexts(payload).subscribe({
      next: (res) => {
        this.applyProfileData(res);
        this.profileSavingTexts = false;
        this.profileTextsStatus = 'saved';
        this.editingProfileTexts = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.profileSavingTexts = false;
        this.profileTextsStatus = 'error';
        this.profileTextsError = err?.error?.message || this.i18n.t('admin.profile.texts.error');
        console.error(err);
        this.cdr.markForCheck();
      }
    });
  }

  saveChatbotPrompt(): void {
    if (this.chatbotPromptSaving) return;
    const trimmed = (this.chatbotPrompt || '').trim();
    if (!trimmed) {
      this.chatbotPromptStatus = 'error';
      this.chatbotPromptError = this.i18n.t('admin.profile.chatbot.empty');
      this.cdr.markForCheck();
      return;
    }
    this.chatbotPromptSaving = true;
    this.chatbotPromptStatus = 'idle';
    this.adminService.updateChatbotPrompt(this.chatbotPrompt).subscribe({
      next: (res) => {
        this.chatbotPrompt = res?.prompt ?? this.chatbotPrompt;
        this.chatbotPromptSaving = false;
        this.chatbotPromptStatus = 'saved';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.chatbotPromptSaving = false;
        this.chatbotPromptStatus = 'error';
        this.chatbotPromptError = err?.error?.message || this.i18n.t('admin.profile.chatbot.error');
        console.error(err);
        this.cdr.markForCheck();
      }
    });
  }

  resetChatbotPrompt(): void {
    if (!this.chatbotPromptDefault) return;
    this.chatbotPrompt = this.chatbotPromptDefault;
    this.chatbotPromptStatus = 'idle';
    this.chatbotPromptError = '';
    this.cdr.markForCheck();
  }

  get chatbotPromptLength(): number {
    return (this.chatbotPrompt || '').length;
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
    this.buildTokensLineChart();
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

  private buildTokensLineChart(): void {
    const { w, h, padL, padR, padT, padB } = this.tokensChart;

    const tokenMsgs = this.chatbotMessages.filter(m => m.created_at && m.tokens_used);

    if (tokenMsgs.length === 0) {
      this.tokensPoints = [];
      this.tokensLinePath = this.tokensAreaPath = '';
      this.tokensChartTicks = [];
      this.tokensChartXAxis = [];
      return;
    }

    // Span from the earliest day with token data up to today (UTC-bucketed)
    const startTs = Math.min(...tokenMsgs.map(m => new Date(m.created_at).getTime()));
    const startKey = new Date(startTs).toISOString().substring(0, 10);
    const endKey = new Date().toISOString().substring(0, 10);

    const buckets: Record<string, number> = {};
    const cursor = new Date(startKey + 'T00:00:00Z');
    const end = new Date(endKey + 'T00:00:00Z');
    while (cursor.getTime() <= end.getTime()) {
      buckets[cursor.toISOString().substring(0, 10)] = 0;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    for (const m of tokenMsgs) {
      const key = new Date(m.created_at).toISOString().substring(0, 10);
      if (key in buckets) buckets[key] += m.tokens_used;
    }

    const series = Object.entries(buckets).map(([date, value]) => {
      const day = Number(date.substring(8, 10));
      return { label: String(day), date, value };
    });

    const n = series.length;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const stepX = n > 1 ? innerW / (n - 1) : 0;
    const rawMax = Math.max(1, ...series.map(s => s.value));
    const niceMax = this.niceCeil(rawMax);
    this.tokensChartMax = niceMax;

    this.tokensPoints = series.map((s, i) => ({
      x: padL + i * stepX,
      y: padT + innerH - (s.value / niceMax) * innerH,
      value: s.value,
      label: s.label,
      date: s.date
    }));

    this.tokensLinePath = this.buildSmoothPath(this.tokensPoints);
    this.tokensAreaPath = this.buildAreaPath(this.tokensPoints, padT + innerH);

    this.tokensChartTicks = [];
    const tickCount = 4;
    for (let i = 0; i <= tickCount; i++) {
      const value = Math.round((niceMax * (tickCount - i)) / tickCount);
      this.tokensChartTicks.push({ y: padT + (innerH * i) / tickCount, value });
    }

    // Keep the x-axis readable as the range grows: cap at ~10 labels
    const maxLabels = 10;
    const stride = Math.max(1, Math.ceil(n / maxLabels));
    const spansMonths = series[0].date.substring(0, 7) !== series[n - 1].date.substring(0, 7);
    this.tokensChartXAxis = series.map((s, i) => {
      const show = i % stride === 0 || i === n - 1;
      let label = '';
      if (show) {
        const day = Number(s.date.substring(8, 10));
        const month = Number(s.date.substring(5, 7));
        label = spansMonths ? `${day}/${month}` : String(day);
      }
      return { x: padL + i * stepX, label, date: s.date };
    });
  }

  onTokensChartHover(i: number | null): void {
    this.tokensHoverIndex = i;
  }

  get tokensHoverData(): { x: number; date: string; tokens: number; tooltipX: number } | null {
    if (this.tokensHoverIndex === null) return null;
    const p = this.tokensPoints[this.tokensHoverIndex];
    if (!p) return null;
    const tooltipX = p.x > this.tokensChart.w / 2 ? p.x - 120 : p.x + 12;
    return { x: p.x, date: p.date, tokens: p.value, tooltipX };
  }

  get totalTokensUsed(): number {
    return this.chatbotMessages.reduce((sum, m) => sum + (m.tokens_used || 0), 0);
  }

  formatTokens(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
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
    if (tab === this.activeTab) {
      this.mobileMenuOpen = false;
      return;
    }
    if (isPlatformBrowser(this.platformId)) {
      this.tabScroll[this.activeTab] = window.scrollY;
    }
    this.activeTab = tab;
    this.editingProject = null;
    this.editingExperience = null;
    this.editingUser = null;
    this.mobileMenuOpen = false;
    if (isPlatformBrowser(this.platformId)) {
      const target = this.tabScroll[tab] ?? 0;
      requestAnimationFrame(() => window.scrollTo(0, target));
    }
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  get activeTabLabelKey(): string {
    switch (this.activeTab) {
      case 'dashboard': return 'admin.tab.dashboard';
      case 'users': return 'admin.tab.users';
      case 'projects': return 'admin.tab.projects';
      case 'experience': return 'admin.tab.experience';
      case 'visitors': return 'admin.tab.visitors';
      case 'logins': return 'admin.tab.logins';
      case 'messages': return 'admin.tab.messages';
      case 'chatbot': return 'admin.tab.chatbot';
      case 'profile': return 'admin.tab.profile';
    }
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
  get filteredMessages(): any[] {
    const term = this.messagesSearch.trim().toLowerCase();
    let rows = this.messages.filter(m => {
      if (this.messagesStatus === 'answered' && !m.is_answered) return false;
      if (this.messagesStatus === 'pending' && m.is_answered) return false;
      if (!term) return true;
      return (
        (m.name || '').toLowerCase().includes(term) ||
        (m.email || '').toLowerCase().includes(term) ||
        (m.message || '').toLowerCase().includes(term)
      );
    });
    const mult = this.messagesSort === 'newest' ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const ad = Date.parse(a?.created_at ?? '') || 0;
      const bd = Date.parse(b?.created_at ?? '') || 0;
      return (ad - bd) * mult;
    });
    return rows;
  }

  get pendingMessages(): number {
    return this.messages.filter(m => !m.is_answered).length;
  }

  toggleAnswered(m: any): void {
    const next = !m.is_answered;
    const prev = m.is_answered;
    m.is_answered = next;
    this.cdr.markForCheck();
    this.adminService.updateContactMessageAnswered(m.id, next).subscribe({
      error: (err) => {
        m.is_answered = prev;
        alert(this.i18n.t('admin.error.message.update'));
        console.error(err);
        this.cdr.markForCheck();
      }
    });
  }

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

  // ─── Chatbot ───
  get chatbotConversations(): { key: string; email: string; userId: number; date: string; messages: any[]; totalTokens: number; sessionIndex: number }[] {
    const term = this.chatbotSearch.trim().toLowerCase();

    // Build per-user clear timestamps sorted ascending
    const userClears: Record<number, number[]> = {};
    for (const c of this.chatbotClears) {
      const uid = c.user_id;
      if (!userClears[uid]) userClears[uid] = [];
      userClears[uid].push(new Date(c.cleared_at).getTime());
    }
    for (const uid of Object.keys(userClears)) {
      userClears[Number(uid)].sort((a, b) => a - b);
    }

    // Assign each message a session index based on clear boundaries
    const grouped: Record<string, any[]> = {};
    for (const m of this.chatbotMessages) {
      const uid = m.user_id;
      const ts = new Date(m.created_at).getTime();
      const clears = userClears[uid] || [];
      // Session index = number of clears that happened before this message
      let session = 0;
      for (let i = clears.length - 1; i >= 0; i--) {
        if (ts > clears[i]) { session = i + 1; break; }
      }
      const key = `${uid}_s${session}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ ...m, _session: session });
    }

    let convos = Object.entries(grouped).map(([key, msgs]) => {
      msgs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const first = msgs[0];
      const last = msgs[msgs.length - 1];
      const startDate = new Date(first.created_at).toISOString().substring(0, 10);
      const endDate = new Date(last.created_at).toISOString().substring(0, 10);
      const date = startDate === endDate ? startDate : `${startDate} → ${endDate}`;
      return {
        key,
        email: first.email || '—',
        userId: first.user_id,
        date,
        messages: msgs,
        totalTokens: msgs.reduce((sum: number, m: any) => sum + (m.tokens_used || 0), 0),
        sessionIndex: first._session
      };
    });

    if (term) {
      convos = convos.filter(c =>
        c.email.toLowerCase().includes(term) ||
        c.messages.some((m: any) => (m.message || '').toLowerCase().includes(term))
      );
    }

    const mult = this.chatbotSort === 'newest' ? -1 : 1;
    convos.sort((a, b) => {
      const aFirst = new Date(a.messages[0].created_at).getTime();
      const bFirst = new Date(b.messages[0].created_at).getTime();
      return (aFirst - bFirst) * mult;
    });

    return convos;
  }

  get totalChatbotMessages(): number { return this.chatbotMessages.length; }
  get totalChatbotConversations(): number { return this.chatbotConversations.length; }

  toggleConversation(key: string): void {
    this.expandedConversation = this.expandedConversation === key ? null : key;
  }

  deleteChatbotMsg(m: any): void {
    if (!this.isAdmin) return;
    this.askConfirm(
      this.i18n.t('admin.chatbot.confirm.msg.title'),
      this.i18n.t('admin.chatbot.confirm.msg.body'),
      () => {
        const prev = this.chatbotMessages;
        this.chatbotMessages = this.chatbotMessages.filter(x => x.id !== m.id);
        this.adminService.deleteChatbotMessage(m.id).subscribe({
          error: (err) => {
            this.chatbotMessages = prev;
            alert(this.i18n.t('admin.error.chatbot.delete'));
            console.error(err);
            this.cdr.markForCheck();
          }
        });
      }
    );
  }

  deleteChatbotConvo(convo: { messages: any[]; key: string }): void {
    if (!this.isAdmin) return;
    this.askConfirm(
      this.i18n.t('admin.chatbot.confirm.convo.title'),
      this.i18n.t('admin.chatbot.confirm.convo.body'),
      () => {
        const ids = convo.messages.map((m: any) => m.id);
        const idSet = new Set(ids);
        const prev = this.chatbotMessages;
        this.chatbotMessages = this.chatbotMessages.filter(x => !idSet.has(x.id));
        if (this.expandedConversation === convo.key) this.expandedConversation = null;
        this.adminService.deleteChatbotConversation(ids).subscribe({
          error: (err) => {
            this.chatbotMessages = prev;
            alert(this.i18n.t('admin.error.chatbot.delete'));
            console.error(err);
            this.cdr.markForCheck();
          }
        });
      }
    );
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
