import { Component } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

interface RedmineUser {
  id: number;
  name: string;
  login?: string;
  firstname?: string;
  lastname?: string;
  mail?: string;
  created_on?: string;
  updated_on?: string;
  last_login_on?: string;
  status?: number;
}

interface RedmineIssue {
  id: number;
  subject: string;
  description?: string;
  status?: { id: number; name: string };
  author?: RedmineUser;
  assigned_to?: RedmineUser;
  created_on?: string;
  updated_on?: string;
  tracker?: { id: number; name: string };
  priority?: { id: number; name: string };
  project?: { id: number; name: string };
  category?: { id: number; name: string };
  fixed_version?: { id: number; name: string };
  parent?: { id: number };
  estimated_hours?: number;
  spent_hours?: number;
  done_ratio?: number;
  start_date?: string;
  due_date?: string;
  attachments?: RedmineAttachment[];
  journals?: RedmineJournal[];
  watchers?: RedmineUser[];
  children?: RedmineIssue[];
  relations?: RedmineRelation[];
}

interface RedmineIssuesResponse {
  issues: RedmineIssue[];
  total_count: number;
  offset: number;
  limit: number;
}

interface RedmineIssueResponse {
  issue: RedmineIssue;
}

interface RedmineAttachment {
  id: number;
  filename: string;
  filesize: number;
  content_type: string;
  description?: string;
  content_url: string;
  author: RedmineUser;
  created_on: string;
}

interface RedmineJournal {
  id: number;
  user: RedmineUser;
  notes?: string;
  created_on: string;
  private_notes?: boolean;
  details?: Array<{
    property: string;
    name: string;
    old_value?: string;
    new_value?: string;
  }>;
}

interface RedmineRelation {
  id: number;
  issue_id: number;
  issue_to_id: number;
  relation_type: string;
  delay?: number;
}

interface RedmineProject {
  id: number;
  name: string;
  identifier: string;
  description?: string;
  status?: number;
  is_public?: boolean;
  created_on?: string;
  updated_on?: string;
}

interface RedmineProjectsResponse {
  projects: RedmineProject[];
  total_count: number;
  offset: number;
  limit: number;
}

interface RedmineUsersResponse {
  users: RedmineUser[];
  total_count: number;
  offset: number;
  limit: number;
}

interface RedminePriority {
  id: number;
  name: string;
  is_default?: boolean;
}

interface RedminePrioritiesResponse {
  issue_priorities: RedminePriority[];
}

interface RedmineCategory {
  id: number;
  name: string;
  project?: { id: number; name: string };
  assigned_to?: RedmineUser;
}

interface RedmineCategoriesResponse {
  issue_categories: RedmineCategory[];
}

interface RedmineTracker {
  id: number;
  name: string;
  default_status?: { id: number; name: string };
}

interface RedmineTrackersResponse {
  trackers: RedmineTracker[];
}

interface RedmineUploadResponse {
  upload: {
    id: number;
    token: string;
  };
}

interface RedmineUpload {
  token: string;
  filename: string;
  content_type: string;
  description?: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'testApiRedmine';

  baseUrl = '/api';
  apiKey = 'e997bd5681f236c727b306d2ca94d7998f3dc9b0';

  projectId = '';
  subject = '';
  description = '';
  assignedToId = '';
  priorityId = '';
  categoryId = '';
  trackerId = '';
  
  selectedFiles: File[] = [];
  uploadedFiles: RedmineUpload[] = [];
  
  selectedIssue: RedmineIssue | null = null;
  showModal = false;

  // Filtros de consulta
  filterType: 'author' | 'assigned' | 'all' = 'author';
  filterUserId = 'me';
  filterStatusId = '';
  filterProjectId = '';
  limit = 25;

  issues: RedmineIssue[] = [];
  projects: RedmineProject[] = [];
  users: RedmineUser[] = [];
  priorities: RedminePriority[] = [];
  categories: RedmineCategory[] = [];
  trackers: RedmineTracker[] = [];
  isCreating = false;
  isLoading = false;
  isLoadingProjects = false;
  isLoadingUsers = false;
  isLoadingPriorities = false;
  isLoadingCategories = false;
  isLoadingTrackers = false;
  isUploadingFiles = false;
  isLoadingIssueDetail = false;
  isTesting = false;
  errorMessage = '';
  successMessage = '';
  connectionInfo = '';

  constructor(private readonly http: HttpClient) {}

  testConnection(): void {
    this.resetMessages();
    this.connectionInfo = '';

    if (!this.baseUrl || !this.apiKey) {
      this.errorMessage = 'Completa baseUrl y apiKey para probar la conexión.';
      return;
    }

    // const url = `${this.normalizeBaseUrl(this.baseUrl)}`;
    const url = `${this.normalizeBaseUrl(this.baseUrl)}/projects.json`;

    this.isTesting = true;
    this.http
      .get<{
        user: RedmineUser & { login?: string; mail?: string };
      }>(url, { headers: this.buildHeaders() })
      .subscribe({
        next: (response) => {
          const user = response.user;
          this.successMessage = '✅ Conexión exitosa';
          this.connectionInfo = `Usuario: ${user.name || 'N/A'} (ID: ${user.id})${user.login ? ' - Login: ' + user.login : ''}${user.mail ? ' - Email: ' + user.mail : ''}`;
        },
        error: (error) => {
          this.isTesting = false;
          this.errorMessage = '❌ ' + this.toErrorMessage(error);
          if (error?.status === 401) {
            this.errorMessage = '❌ API Key inválida o sin permisos.';
          } else if (error?.status === 0) {
            this.errorMessage =
              '❌ No se puede conectar. Verifica la URL o problemas de CORS.';
          }
        },
        complete: () => {
          this.isTesting = false;
        },
      });
  }

  createIssue(): void {
    this.resetMessages();
    if (!this.baseUrl || !this.apiKey || !this.projectId || !this.subject) {
      this.errorMessage = 'Completa baseUrl, apiKey, projectId y subject.';
      return;
    }

    const url = `${this.normalizeBaseUrl(this.baseUrl)}/issues.json`;
    const issuePayload: Record<string, unknown> = {
      project_id: this.projectId,
      subject: this.subject,
      description: this.description,
    };

    if (this.assignedToId) {
      issuePayload['assigned_to_id'] = this.assignedToId;
    }

    if (this.priorityId) {
      issuePayload['priority_id'] = this.priorityId;
    }

    if (this.categoryId) {
      issuePayload['category_id'] = this.categoryId;
    }

    if (this.trackerId) {
      issuePayload['tracker_id'] = this.trackerId;
    }

    if (this.uploadedFiles.length > 0) {
      issuePayload['uploads'] = this.uploadedFiles.map(file => ({
        token: file.token,
        filename: file.filename,
        content_type: file.content_type,
        description: file.description
      }));
    }

    this.isCreating = true;
    this.http
      .post(url, { issue: issuePayload }, { headers: this.buildHeaders() })
      .subscribe({
        next: () => {
          this.successMessage = 'Ticket creado correctamente.';
          this.subject = '';
          this.description = '';
          this.assignedToId = '';
          this.priorityId = '';
          this.categoryId = '';
          this.trackerId = '';
          this.selectedFiles = [];
          this.uploadedFiles = [];
        },
        error: (error) => {
          this.errorMessage = this.toErrorMessage(error);
        },
        complete: () => {
          this.isCreating = false;
        },
      });
  }

  fetchIssues(): void {
    this.resetMessages();
    if (!this.baseUrl || !this.apiKey) {
      this.errorMessage = 'Completa baseUrl y apiKey.';
      return;
    }

    const url = `${this.normalizeBaseUrl(this.baseUrl)}/issues.json`;
    let params = new HttpParams().set('limit', this.limit.toString());

    // Filtrar por tipo (autor o asignado)
    if (this.filterType === 'author' && this.filterUserId) {
      params = params.set('author_id', this.filterUserId);
    } else if (this.filterType === 'assigned' && this.filterUserId) {
      params = params.set('assigned_to_id', this.filterUserId);
    }

    // Filtrar por estado
    if (this.filterStatusId) {
      params = params.set('status_id', this.filterStatusId);
    }

    // Filtrar por proyecto
    if (this.filterProjectId) {
      params = params.set('project_id', this.filterProjectId);
    }

    this.isLoading = true;
    this.http
      .get<RedmineIssuesResponse>(url, { headers: this.buildHeaders(), params })
      .subscribe({
        next: (response) => {
          this.issues = response.issues || [];
          this.successMessage = `Se encontraron ${response.total_count} tickets.`;
        },
        error: (error) => {
          this.errorMessage = this.toErrorMessage(error);
        },
        complete: () => {
          this.isLoading = false;
        },
      });
  }

  fetchProjects(): void {
    this.resetMessages();
    if (!this.baseUrl || !this.apiKey) {
      this.errorMessage = 'Completa baseUrl y apiKey.';
      return;
    }

    const url = `${this.normalizeBaseUrl(this.baseUrl)}/projects.json`;
    const params = new HttpParams().set('limit', '100');

    this.isLoadingProjects = true;
    this.http
      .get<RedmineProjectsResponse>(url, { headers: this.buildHeaders(), params })
      .subscribe({
        next: (response) => {
          this.projects = response.projects || [];
          this.successMessage = `Se encontraron ${response.total_count} proyectos.`;
        },
        error: (error) => {
          this.errorMessage = this.toErrorMessage(error);
        },
        complete: () => {
          this.isLoadingProjects = false;
        },
      });
  }

  fetchUsers(): void {
    this.resetMessages();
    if (!this.baseUrl || !this.apiKey) {
      this.errorMessage = 'Completa baseUrl y apiKey.';
      return;
    }

    const url = `${this.normalizeBaseUrl(this.baseUrl)}/users.json`;
    const params = new HttpParams().set('limit', '100');

    this.isLoadingUsers = true;
    this.http
      .get<RedmineUsersResponse>(url, { headers: this.buildHeaders(), params })
      .subscribe({
        next: (response) => {
          this.users = response.users || [];
          this.successMessage = `Se encontraron ${response.total_count} usuarios.`;
        },
        error: (error) => {
          this.isLoadingUsers = false;
          this.errorMessage = this.toErrorMessage(error);
        },
        complete: () => {
          this.isLoadingUsers = false;
        },
      });
  }

  fetchPriorities(): void {
    this.resetMessages();
    if (!this.baseUrl || !this.apiKey) {
      this.errorMessage = 'Completa baseUrl y apiKey.';
      return;
    }

    const url = `${this.normalizeBaseUrl(this.baseUrl)}/enumerations/issue_priorities.json`;

    this.isLoadingPriorities = true;
    this.http
      .get<RedminePrioritiesResponse>(url, { headers: this.buildHeaders() })
      .subscribe({
        next: (response) => {
          this.priorities = response.issue_priorities || [];
          this.successMessage = `Se encontraron ${this.priorities.length} prioridades.`;
        },
        error: (error) => {
          this.isLoadingPriorities = false;
          this.errorMessage = this.toErrorMessage(error);
        },
        complete: () => {
          this.isLoadingPriorities = false;
        },
      });
  }

  fetchCategories(): void {
    this.resetMessages();
    if (!this.baseUrl || !this.apiKey) {
      this.errorMessage = 'Completa baseUrl y apiKey.';
      return;
    }

    if (!this.projectId) {
      this.errorMessage = 'Debes seleccionar un proyecto primero para cargar sus categorías.';
      return;
    }

    const url = `${this.normalizeBaseUrl(this.baseUrl)}/projects/${this.projectId}/issue_categories.json`;

    this.isLoadingCategories = true;
    this.http
      .get<RedmineCategoriesResponse>(url, { headers: this.buildHeaders() })
      .subscribe({
        next: (response) => {
          this.categories = response.issue_categories || [];
          if (this.categories.length === 0) {
            this.successMessage = 'El proyecto no tiene categorías configuradas.';
          } else {
            this.successMessage = `Se encontraron ${this.categories.length} categorías.`;
          }
        },
        error: (error) => {
          this.isLoadingCategories = false;
          this.errorMessage = this.toErrorMessage(error);
        },
        complete: () => {
          this.isLoadingCategories = false;
        },
      });
  }

  fetchTrackers(): void {
    this.resetMessages();
    if (!this.baseUrl || !this.apiKey) {
      this.errorMessage = 'Completa baseUrl y apiKey.';
      return;
    }

    const url = `${this.normalizeBaseUrl(this.baseUrl)}/trackers.json`;

    this.isLoadingTrackers = true;
    this.http
      .get<RedmineTrackersResponse>(url, { headers: this.buildHeaders() })
      .subscribe({
        next: (response) => {
          this.trackers = response.trackers || [];
          this.successMessage = `Se encontraron ${this.trackers.length} trackers.`;
        },
        error: (error) => {
          this.isLoadingTrackers = false;
          this.errorMessage = this.toErrorMessage(error);
        },
        complete: () => {
          this.isLoadingTrackers = false;
        },
      });
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFiles = Array.from(input.files);
      this.uploadedFiles = [];
      this.resetMessages();
    }
  }

  uploadFiles(): void {
    this.resetMessages();
    if (!this.baseUrl || !this.apiKey) {
      this.errorMessage = 'Completa baseUrl y apiKey.';
      return;
    }

    if (this.selectedFiles.length === 0) {
      this.errorMessage = 'Selecciona al menos un archivo.';
      return;
    }

    this.isUploadingFiles = true;
    this.uploadedFiles = [];
    let uploadedCount = 0;

    this.selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const url = `${this.normalizeBaseUrl(this.baseUrl)}/uploads.json`;
        
        const headers = new HttpHeaders({
          'Content-Type': 'application/octet-stream',
          'X-Redmine-API-Key': this.apiKey,
        });

        this.http
          .post<RedmineUploadResponse>(url, arrayBuffer, { headers })
          .subscribe({
            next: (response) => {
              this.uploadedFiles.push({
                token: response.upload.token,
                filename: file.name,
                content_type: file.type || 'application/octet-stream',
              });
              uploadedCount++;

              if (uploadedCount === this.selectedFiles.length) {
                this.isUploadingFiles = false;
                this.successMessage = `${uploadedCount} archivo(s) subido(s) correctamente.`;
              }
            },
            error: (error) => {
              this.isUploadingFiles = false;
              this.errorMessage = `Error al subir ${file.name}: ${this.toErrorMessage(error)}`;
            },
          });
      };
      reader.readAsArrayBuffer(file);
    });
  }

  removeUploadedFile(index: number): void {
    this.uploadedFiles.splice(index, 1);
    if (this.uploadedFiles.length === 0) {
      this.selectedFiles = [];
    }
  }

  fetchIssueDetail(issueId: number): void {
    this.resetMessages();
    if (!this.baseUrl || !this.apiKey) {
      this.errorMessage = 'Completa baseUrl y apiKey.';
      return;
    }

    const url = `${this.normalizeBaseUrl(this.baseUrl)}/issues/${issueId}.json`;
    const params = new HttpParams()
      .set('include', 'attachments,journals,watchers,children,relations');

    this.isLoadingIssueDetail = true;
    this.http
      .get<RedmineIssueResponse>(url, { headers: this.buildHeaders(), params })
      .subscribe({
        next: (response) => {
          this.selectedIssue = response.issue;
          this.showModal = true;
        },
        error: (error) => {
          this.isLoadingIssueDetail = false;
          this.errorMessage = `Error al cargar ticket #${issueId}: ${this.toErrorMessage(error)}`;
        },
        complete: () => {
          this.isLoadingIssueDetail = false;
        },
      });
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedIssue = null;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  private buildHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Redmine-API-Key': this.apiKey,
    });
  }

  private normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, '');
  }

  private resetMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.connectionInfo = '';
  }

  private toErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object' && 'message' in error) {
      return `Error: ${(error as { message: string }).message}`;
    }

    return 'Ocurrió un error al comunicar con Redmine.';
  }
}
