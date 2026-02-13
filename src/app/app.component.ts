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
}

interface RedmineIssuesResponse {
  issues: RedmineIssue[];
  total_count: number;
  offset: number;
  limit: number;
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
  isCreating = false;
  isLoading = false;
  isLoadingProjects = false;
  isLoadingUsers = false;
  isLoadingPriorities = false;
  isLoadingCategories = false;
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
