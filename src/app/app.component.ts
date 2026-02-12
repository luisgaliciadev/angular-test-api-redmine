import { Component } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

interface RedmineUser {
  id: number;
  name: string;
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

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'testApiRedmine';

  baseUrl = '';
  apiKey = '';

  projectId = '';
  subject = '';
  description = '';
  assignedToId = '';

  // Filtros de consulta
  filterType: 'author' | 'assigned' | 'all' = 'author';
  filterUserId = 'me';
  filterStatusId = '';
  filterProjectId = '';
  limit = 25;

  issues: RedmineIssue[] = [];
  isCreating = false;
  isLoading = false;
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

    const url = `${this.normalizeBaseUrl(this.baseUrl)}/users/current.json`;

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

    this.isCreating = true;
    this.http
      .post(url, { issue: issuePayload }, { headers: this.buildHeaders() })
      .subscribe({
        next: () => {
          this.successMessage = 'Ticket creado correctamente.';
          this.subject = '';
          this.description = '';
          this.assignedToId = '';
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
