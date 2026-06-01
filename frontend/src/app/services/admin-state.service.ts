import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService, AdminUser, ProfileData, CvMeta } from './admin.service';
import { AuthService } from './auth.service';
import { TranslationService } from './translation.service';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { techIcon, hideIconOnError } from '../utils/tech-icons';
import { parseNotebookUrl, isNotebookUrl, notebookName } from '../utils/notebook';
import { environment } from '../../environments/environment';

export type AdminTab = 'dashboard' | 'users' | 'projects' | 'experience' | 'education' | 'visitors' | 'logins' | 'messages' | 'chatbot' | 'profile';
type SortDir = 'asc' | 'desc';
type SortTable = 'users' | 'projects' | 'experiences' | 'educations' | 'visitors' | 'logins';
interface SortState { col: string; dir: SortDir; }

interface ChartBar {
  label: string;
  value: number;
  height: number;
  date: string;
}

interface LineChartGeometry {
  w: number; h: number; padL: number; padR: number; padT: number; padB: number;
}

interface ChartPoint {
  x: number; y: number; value: number; label: string; date: string;
}

interface ChartTick { y: number; value: number; }
interface ChartXAxisTick { x: number; label: string; date: string; }

interface ConfirmModal {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  messageHtml?: boolean;
}

interface CvUploadState {
  dataUrl: string | null;
  fileName: string;
  uploading: boolean;
  status: 'idle' | 'saved' | 'error';
  error: string;
}

@Injectable({ providedIn: 'root' })
export class AdminStateService {
  private adminService = inject(AdminService);
  private auth = inject(AuthService);
  private router = inject(Router);
  readonly i18n = inject(TranslationService);

  // ─── Auth / role ───
  readonly isAdmin = signal(false);
  readonly isEditor = signal(false);
  readonly currentUserEmail = signal('');

  // ─── Datos backend ───
  readonly users = signal<AdminUser[]>([]);
  readonly projects = signal<any[]>([]);
  readonly experiences = signal<any[]>([]);
  readonly visitorLogs = signal<any[]>([]);
  readonly loginLogs = signal<any[]>([]);
  readonly messages = signal<any[]>([]);
  readonly chatbotMessages = signal<any[]>([]);
  readonly chatbotClears = signal<any[]>([]);
  readonly educations = signal<any[]>([]);
  readonly skills = signal<any[]>([]);

  // ─── Estado UI ───
  readonly activeTab = signal<AdminTab>('dashboard');
  readonly mobileMenuOpen = signal(false);
  readonly initialLoading = signal(true);
  readonly errorMessage = signal('');
  readonly expandedConversation = signal<string | null>(null);
  readonly hoverIndex = signal<number | null>(null);
  readonly tokensHoverIndex = signal<number | null>(null);

  // ─── Filtros (mutables por [(ngModel)]) ───
  messagesSearch = '';
  messagesStatus: 'all' | 'answered' | 'pending' = 'all';
  messagesSort: 'newest' | 'oldest' = 'newest';
  // Versión que se incrementa al cambiar un filtro mutable, para
  // que los `computed` que dependen de filtros se reevalúen.
  private readonly filtersVersion = signal(0);
  private bumpFilters(): void { this.filtersVersion.update(n => n + 1); }
  onMessagesFilterChange(): void { this.bumpFilters(); }

  chatbotSearch = '';
  chatbotSort: 'newest' | 'oldest' = 'newest';
  onChatbotFilterChange(): void { this.bumpFilters(); }

  // ─── Edición (objetos mutables apuntados por signals) ───
  readonly editingProject = signal<any | null>(null);
  readonly editingNotebook = signal<any | null>(null);
  readonly editingExperience = signal<any | null>(null);
  readonly editingUser = signal<(AdminUser & { _original?: AdminUser }) | null>(null);
  readonly editingProfileTexts = signal<{ es: Record<string, string>; en: Record<string, string> } | null>(null);
  readonly editingChatbotPrompt = signal<string | null>(null);
  readonly confirmModal = signal<ConfirmModal | null>(null);
  readonly editingEducation = signal<any | null>(null);
  readonly editingSkills = signal<Record<string, string> | null>(null);
  readonly skillsSaving = signal(false);
  readonly skillsStatus = signal<'idle' | 'saved' | 'error'>('idle');
  readonly skillsError = signal('');

  readonly skillCategories: { tipo: string; labelKey: string }[] = [
    { tipo: 'IA & Data Science',              labelKey: 'skills.ai'    },
    { tipo: 'Desarrollo Full Stack & Móvil',  labelKey: 'skills.dev'   },
    { tipo: 'Cloud & DevOps',                 labelKey: 'skills.cloud' },
    { tipo: 'QA & Testing',                   labelKey: 'skills.qa'    }
  ];

  // ─── Galería de proyecto en edición ───
  readonly projectImagesUploading = signal(0);
  readonly projectImagesUploadError = signal('');
  readonly galleryDragOver = signal(false);
  private static readonly PROJECT_IMG_MAX_BYTES = 5 * 1024 * 1024;
  private static readonly PROJECT_IMG_MIME_RE = /^image\/(jpe?g|png|webp|gif)$/i;

  // ─── Profile ───
  readonly profileApiUrl = `${environment.apiUrl}/profile/photo`;
  readonly profileFields: { key: string; labelKey: string; type: 'text' | 'textarea' }[] = [
    { key: 'hero.tagline', labelKey: 'admin.profile.field.hero.tagline', type: 'textarea' },
    { key: 'about',        labelKey: 'admin.profile.field.about',        type: 'textarea' }
  ];
  readonly profileTexts = signal<{ es: Record<string, string>; en: Record<string, string> }>({ es: {}, en: {} });
  readonly profilePhotoVersion = signal(0);
  readonly profilePhotoPreview = signal<string | null>(null);
  readonly profilePhotoDataUrl = signal<string | null>(null);
  readonly profilePhotoFileName = signal('');
  readonly profileSavingTexts = signal(false);
  readonly profileUploadingPhoto = signal(false);
  readonly profileTextsStatus = signal<'idle' | 'saved' | 'error'>('idle');
  readonly profilePhotoStatus = signal<'idle' | 'saved' | 'error'>('idle');
  readonly profilePhotoError = signal('');
  readonly profileTextsError = signal('');

  // ─── Backup BD ───
  readonly backupDownloading = signal(false);
  readonly backupStatus = signal<'idle' | 'saved' | 'error'>('idle');
  readonly backupError = signal('');

  // ─── Backup a Google Drive ───
  readonly driveBackupUploading = signal(false);
  readonly driveBackupStatus = signal<'idle' | 'saved' | 'error'>('idle');
  readonly driveBackupError = signal('');

  // ─── Restaurar BD ───
  readonly restoreUploading = signal(false);
  readonly restoreStatus = signal<'idle' | 'saved' | 'error'>('idle');
  readonly restoreError = signal('');

  // ─── CV descargables (PDF) ───
  readonly cvLangs: { lang: 'es' | 'en'; labelKey: string }[] = [
    { lang: 'es', labelKey: 'admin.profile.cv.lang.es' },
    { lang: 'en', labelKey: 'admin.profile.cv.lang.en' }
  ];
  readonly cvMeta = signal<CvMeta>({
    es: { filename: 'CV_ES_JoseMiguelVivasSanchez.pdf', custom: false, updated_at: 0 },
    en: { filename: 'CV_EN_JoseMiguelVivasSanchez.pdf', custom: false, updated_at: 0 }
  });
  private readonly cvState = signal<Record<'es' | 'en', CvUploadState>>({
    es: { dataUrl: null, fileName: '', uploading: false, status: 'idle', error: '' },
    en: { dataUrl: null, fileName: '', uploading: false, status: 'idle', error: '' }
  });

  // ─── Chatbot prompt / model ───
  readonly chatbotPrompt = signal('');
  readonly chatbotPromptDefault = signal('');
  readonly chatbotPromptSaving = signal(false);
  readonly chatbotPromptStatus = signal<'idle' | 'saved' | 'error'>('idle');
  readonly chatbotPromptError = signal('');

  readonly chatbotModel = signal('');
  readonly chatbotModelDefault = signal('');
  readonly chatbotModelOptions = signal<string[]>([]);
  readonly chatbotModelSaving = signal(false);
  readonly chatbotModelStatus = signal<'idle' | 'saved' | 'error'>('idle');
  readonly chatbotModelError = signal('');

  // ─── Charts (señales de geometría + datos derivados) ───
  readonly visitorChart = signal<ChartBar[]>([]);
  readonly loginChart = signal<ChartBar[]>([]);
  readonly visitorChartMax = signal(0);
  readonly loginChartMax = signal(0);

  readonly lineChart = signal<LineChartGeometry>({
    w: 880, h: 280, padL: 52, padR: 28, padT: 24, padB: 46
  });
  readonly lineChartMax = signal(1);
  readonly lineChartTicks = signal<ChartTick[]>([]);
  readonly lineChartXAxis = signal<ChartXAxisTick[]>([]);
  readonly visitorPoints = signal<ChartPoint[]>([]);
  readonly loginPoints = signal<ChartPoint[]>([]);
  readonly visitorLinePath = signal('');
  readonly loginLinePath = signal('');
  readonly visitorAreaPath = signal('');
  readonly loginAreaPath = signal('');

  readonly tokensChart = signal<LineChartGeometry>({
    w: 880, h: 280, padL: 62, padR: 28, padT: 24, padB: 46
  });
  readonly tokensChartMax = signal(1);
  readonly tokensChartTicks = signal<ChartTick[]>([]);
  readonly tokensChartXAxis = signal<ChartXAxisTick[]>([]);
  readonly tokensPoints = signal<ChartPoint[]>([]);
  readonly tokensLinePath = signal('');
  readonly tokensAreaPath = signal('');

  private chartIsMobile = false;

  // ─── Sort state ───
  readonly sortState = signal<Record<SortTable, SortState>>({
    users: { col: 'id', dir: 'asc' },
    projects: { col: 'id', dir: 'asc' },
    experiences: { col: 'start_date', dir: 'desc' },
    educations: { col: 'start_date', dir: 'desc' },
    visitors: { col: 'entry_time', dir: 'desc' },
    logins: { col: 'login_time', dir: 'desc' }
  });

  // ─── Stats (computed) ───
  readonly totalUsers = computed(() => this.users().length);
  readonly totalProjects = computed(() => this.projects().length);
  readonly totalVisits = computed(() => this.visitorLogs().length);
  readonly totalLogins = computed(() => this.loginLogs().length);
  readonly totalMessages = computed(() => this.messages().length);
  readonly uniqueVisitors = computed(() =>
    new Set(this.visitorLogs().map(v => v.visitor_uuid)).size
  );
  readonly pendingMessages = computed(() =>
    this.messages().filter(m => !m.is_answered).length
  );
  readonly totalChatbotMessages = computed(() => this.chatbotMessages().length);
  readonly totalTokensUsed = computed(() =>
    this.chatbotMessages().reduce((sum, m) => sum + (m.tokens_used || 0), 0)
  );

  // Nombre legible del tab activo (para el topbar móvil).
  readonly activeTabLabelKey = computed(() => {
    switch (this.activeTab()) {
      case 'dashboard': return 'admin.tab.dashboard';
      case 'users': return 'admin.tab.users';
      case 'projects': return 'admin.tab.projects';
      case 'experience': return 'admin.tab.experience';
      case 'education': return 'admin.tab.education';
      case 'visitors': return 'admin.tab.visitors';
      case 'logins': return 'admin.tab.logins';
      case 'messages': return 'admin.tab.messages';
      case 'chatbot': return 'admin.tab.chatbot';
      case 'profile': return 'admin.tab.profile';
      default: return '';
    }
  });

  // ─── Sorted lists (computed) ───
  readonly sortedUsers = computed(() => {
    const s = this.sortState().users;
    return this.sortRows(this.users(), s.col, s.dir);
  });
  readonly sortedProjects = computed(() => {
    const s = this.sortState().projects;
    return this.sortRows(this.projects(), s.col, s.dir);
  });
  readonly sortedExperiences = computed(() => {
    const s = this.sortState().experiences;
    return this.sortRows(this.experiences(), s.col, s.dir);
  });
  readonly sortedEducations = computed(() => {
    const s = this.sortState().educations;
    return this.sortRows(this.educations(), s.col, s.dir);
  });
  readonly sortedVisitorLogs = computed(() => {
    const s = this.sortState().visitors;
    return this.sortRows(this.visitorLogs(), s.col, s.dir);
  });
  readonly sortedLoginLogs = computed(() => {
    const s = this.sortState().logins;
    return this.sortRows(this.loginLogs(), s.col, s.dir);
  });

  // ─── Filtered messages ───
  readonly filteredMessages = computed(() => {
    this.filtersVersion(); // re-eval al cambiar filtros mutables
    const term = this.messagesSearch.trim().toLowerCase();
    let rows = this.messages().filter(m => {
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
  });

  // ─── Chatbot conversations (computed) ───
  readonly chatbotConversations = computed(() => {
    this.filtersVersion();
    const term = this.chatbotSearch.trim().toLowerCase();

    const userClears: Record<number, number[]> = {};
    for (const c of this.chatbotClears()) {
      const uid = c.user_id;
      if (!userClears[uid]) userClears[uid] = [];
      userClears[uid].push(new Date(c.cleared_at).getTime());
    }
    for (const uid of Object.keys(userClears)) {
      userClears[Number(uid)].sort((a, b) => a - b);
    }

    const grouped: Record<string, any[]> = {};
    for (const m of this.chatbotMessages()) {
      let key: string;
      let session = 0;
      if (m.user_id == null) {
        key = `anon_${m.session_id || 'none'}`;
      } else {
        const uid = m.user_id;
        const ts = new Date(m.created_at).getTime();
        const clears = userClears[uid] || [];
        for (let i = clears.length - 1; i >= 0; i--) {
          if (ts > clears[i]) { session = i + 1; break; }
        }
        key = `${uid}_s${session}`;
      }
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ ...m, _session: session });
    }

    const anonLabel = this.i18n.t('admin.chatbot.anonymous');

    let convos = Object.entries(grouped).map(([key, msgs]) => {
      msgs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const first = msgs[0];
      const last = msgs[msgs.length - 1];
      const startDate = new Date(first.created_at).toISOString().substring(0, 10);
      const endDate = new Date(last.created_at).toISOString().substring(0, 10);
      const date = startDate === endDate ? startDate : `${startDate} → ${endDate}`;
      const isAnonymous = first.user_id == null;
      return {
        key,
        email: isAnonymous ? anonLabel : (first.email || '—'),
        userId: first.user_id,
        date,
        messages: msgs,
        totalTokens: msgs.reduce((sum: number, m: any) => sum + (m.tokens_used || 0), 0),
        sessionIndex: first._session,
        isAnonymous
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
      const aLast = new Date(a.messages[a.messages.length - 1].created_at).getTime();
      const bLast = new Date(b.messages[b.messages.length - 1].created_at).getTime();
      return (aLast - bLast) * mult;
    });

    return convos;
  });

  readonly totalChatbotConversations = computed(() => this.chatbotConversations().length);

  // ─── Hover tooltips ───
  readonly hoverData = computed(() => {
    const idx = this.hoverIndex();
    if (idx === null) return null;
    const v = this.visitorPoints()[idx];
    const l = this.loginPoints()[idx];
    if (!v) return null;
    const valueFontPx = this.chartIsMobile ? 17 : 11;
    const dateFontPx = this.chartIsMobile ? 15 : 10;
    const visText = `${this.i18n.t('admin.tab.visitors')}: ${v.value}`;
    const logText = `${this.i18n.t('admin.tab.logins')}: ${l?.value ?? 0}`;
    const tooltipW = this.computeTooltipWidth([
      { text: v.date,    fontPx: dateFontPx,  leftPad: 10, rightPad: 12 },
      { text: visText,   fontPx: valueFontPx, leftPad: 20, rightPad: 12 },
      { text: logText,   fontPx: valueFontPx, leftPad: 20, rightPad: 12 }
    ]);
    const tooltipX = v.x > this.lineChart().w / 2 ? v.x - (tooltipW + 12) : v.x + 12;
    return {
      x: v.x,
      date: v.date,
      visitors: v.value,
      logins: l?.value ?? 0,
      tooltipX,
      tooltipW
    };
  });

  readonly tokensHoverData = computed(() => {
    const idx = this.tokensHoverIndex();
    if (idx === null) return null;
    const p = this.tokensPoints()[idx];
    if (!p) return null;
    const valueFontPx = this.chartIsMobile ? 17 : 11;
    const dateFontPx = this.chartIsMobile ? 15 : 10;
    const valueText = `${this.formatTokens(p.value)} tokens`;
    const tooltipW = this.computeTooltipWidth([
      { text: p.date, fontPx: dateFontPx, leftPad: 10, rightPad: 12 },
      { text: valueText, fontPx: valueFontPx, leftPad: 20, rightPad: 12 }
    ]);
    const tooltipX = p.x > this.tokensChart().w / 2 ? p.x - (tooltipW + 12) : p.x + 12;
    return { x: p.x, date: p.date, tokens: p.value, tooltipX, tooltipW };
  });

  readonly profilePhotoUrl = computed(() => `${this.profileApiUrl}?v=${this.profilePhotoVersion()}`);

  readonly editingChatbotPromptLength = computed(() => (this.editingChatbotPrompt() || '').length);

  // ═══════════════════════════════════════════════════════
  //  Inicialización (la llama AdminComponent en ngOnInit)
  // ═══════════════════════════════════════════════════════
  init(): boolean {
    this.isAdmin.set(this.auth.isAdmin());
    this.isEditor.set(this.auth.isEditor());

    if (!this.isAdmin() && !this.isEditor()) {
      this.router.navigate(['/']);
      return false;
    }

    this.currentUserEmail.set(this.auth.getEmail() ?? '');

    this.loadAllData();
    return true;
  }

  setChartMobile(isMobile: boolean): boolean {
    if (isMobile === this.chartIsMobile) return false;
    this.chartIsMobile = isMobile;
    if (isMobile) {
      this.lineChart.set({ w: 460, h: 320, padL: 38, padR: 14, padT: 18, padB: 36 });
      this.tokensChart.set({ w: 460, h: 320, padL: 50, padR: 14, padT: 18, padB: 36 });
    } else {
      this.lineChart.set({ w: 880, h: 280, padL: 52, padR: 28, padT: 24, padB: 46 });
      this.tokensChart.set({ w: 880, h: 280, padL: 62, padR: 28, padT: 24, padB: 46 });
    }
    return true;
  }

  private loadAllData(): void {
    this.initialLoading.set(true);
    let pending = 13;
    const done = () => {
      pending--;
      if (pending <= 0) {
        this.buildCharts();
        this.initialLoading.set(false);
      }
    };
    const fail = (label: string) => (err: any) => {
      console.error(`[admin] ${label} failed`, err);
      done();
    };

    this.adminService.listProjects().subscribe({
      next: d => { this.projects.set(d ?? []); done(); },
      error: fail('projects')
    });
    this.adminService.listExperience().subscribe({
      next: d => { this.experiences.set(d ?? []); done(); },
      error: fail('experience')
    });
    this.adminService.listEducation().subscribe({
      next: d => { this.educations.set(d ?? []); done(); },
      error: fail('education')
    });
    this.adminService.listSkills().subscribe({
      next: d => { this.skills.set(d ?? []); done(); },
      error: fail('skills')
    });
    this.adminService.listVisitorLogs().subscribe({
      next: d => { this.visitorLogs.set(d ?? []); this.buildCharts(); done(); },
      error: fail('visitors')
    });
    this.adminService.listLoginLogs().subscribe({
      next: d => { this.loginLogs.set(d ?? []); this.buildCharts(); done(); },
      error: fail('logins')
    });
    this.adminService.listContactMessages().subscribe({
      next: d => { this.messages.set(d ?? []); done(); },
      error: fail('messages')
    });
    this.adminService.listUsers().subscribe({
      next: d => { this.users.set(d ?? []); done(); },
      error: fail('users')
    });
    this.adminService.listChatbotMessages().subscribe({
      next: d => {
        this.chatbotMessages.set(d?.messages ?? []);
        this.chatbotClears.set(d?.clears ?? []);
        done();
      },
      error: fail('chatbot')
    });
    this.adminService.getProfile().subscribe({
      next: d => { this.applyProfileData(d); done(); },
      error: fail('profile')
    });
    this.adminService.getChatbotPrompt().subscribe({
      next: d => {
        this.chatbotPrompt.set(d?.prompt ?? '');
        this.chatbotPromptDefault.set(d?.default_prompt ?? '');
        done();
      },
      error: fail('chatbot-prompt')
    });
    this.adminService.getChatbotModel().subscribe({
      next: d => {
        this.chatbotModelOptions.set(d?.available_models ?? []);
        this.chatbotModelDefault.set(d?.default_model ?? '');
        this.chatbotModel.set(d?.model ?? this.chatbotModelDefault());
        done();
      },
      error: fail('chatbot-model')
    });
    this.adminService.getCvMeta().subscribe({
      next: d => { if (d) this.cvMeta.set(d); done(); },
      error: fail('cv-meta')
    });
  }

  getSkillTags(type: string): string[] {
    const skill = this.skills().find(s => s.tipo === type);
    if (!skill || !skill.tags) return [];
    try {
      return typeof skill.tags === 'string' ? JSON.parse(skill.tags) : skill.tags;
    } catch { return []; }
  }

  techIcon(tag: string): string {
    return techIcon(tag);
  }

  hideIconOnError(event: Event): void {
    hideIconOnError(event);
  }

  private applyProfileData(data: ProfileData | null | undefined): void {
    const es: Record<string, string> = {};
    const en: Record<string, string> = {};
    for (const f of this.profileFields) {
      es[f.key] = data?.es?.[f.key] ?? '';
      en[f.key] = data?.en?.[f.key] ?? '';
    }
    this.profileTexts.set({ es, en });
    this.profilePhotoVersion.set(data?.photo_updated_at ?? 0);
    this.i18n.applyOverrides(data?.es ?? {}, data?.en ?? {});
  }

  // ═══════════════════════════════════════════════════════
  //  Profile
  // ═══════════════════════════════════════════════════════
  onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const okType = /^image\/(jpeg|jpg|png|webp)$/.test(file.type);
    if (!okType || file.size > 5 * 1024 * 1024) {
      this.profilePhotoStatus.set('error');
      this.profilePhotoError.set(this.i18n.t('admin.profile.photo.invalid'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      this.profilePhotoDataUrl.set(dataUrl);
      this.profilePhotoPreview.set(dataUrl);
      this.profilePhotoFileName.set(file.name);
      this.profilePhotoStatus.set('idle');
      this.profilePhotoError.set('');
    };
    reader.readAsDataURL(file);
  }

  clearProfilePhotoSelection(): void {
    this.profilePhotoPreview.set(null);
    this.profilePhotoDataUrl.set(null);
    this.profilePhotoFileName.set('');
    this.profilePhotoStatus.set('idle');
    this.profilePhotoError.set('');
  }

  uploadProfilePhoto(): void {
    const dataUrl = this.profilePhotoDataUrl();
    if (!dataUrl || this.profileUploadingPhoto()) return;
    this.profileUploadingPhoto.set(true);
    this.profilePhotoStatus.set('idle');
    this.adminService.uploadProfilePhoto(dataUrl).subscribe({
      next: (res) => {
        this.profilePhotoVersion.set(res?.photo_updated_at ?? Date.now());
        this.profileUploadingPhoto.set(false);
        this.clearProfilePhotoSelection();
        this.profilePhotoStatus.set('saved');
      },
      error: (err) => {
        this.profileUploadingPhoto.set(false);
        this.profilePhotoStatus.set('error');
        this.profilePhotoError.set(err?.error?.message || this.i18n.t('admin.profile.photo.error'));
        console.error(err);
      }
    });
  }

  startEditProfileTexts(): void {
    const cur = this.profileTexts();
    this.editingProfileTexts.set({
      es: { ...cur.es },
      en: { ...cur.en }
    });
    this.profileTextsStatus.set('idle');
    this.profileTextsError.set('');
  }

  // ─── CV descargables ───
  cvUrl(lang: 'es' | 'en'): string {
    return `${environment.apiUrl}/profile/cv/${lang}?v=${this.cvMeta()[lang].updated_at}`;
  }
  cvFileName(lang: 'es' | 'en'): string { return this.cvState()[lang].fileName; }
  cvDataUrl(lang: 'es' | 'en'): string | null { return this.cvState()[lang].dataUrl; }
  cvUploading(lang: 'es' | 'en'): boolean { return this.cvState()[lang].uploading; }
  cvStatus(lang: 'es' | 'en'): 'idle' | 'saved' | 'error' { return this.cvState()[lang].status; }
  cvError(lang: 'es' | 'en'): string { return this.cvState()[lang].error; }

  private patchCv(lang: 'es' | 'en', patch: Partial<CvUploadState>): void {
    this.cvState.update(s => ({ ...s, [lang]: { ...s[lang], ...patch } }));
  }

  onCvFileSelected(lang: 'es' | 'en', event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const okType = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!okType || file.size > 5 * 1024 * 1024) {
      this.patchCv(lang, {
        dataUrl: null, fileName: '',
        status: 'error', error: this.i18n.t('admin.profile.cv.invalid')
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.patchCv(lang, {
        dataUrl: String(reader.result || ''), fileName: file.name,
        status: 'idle', error: ''
      });
    };
    reader.readAsDataURL(file);
  }

  uploadCv(lang: 'es' | 'en'): void {
    const current = this.cvState()[lang];
    if (!current.dataUrl || current.uploading) return;
    this.patchCv(lang, { uploading: true, status: 'idle', error: '' });
    this.adminService.uploadCv(lang, current.dataUrl).subscribe({
      next: (res) => {
        this.cvMeta.update(m => ({
          ...m,
          [lang]: { ...m[lang], custom: true, updated_at: res?.updated_at ?? Date.now() }
        }));
        this.patchCv(lang, { uploading: false, status: 'saved', dataUrl: null, fileName: '' });
        setTimeout(() => this.patchCv(lang, { status: 'idle' }), 4000);
      },
      error: (err) => {
        this.patchCv(lang, {
          uploading: false, status: 'error',
          error: err?.error?.message || this.i18n.t('admin.profile.cv.error')
        });
        console.error(err);
      }
    });
  }

  cancelEditProfileTexts(): void {
    if (this.profileSavingTexts()) return;
    this.editingProfileTexts.set(null);
    this.profileTextsStatus.set('idle');
    this.profileTextsError.set('');
  }

  saveProfileTexts(): void {
    const payload = this.editingProfileTexts();
    if (this.profileSavingTexts() || !payload) return;
    this.profileSavingTexts.set(true);
    this.profileTextsStatus.set('idle');
    this.adminService.updateProfileTexts(payload).subscribe({
      next: (res) => {
        this.applyProfileData(res);
        this.profileSavingTexts.set(false);
        this.profileTextsStatus.set('saved');
        this.editingProfileTexts.set(null);
      },
      error: (err) => {
        this.profileSavingTexts.set(false);
        this.profileTextsStatus.set('error');
        this.profileTextsError.set(err?.error?.message || this.i18n.t('admin.profile.texts.error'));
        console.error(err);
      }
    });
  }

  startEditChatbotPrompt(): void {
    this.editingChatbotPrompt.set(this.chatbotPrompt() || '');
    this.chatbotPromptStatus.set('idle');
    this.chatbotPromptError.set('');
  }

  cancelEditChatbotPrompt(): void {
    if (this.chatbotPromptSaving()) return;
    this.editingChatbotPrompt.set(null);
    this.chatbotPromptStatus.set('idle');
    this.chatbotPromptError.set('');
  }

  resetEditingChatbotPrompt(): void {
    const def = this.chatbotPromptDefault();
    if (!def || this.editingChatbotPrompt() === null) return;
    this.editingChatbotPrompt.set(def);
    this.chatbotPromptStatus.set('idle');
    this.chatbotPromptError.set('');
  }

  saveChatbotPrompt(): void {
    const value = this.editingChatbotPrompt();
    if (this.chatbotPromptSaving() || value === null) return;
    const trimmed = (value || '').trim();
    if (!trimmed) {
      this.chatbotPromptStatus.set('error');
      this.chatbotPromptError.set(this.i18n.t('admin.profile.chatbot.empty'));
      return;
    }
    this.chatbotPromptSaving.set(true);
    this.chatbotPromptStatus.set('idle');
    this.adminService.updateChatbotPrompt(value).subscribe({
      next: (res) => {
        this.chatbotPrompt.set(res?.prompt ?? value);
        this.chatbotPromptSaving.set(false);
        this.chatbotPromptStatus.set('saved');
        this.editingChatbotPrompt.set(null);
      },
      error: (err) => {
        this.chatbotPromptSaving.set(false);
        this.chatbotPromptStatus.set('error');
        this.chatbotPromptError.set(err?.error?.message || this.i18n.t('admin.profile.chatbot.error'));
        console.error(err);
      }
    });
  }

  onChatbotModelChange(model: string): void {
    if (this.chatbotModelSaving()) return;
    if (!model || model === this.chatbotModel()) return;
    if (!this.chatbotModelOptions().includes(model)) return;
    const previous = this.chatbotModel();
    this.chatbotModel.set(model);
    this.chatbotModelSaving.set(true);
    this.chatbotModelStatus.set('idle');
    this.chatbotModelError.set('');
    this.adminService.updateChatbotModel(model).subscribe({
      next: (res) => {
        this.chatbotModel.set(res?.model ?? model);
        this.chatbotModelSaving.set(false);
        this.chatbotModelStatus.set('saved');
      },
      error: (err) => {
        this.chatbotModel.set(previous);
        this.chatbotModelSaving.set(false);
        this.chatbotModelStatus.set('error');
        this.chatbotModelError.set(err?.error?.message || this.i18n.t('admin.profile.chatbot.model.error'));
        console.error(err);
      }
    });
  }

  // ═══════════════════════════════════════════════════════
  //  Charts
  // ═══════════════════════════════════════════════════════
  buildCharts(): void {
    const visitorBars = this.buildDailyChart(this.visitorLogs(), 'entry_time');
    const visitorMax = Math.max(1, ...visitorBars.map(b => b.value));
    visitorBars.forEach(b => b.height = (b.value / visitorMax) * 100);
    this.visitorChart.set(visitorBars);
    this.visitorChartMax.set(visitorMax);

    const loginBars = this.buildDailyChart(this.loginLogs(), 'login_time');
    const loginMax = Math.max(1, ...loginBars.map(b => b.value));
    loginBars.forEach(b => b.height = (b.value / loginMax) * 100);
    this.loginChart.set(loginBars);
    this.loginChartMax.set(loginMax);

    this.buildLineChart();
    this.buildTokensLineChart();
  }

  private buildLineChart(): void {
    const { w, h, padL, padR, padT, padB } = this.lineChart();
    const visBars = this.visitorChart();
    const logBars = this.loginChart();
    const n = Math.max(visBars.length, logBars.length);
    if (n === 0) {
      this.visitorPoints.set([]);
      this.loginPoints.set([]);
      this.visitorLinePath.set('');
      this.loginLinePath.set('');
      this.visitorAreaPath.set('');
      this.loginAreaPath.set('');
      this.lineChartTicks.set([]);
      this.lineChartXAxis.set([]);
      return;
    }

    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const stepX = n > 1 ? innerW / (n - 1) : 0;

    const rawMax = Math.max(
      1,
      ...visBars.map(b => b.value),
      ...logBars.map(b => b.value)
    );
    const niceMax = this.niceCeil(rawMax);
    this.lineChartMax.set(niceMax);

    const project = (series: ChartBar[]) =>
      series.map((b, i) => ({
        x: padL + i * stepX,
        y: padT + innerH - (b.value / niceMax) * innerH,
        value: b.value,
        label: b.label,
        date: b.date
      }));

    const vp = project(visBars);
    const lp = project(logBars);
    this.visitorPoints.set(vp);
    this.loginPoints.set(lp);

    this.visitorLinePath.set(this.buildSmoothPath(vp));
    this.loginLinePath.set(this.buildSmoothPath(lp));
    this.visitorAreaPath.set(this.buildAreaPath(vp, padT + innerH));
    this.loginAreaPath.set(this.buildAreaPath(lp, padT + innerH));

    const ticks: ChartTick[] = [];
    const tickCount = 4;
    for (let i = 0; i <= tickCount; i++) {
      const value = Math.round((niceMax * (tickCount - i)) / tickCount);
      ticks.push({ y: padT + (innerH * i) / tickCount, value });
    }
    this.lineChartTicks.set(ticks);

    this.lineChartXAxis.set(visBars.map((b, i) => ({
      x: padL + i * stepX,
      label: (i % 2 === 0 || i === n - 1) ? b.label : '',
      date: b.date
    })));
  }

  private buildTokensLineChart(): void {
    const { w, h, padL, padR, padT, padB } = this.tokensChart();

    // Últimos 14 días
    const days = 14;
    const buckets: Record<string, number> = {};
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      buckets[d.toISOString().substring(0, 10)] = 0;
    }

    const tokenMsgs = this.chatbotMessages().filter(m => m.created_at && m.tokens_used);
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
    this.tokensChartMax.set(niceMax);

    const tp = series.map((s, i) => ({
      x: padL + i * stepX,
      y: padT + innerH - (s.value / niceMax) * innerH,
      value: s.value,
      label: s.label,
      date: s.date
    }));
    this.tokensPoints.set(tp);

    this.tokensLinePath.set(this.buildSmoothPath(tp));
    this.tokensAreaPath.set(this.buildAreaPath(tp, padT + innerH));

    const ticks: ChartTick[] = [];
    const tickCount = 4;
    for (let i = 0; i <= tickCount; i++) {
      const value = Math.round((niceMax * (tickCount - i)) / tickCount);
      ticks.push({ y: padT + (innerH * i) / tickCount, value });
    }
    this.tokensChartTicks.set(ticks);

    this.tokensChartXAxis.set(series.map((s, i) => ({
      x: padL + i * stepX,
      label: (i % 2 === 0 || i === n - 1) ? s.label : '',
      date: s.date
    })));
  }

  onChartHover(i: number | null): void { this.hoverIndex.set(i); }
  onTokensChartHover(i: number | null): void { this.tokensHoverIndex.set(i); }

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

  // Estima el ancho del tooltip basándose en el texto más largo. Usa la
  // razón ancho/em típica de la fuente Inter (≈0.58) más los paddings.
  private computeTooltipWidth(lines: { text: string; fontPx: number; leftPad: number; rightPad: number }[]): number {
    const charRatio = 0.58;
    let max = 0;
    for (const ln of lines) {
      const w = ln.leftPad + ln.text.length * ln.fontPx * charRatio + ln.rightPad;
      if (w > max) max = w;
    }
    return Math.ceil(max);
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

  // ═══════════════════════════════════════════════════════
  //  Tabs / menú
  // ═══════════════════════════════════════════════════════
  setActiveTab(tab: AdminTab): void {
    if (tab === this.activeTab()) {
      this.mobileMenuOpen.set(false);
      return;
    }
    this.activeTab.set(tab);
    this.editingProject.set(null);
    this.editingExperience.set(null);
    this.editingUser.set(null);
    this.editingEducation.set(null);
    this.editingSkills.set(null);
    this.mobileMenuOpen.set(false);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  // ═══════════════════════════════════════════════════════
  //  Users
  // ═══════════════════════════════════════════════════════
  changeRole(user: AdminUser, role: AdminUser['role']): void {
    if (user.role === role) return;
    this.adminService.updateUserRole(user.id, role).subscribe({
      next: () => {
        this.users.update(list => list.map(u => u.id === user.id ? { ...u, role } : u));
      },
      error: (err) => { alert(this.i18n.t('admin.error.role')); console.error(err); }
    });
  }

  editUser(u: AdminUser): void {
    if (!this.isAdmin()) return;
    this.editingUser.set({ ...u, _original: u });
  }

  saveUser(): void {
    const u = this.editingUser();
    if (!u) return;
    const isSelf = u.email === this.currentUserEmail() || u._original?.email === this.currentUserEmail();
    const canEditRole = this.isAdmin() && !isSelf;
    const payload: { email: string; role?: AdminUser['role'] } = { email: u.email };
    if (canEditRole) payload.role = u.role;

    const list = this.users();
    const idx = list.findIndex(x => x.id === u.id);
    const prev = idx >= 0 ? list : null;
    if (idx >= 0) {
      const updated = { ...list[idx], email: u.email };
      if (canEditRole) updated.role = u.role;
      this.users.set([
        ...list.slice(0, idx),
        updated,
        ...list.slice(idx + 1)
      ]);
    }
    this.editingUser.set(null);

    this.adminService.updateUser(u.id, payload).subscribe({
      error: (err) => {
        if (idx >= 0 && prev) {
          this.users.set(prev);
        }
        const msg = err?.error?.message || this.i18n.t('admin.error.user.update');
        alert(msg);
        console.error(err);
      }
    });
  }

  cancelUserEdit(): void { this.editingUser.set(null); }

  deleteUser(u: AdminUser): void {
    if (!this.isAdmin()) return;
    if (u.email === this.currentUserEmail()) {
      alert(this.i18n.t('admin.error.self.delete'));
      return;
    }
    this.askConfirm(
      this.i18n.t('admin.confirm.user.title'),
      this.i18n.t('admin.confirm.user.msg', { name: u.email }),
      () => {
        const prev = this.users();
        this.users.set(prev.filter(x => x.id !== u.id));
        this.adminService.deleteUser(u.id).subscribe({
          error: (err) => {
            this.users.set(prev);
            const msg = err?.error?.message || this.i18n.t('admin.error.user.delete');
            alert(msg);
            console.error(err);
          }
        });
      }
    );
  }

  // ═══════════════════════════════════════════════════════
  //  Projects
  // ═══════════════════════════════════════════════════════
  newProject(): void {
    this.editingProject.set({
      id: null,
      title: '', title_en: '', description: '', description_en: '',
      project_date: '', repo_url: '', live_url: '',
      tags: '', is_featured: false,
      project_type: 'web', status: '',
      images: []
    });
    this.projectImagesUploading.set(0);
    this.projectImagesUploadError.set('');
  }

  editProject(p: any): void {
    if (p?.notebook_url) {
      this.editNotebook(p);
      return;
    }
    const images = Array.isArray(p.images) ? p.images.map((img: any) => ({ ...img })) : [];
    this.editingProject.set({
      ...p,
      project_date: p.project_date ? p.project_date.substring(0, 10) : '',
      images
    });
    this.projectImagesUploading.set(0);
    this.projectImagesUploadError.set('');
  }

  //  Notebooks (.ipynb)
  newNotebook(): void {
    this.editingNotebook.set({
      id: null,
      title: '', title_en: '', description: '', description_en: '',
      project_date: '', tags: '', is_featured: false,
      notebook_url: '', project_type: 'ai', status: '',
      repo_url: null, live_url: null, images: []
    });
  }

  editNotebook(p: any): void {
    this.editingNotebook.set({
      ...p,
      project_type: 'ai',
      notebook_url: p.notebook_url || '',
      project_date: p.project_date ? p.project_date.substring(0, 10) : '',
      images: []
    });
  }

  cancelNotebookEdit(): void { this.editingNotebook.set(null); }

  notebookLinkValid(): boolean {
    return isNotebookUrl(this.editingNotebook()?.notebook_url);
  }

  notebookLinkName(): string {
    const ref = parseNotebookUrl(this.editingNotebook()?.notebook_url);
    return ref && /\.ipynb$/i.test(ref.path) ? notebookName(ref) : '';
  }

  saveNotebook(): void {
    const n = this.editingNotebook();
    if (!n || !this.notebookLinkValid()) return;
    const payload = {
      ...n,
      project_type: 'ai',
      images: [],
      repo_url: n.repo_url ?? null,
      live_url: n.live_url ?? null
    };
    this.editingNotebook.set(null);

    if (payload.id) {
      const list = this.projects();
      const idx = list.findIndex(x => x.id === payload.id);
      const prev = idx >= 0 ? list[idx] : null;
      if (idx >= 0) {
        this.projects.set([
          ...list.slice(0, idx),
          { ...list[idx], ...payload },
          ...list.slice(idx + 1)
        ]);
      }
      this.adminService.updateProject(payload.id, payload).subscribe({
        error: (err) => {
          if (idx >= 0 && prev) {
            const cur = this.projects();
            this.projects.set([
              ...cur.slice(0, idx),
              prev,
              ...cur.slice(idx + 1)
            ]);
          }
          alert(this.i18n.t('admin.error.project.save'));
          console.error(err);
        }
      });
    } else {
      this.adminService.createProject(payload).subscribe({
        next: (res: any) => {
          this.projects.set([{ ...payload, id: res?.id }, ...this.projects()]);
        },
        error: (err) => { alert(this.i18n.t('admin.error.project.create')); console.error(err); }
      });
    }
  }

  // ─── Galería del proyecto en edición ───
  onProjectImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    input.value = '';
    this.processProjectImageFiles(list);
  }

  onProjectGalleryDrop(event: DragEvent): void {
    event.preventDefault();
    this.galleryDragOver.set(false);
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    this.processProjectImageFiles(Array.from(files));
  }

  onProjectGalleryDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.galleryDragOver.set(true);
  }

  onProjectGalleryDragLeave(): void {
    this.galleryDragOver.set(false);
  }

  private processProjectImageFiles(files: File[]): void {
    if (files.length === 0) return;
    this.projectImagesUploadError.set('');
    const projectId = this.editingProject()?.id ?? null;
    this.uploadProjectImagesQueue(files, projectId);
  }

  private uploadProjectImagesQueue(queue: File[], projectId: number | null): void {
    if (queue.length === 0) return;
    const file = queue.shift()!;
    if (!AdminStateService.PROJECT_IMG_MIME_RE.test(file.type)) {
      this.projectImagesUploadError.set(this.i18n.t('admin.projects.gallery.upload.invalid'));
      this.uploadProjectImagesQueue(queue, projectId);
      return;
    }
    if (file.size > AdminStateService.PROJECT_IMG_MAX_BYTES) {
      this.projectImagesUploadError.set(this.i18n.t('admin.projects.gallery.upload.toobig'));
      this.uploadProjectImagesQueue(queue, projectId);
      return;
    }
    this.projectImagesUploading.update(n => n + 1);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      this.adminService.uploadProjectImage(dataUrl, projectId).subscribe({
        next: (res) => {
          const editing = this.editingProject();
          if (editing) {
            if (!Array.isArray(editing.images)) editing.images = [];
            editing.images.push({
              url: res.url,
              position: editing.images.length
            });
            this.editingProject.set({ ...editing });
          }
          this.projectImagesUploading.update(n => n - 1);
          this.uploadProjectImagesQueue(queue, projectId);
        },
        error: (err) => {
          this.projectImagesUploading.update(n => n - 1);
          this.projectImagesUploadError.set(
            err?.error?.message || this.i18n.t('admin.projects.gallery.upload.error')
          );
          console.error(err);
          this.uploadProjectImagesQueue(queue, projectId);
        }
      });
    };
    reader.onerror = () => {
      this.projectImagesUploading.update(n => n - 1);
      this.projectImagesUploadError.set(this.i18n.t('admin.projects.gallery.upload.error'));
      this.uploadProjectImagesQueue(queue, projectId);
    };
    reader.readAsDataURL(file);
  }

  removeProjectImage(i: number): void {
    const editing = this.editingProject();
    if (!editing?.images) return;
    editing.images.splice(i, 1);
    this.reindexImagePositions();
    this.editingProject.set({ ...editing });
  }

  private reindexImagePositions(): void {
    const arr = this.editingProject()?.images;
    if (!Array.isArray(arr)) return;
    arr.forEach((img: any, idx: number) => { img.position = idx; });
  }

  saveProject(): void {
    const p = this.editingProject();
    if (!p) return;
    const payload = { ...p };
    this.editingProject.set(null);

    if (payload.id) {
      const list = this.projects();
      const idx = list.findIndex(x => x.id === payload.id);
      const prev = idx >= 0 ? list[idx] : null;
      if (idx >= 0) {
        this.projects.set([
          ...list.slice(0, idx),
          { ...list[idx], ...payload },
          ...list.slice(idx + 1)
        ]);
      }
      this.adminService.updateProject(payload.id, payload).subscribe({
        error: (err) => {
          if (idx >= 0 && prev) {
            const cur = this.projects();
            this.projects.set([
              ...cur.slice(0, idx),
              prev,
              ...cur.slice(idx + 1)
            ]);
          }
          alert(this.i18n.t('admin.error.project.save'));
          console.error(err);
        }
      });
    } else {
      this.adminService.createProject(payload).subscribe({
        next: (res: any) => {
          const promoted = Array.isArray(res?.images) ? res.images : payload.images;
          const created = { ...payload, id: res?.id, images: promoted };
          this.projects.set([created, ...this.projects()]);
        },
        error: (err) => { alert(this.i18n.t('admin.error.project.create')); console.error(err); }
      });
    }
  }

  cancelProjectEdit(): void { this.editingProject.set(null); }

  toggleProjectFeatured(p: any): void {
    const next = !p.is_featured;
    const prev = p.is_featured;
    this.projects.update(list => list.map(x =>
      x.id === p.id ? { ...x, is_featured: next } : x
    ));
    this.adminService.updateProjectFeatured(p.id, next).subscribe({
      error: (err) => {
        this.projects.update(list => list.map(x =>
          x.id === p.id ? { ...x, is_featured: prev } : x
        ));
        alert(this.i18n.t('admin.error.project.save'));
        console.error(err);
      }
    });
  }

  deleteProject(p: any): void {
    if (!this.isAdmin()) return;
    this.askConfirm(
      this.i18n.t('admin.confirm.project.title'),
      this.i18n.t('admin.confirm.project.msg', { name: p.title }),
      () => {
        const prev = this.projects();
        this.projects.set(prev.filter(x => x.id !== p.id));
        this.adminService.deleteProject(p.id).subscribe({
          error: (err) => {
            this.projects.set(prev);
            alert(this.i18n.t('admin.error.project.delete'));
            console.error(err);
          }
        });
      },
      undefined,
      true
    );
  }

  reorderProjectImages(previousIndex: number, currentIndex: number): void {
    const project = this.editingProject();
    if (!project || !project.images) return;
    const newImages = [...project.images];
    moveItemInArray(newImages, previousIndex, currentIndex);
    this.editingProject.set({
      ...project,
      images: newImages
    });
    this.reindexImagePositions();
  }

  // ═══════════════════════════════════════════════════════
  //  Experience
  // ═══════════════════════════════════════════════════════
  newExperience(): void {
    this.editingExperience.set({
      id: null,
      start_date: '', end_date: '', title: '', title_en: '', company: '',
      contract_type: '', contract_type_en: '', description: '', description_en: '',
      location: '', location_en: '', tags: ''
    });
  }

  editExperience(e: any): void {
    this.editingExperience.set({
      ...e,
      start_date: e.start_date ? e.start_date.substring(0, 10) : '',
      end_date: e.end_date ? e.end_date.substring(0, 10) : ''
    });
  }

  saveExperience(): void {
    const e = this.editingExperience();
    if (!e) return;
    const payload = { ...e };
    this.editingExperience.set(null);

    if (payload.id) {
      const list = this.experiences();
      const idx = list.findIndex(x => x.id === payload.id);
      const prev = idx >= 0 ? list[idx] : null;
      if (idx >= 0) {
        this.experiences.set([
          ...list.slice(0, idx),
          { ...list[idx], ...payload },
          ...list.slice(idx + 1)
        ]);
      }
      this.adminService.updateExperience(payload.id, payload).subscribe({
        error: (err) => {
          if (idx >= 0 && prev) {
            const cur = this.experiences();
            this.experiences.set([
              ...cur.slice(0, idx),
              prev,
              ...cur.slice(idx + 1)
            ]);
          }
          alert(this.i18n.t('admin.error.experience.save'));
          console.error(err);
        }
      });
    } else {
      this.adminService.createExperience(payload).subscribe({
        next: (res: any) => {
          const created = { ...payload, id: res?.id };
          this.experiences.set([created, ...this.experiences()]);
        },
        error: (err) => { alert(this.i18n.t('admin.error.experience.create')); console.error(err); }
      });
    }
  }

  cancelExperienceEdit(): void { this.editingExperience.set(null); }

  deleteExperience(e: any): void {
    if (!this.isAdmin()) return;
    this.askConfirm(
      this.i18n.t('admin.confirm.experience.title'),
      this.i18n.t('admin.confirm.experience.msg', { name: e.title }),
      () => {
        const prev = this.experiences();
        this.experiences.set(prev.filter(x => x.id !== e.id));
        this.adminService.deleteExperience(e.id).subscribe({
          error: (err) => {
            this.experiences.set(prev);
            alert(this.i18n.t('admin.error.experience.delete'));
            console.error(err);
          }
        });
      },
      undefined,
      true
    );
  }

  // ═══════════════════════════════════════════════════════
  //  Messages
  // ═══════════════════════════════════════════════════════
  toggleAnswered(m: any): void {
    const next = !m.is_answered;
    const prev = m.is_answered;
    this.messages.update(list => list.map(x =>
      x.id === m.id ? { ...x, is_answered: next } : x
    ));
    this.adminService.updateContactMessageAnswered(m.id, next).subscribe({
      error: (err) => {
        this.messages.update(list => list.map(x =>
          x.id === m.id ? { ...x, is_answered: prev } : x
        ));
        alert(this.i18n.t('admin.error.message.update'));
        console.error(err);
      }
    });
  }

  deleteMessage(m: any): void {
    if (!this.isAdmin()) return;
    this.askConfirm(
      this.i18n.t('admin.confirm.message.title'),
      this.i18n.t('admin.confirm.message.msg', { name: m.name }),
      () => {
        const prev = this.messages();
        this.messages.set(prev.filter(x => x.id !== m.id));
        this.adminService.deleteContactMessage(m.id).subscribe({
          error: (err) => {
            this.messages.set(prev);
            alert(this.i18n.t('admin.error.message.delete'));
            console.error(err);
          }
        });
      }
    );
  }

  deleteVisitorLog(v: any): void {
    if (!this.isAdmin()) return;
    this.askConfirm(
      this.i18n.t('admin.confirm.visitor.title'),
      this.i18n.t('admin.confirm.visitor.msg', {
        ip: v.ip_address || '—',
        date: new Date(v.entry_time).toLocaleString()
      }),
      () => {
        const prev = this.visitorLogs();
        this.visitorLogs.set(prev.filter(x => x.id !== v.id));
        this.buildCharts();
        this.adminService.deleteVisitorLog(v.id).subscribe({
          error: (err) => {
            this.visitorLogs.set(prev);
            this.buildCharts();
            alert(this.i18n.t('admin.error.visitor.delete'));
            console.error(err);
          }
        });
      }
    );
  }

  deleteLoginLog(l: any): void {
    if (!this.isAdmin()) return;
    this.askConfirm(
      this.i18n.t('admin.confirm.login.title'),
      this.i18n.t('admin.confirm.login.msg', {
        email: l.email || '—',
        date: new Date(l.login_time).toLocaleString()
      }),
      () => {
        const prev = this.loginLogs();
        this.loginLogs.set(prev.filter(x => x.id !== l.id));
        this.buildCharts();
        this.adminService.deleteLoginLog(l.id).subscribe({
          error: (err) => {
            this.loginLogs.set(prev);
            this.buildCharts();
            alert(this.i18n.t('admin.error.login.delete'));
            console.error(err);
          }
        });
      }
    );
  }

  // ═══════════════════════════════════════════════════════
  //  Confirm modal
  // ═══════════════════════════════════════════════════════
  private askConfirm(title: string, message: string, onConfirm: () => void, confirmLabel?: string, messageHtml = false): void {
    this.confirmModal.set({
      title,
      message,
      confirmLabel: confirmLabel ?? this.i18n.t('admin.action.delete'),
      onConfirm,
      messageHtml
    });
  }

  confirmAction(): void {
    const cb = this.confirmModal()?.onConfirm;
    this.confirmModal.set(null);
    if (cb) cb();
  }

  cancelConfirm(): void {
    this.confirmModal.set(null);
  }

  // ═══════════════════════════════════════════════════════
  //  Sorting
  // ═══════════════════════════════════════════════════════
  toggleSort(table: SortTable, col: string): void {
    this.sortState.update(state => {
      const cur = state[table];
      const next: SortState = cur.col === col
        ? { col, dir: cur.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' };
      return { ...state, [table]: next };
    });
  }

  setSortCol(table: SortTable, col: string): void {
    this.sortState.update(state => ({
      ...state,
      [table]: { ...state[table], col }
    }));
  }

  toggleSortDir(table: SortTable): void {
    this.sortState.update(state => ({
      ...state,
      [table]: {
        ...state[table],
        dir: state[table].dir === 'asc' ? 'desc' : 'asc'
      }
    }));
  }

  sortDir(table: SortTable, col: string): SortDir | null {
    const s = this.sortState()[table];
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
      const aBoolish = typeof av === 'number' || typeof av === 'boolean';
      const bBoolish = typeof bv === 'number' || typeof bv === 'boolean';
      if (aBoolish && bBoolish) {
        return (Number(av) - Number(bv)) * mult;
      }
      if (typeof av === 'string' && typeof bv === 'string' && dateRe.test(av) && dateRe.test(bv)) {
        const ad = Date.parse(av);
        const bd = Date.parse(bv);
        if (!isNaN(ad) && !isNaN(bd)) return (ad - bd) * mult;
      }
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * mult;
    });
  }

  // ═══════════════════════════════════════════════════════
  //  Chatbot conversations
  // ═══════════════════════════════════════════════════════
  toggleConversation(key: string): void {
    this.expandedConversation.update(cur => cur === key ? null : key);
  }

  deleteChatbotMsg(m: any): void {
    if (!this.isAdmin()) return;
    this.askConfirm(
      this.i18n.t('admin.chatbot.confirm.msg.title'),
      this.i18n.t('admin.chatbot.confirm.msg.body'),
      () => {
        const prev = this.chatbotMessages();
        this.chatbotMessages.set(prev.filter(x => x.id !== m.id));
        this.adminService.deleteChatbotMessage(m.id).subscribe({
          error: (err) => {
            this.chatbotMessages.set(prev);
            alert(this.i18n.t('admin.error.chatbot.delete'));
            console.error(err);
          }
        });
      }
    );
  }

  deleteChatbotConvo(convo: { messages: any[]; key: string }): void {
    if (!this.isAdmin()) return;
    this.askConfirm(
      this.i18n.t('admin.chatbot.confirm.convo.title'),
      this.i18n.t('admin.chatbot.confirm.convo.body'),
      () => {
        const ids = convo.messages.map((m: any) => m.id);
        const idSet = new Set(ids);
        const prev = this.chatbotMessages();
        this.chatbotMessages.set(prev.filter(x => !idSet.has(x.id)));
        if (this.expandedConversation() === convo.key) this.expandedConversation.set(null);
        this.adminService.deleteChatbotConversation(ids).subscribe({
          error: (err) => {
            this.chatbotMessages.set(prev);
            alert(this.i18n.t('admin.error.chatbot.delete'));
            console.error(err);
          }
        });
      }
    );
  }

  // ═══════════════════════════════════════════════════════
  //  Education
  // ═══════════════════════════════════════════════════════
  newEducation(): void {
    this.editingEducation.set({ id: null, start_date: '', end_date: '', title: '', title_en: '', location: '' });
  }

  editEducation(e: any): void {
    this.editingEducation.set({
      ...e,
      start_date: e.start_date ? e.start_date.substring(0, 10) : '',
      end_date: e.end_date ? e.end_date.substring(0, 10) : ''
    });
  }

  saveEducation(): void {
    const e = this.editingEducation();
    if (!e) return;
    const payload = { ...e };
    this.editingEducation.set(null);

    if (payload.id) {
      const list = this.educations();
      const idx = list.findIndex(x => x.id === payload.id);
      const prev = idx >= 0 ? list[idx] : null;
      if (idx >= 0) this.educations.set([...list.slice(0, idx), { ...list[idx], ...payload }, ...list.slice(idx + 1)]);
      this.adminService.updateEducation(payload.id, payload).subscribe({
        error: (err) => {
          if (idx >= 0 && prev) {
            const cur = this.educations();
            this.educations.set([...cur.slice(0, idx), prev, ...cur.slice(idx + 1)]);
          }
          alert(this.i18n.t('admin.error.education.save'));
          console.error(err);
        }
      });
    } else {
      this.adminService.createEducation(payload).subscribe({
        next: (res: any) => {
          const created = { ...payload, id: res?.id };
          this.educations.set([created, ...this.educations()]);
        },
        error: (err) => { alert(this.i18n.t('admin.error.education.create')); console.error(err); }
      });
    }
  }

  cancelEducationEdit(): void { this.editingEducation.set(null); }

  deleteEducation(e: any): void {
    if (!this.isAdmin()) return;
    this.askConfirm(
      this.i18n.t('admin.confirm.education.title'),
      this.i18n.t('admin.confirm.education.msg', { name: e.title }),
      () => {
        const prev = this.educations();
        this.educations.set(prev.filter(x => x.id !== e.id));
        this.adminService.deleteEducation(e.id).subscribe({
          error: (err) => {
            this.educations.set(prev);
            alert(this.i18n.t('admin.error.education.delete'));
            console.error(err);
          }
        });
      }
    );
  }

  

  // ═══════════════════════════════════════════════════════
  //  Skills
  // ═══════════════════════════════════════════════════════
  startEditSkills(): void {
    const draft: Record<string, string> = {};
    for (const c of this.skillCategories) {
      draft[c.tipo] = this.getSkillTags(c.tipo).join(', ');
    }
    this.editingSkills.set(draft);
    this.skillsStatus.set('idle');
    this.skillsError.set('');
  }

  cancelEditSkills(): void {
    if (this.skillsSaving()) return;
    this.editingSkills.set(null);
    this.skillsStatus.set('idle');
    this.skillsError.set('');
  }

  saveSkills(): void {
    const draft = this.editingSkills();
    if (!draft || this.skillsSaving()) return;
    this.skillsSaving.set(true);
    this.skillsStatus.set('idle');

    const ops = this.skillCategories.map(c => {
      const tags = (draft[c.tipo] || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      const existing = this.skills().find(s => s.tipo === c.tipo);
      return { tipo: c.tipo, tags, existing };
    });

    let pending = ops.length;
    let hadError = false;
    const finish = () => {
      pending--;
      if (pending > 0) return;
      this.skillsSaving.set(false);
      if (hadError) {
        this.skillsStatus.set('error');
        this.skillsError.set(this.i18n.t('admin.error.skills.save'));
      } else {
        this.skillsStatus.set('saved');
        this.editingSkills.set(null);
      }
    };

    for (const op of ops) {
      if (op.existing) {
        this.adminService.updateSkill(op.existing.id, { tipo: op.tipo, tags: op.tags }).subscribe({
          next: () => {
            this.skills.update(list => list.map(s =>
              s.id === op.existing.id ? { ...s, tags: op.tags } : s
            ));
            finish();
          },
          error: (err) => { hadError = true; console.error(err); finish(); }
        });
      } else {
        this.adminService.createSkill({ tipo: op.tipo, tags: op.tags }).subscribe({
          next: (res: any) => {
            this.skills.update(list => [...list, { id: res?.id, tipo: op.tipo, tags: op.tags }]);
            finish();
          },
          error: (err) => { hadError = true; console.error(err); finish(); }
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  //  Misc helpers
  // ═══════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════
  // Backup BD
  // ═══════════════════════════════════════════════════════
  async downloadDbBackup(): Promise<void> {
    if (this.backupDownloading()) return;
    this.backupDownloading.set(true);
    this.backupStatus.set('idle');
    this.backupError.set('');

    try {
      const res = await fetch(`${environment.apiUrl}/admin/backup`, {
        method: 'GET',
        credentials: 'include'
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || `HTTP ${res.status}`);
      }

      const dispo = res.headers.get('Content-Disposition') || '';
      const match = /filename="?([^";]+)"?/i.exec(dispo);
      const filename = match?.[1] ?? `backup-${Date.now()}.sql`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.backupStatus.set('saved');
      setTimeout(() => this.backupStatus.set('idle'), 3500);
    } catch (err: any) {
      console.error('[admin] backup error', err);
      this.backupError.set(err?.message || 'Error');
      this.backupStatus.set('error');
    } finally {
      this.backupDownloading.set(false);
    }
  }

  // ═══════════════════════════════════════════════════════
  // Backup a Google Drive
  // ═══════════════════════════════════════════════════════
  async uploadDriveBackup(): Promise<void> {
    if (this.driveBackupUploading()) return;
    this.driveBackupUploading.set(true);
    this.driveBackupStatus.set('idle');
    this.driveBackupError.set('');

    try {
      const res = await fetch(`${environment.apiUrl}/admin/backup/drive`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || `HTTP ${res.status}`);
      }
      this.driveBackupStatus.set('saved');
      setTimeout(() => this.driveBackupStatus.set('idle'), 4000);
    } catch (err: any) {
      console.error('[admin] drive backup error', err);
      this.driveBackupError.set(err?.message || 'Error');
      this.driveBackupStatus.set('error');
    } finally {
      this.driveBackupUploading.set(false);
    }
  }

  // ═══════════════════════════════════════════════════════
  // Restaurar BD
  // ═══════════════════════════════════════════════════════
  onRestoreFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.askConfirm(
      this.i18n.t('admin.profile.restore.confirm.title'),
      this.i18n.t('admin.profile.restore.confirm.message').replace('{file}', file.name),
      () => this.uploadRestore(file),
      this.i18n.t('admin.profile.restore.button')
    );
  }

  private async uploadRestore(file: File): Promise<void> {
    if (this.restoreUploading()) return;
    this.restoreUploading.set(true);
    this.restoreStatus.set('idle');
    this.restoreError.set('');

    try {
      const sql = await file.text();
      const res = await fetch(`${environment.apiUrl}/admin/restore`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/sql' },
        body: sql
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || data?.message || `HTTP ${res.status}`);
      }
      this.restoreStatus.set('saved');
      setTimeout(() => this.restoreStatus.set('idle'), 5000);
      this.loadAllData();
    } catch (err: any) {
      console.error('[admin] restore error', err);
      this.restoreError.set(err?.message || 'Error');
      this.restoreStatus.set('error');
    } finally {
      this.restoreUploading.set(false);
    }
  }
}