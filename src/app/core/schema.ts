import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface SchemaField {
  name: string;
  type: string;          // 'string' | 'number' | 'boolean' | 'object' | ...
  required: boolean;
}

export interface SchemaDefinition {
  id: string;
  name: string;
  version: number;
  description?: string;
  fields: SchemaField[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSchemaRequest {
  name: string;
  description?: string;
  fields: SchemaField[];
}

@Injectable({ providedIn: 'root' })
export class SchemaService {
  private http = inject(HttpClient);

  // Adjust to your real backend
 private readonly baseUrl = '/api/v1/schema';

  readonly schemas = signal<SchemaDefinition[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string>('');

  list(): Observable<SchemaDefinition[]> {
    this.loading.set(true);
    this.error.set('');
    return this.http.get<SchemaDefinition[]>(this.baseUrl).pipe(
      tap({
        next: (rows) => {
          this.schemas.set(rows);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || 'Failed to load schemas');
        },
      })
    );
  }

  create(payload: CreateSchemaRequest): Observable<SchemaDefinition> {
    return this.http.post<SchemaDefinition>(this.baseUrl, payload).pipe(
      tap((created) => this.schemas.update((rows) => [created, ...rows]))
    );
  }

  update(id: string, payload: CreateSchemaRequest): Observable<SchemaDefinition> {
    return this.http.put<SchemaDefinition>(`${this.baseUrl}/${id}`, payload).pipe(
      tap((updated) =>
        this.schemas.update((rows) => rows.map((r) => (r.id === id ? updated : r)))
      )
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.schemas.update((rows) => rows.filter((r) => r.id !== id)))
    );
  }
}