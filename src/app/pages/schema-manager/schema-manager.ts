import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

type DataType =
  | 'SMALLINT' | 'INTEGER' | 'BIGINT' | 'DECIMAL' | 'NUMERIC' | 'REAL'
  | 'DOUBLE_PRECISION' | 'SERIAL' | 'BIGSERIAL' | 'VARCHAR' | 'CHAR' | 'TEXT'
  | 'DATE' | 'TIME' | 'TIMESTAMP' | 'TIMESTAMPTZ' | 'BOOLEAN' | 'JSON'
  | 'JSONB' | 'UUID' | 'BYTEA' | 'INET' | 'INTEGER_ARRAY' | 'BIGINT_ARRAY'
  | 'VARCHAR_ARRAY' | 'TEXT_ARRAY';

interface Column {
  name: string; type: DataType; length: number | null; precision: number | null;
  scale: number | null; nullable: boolean; unique: boolean; identity: boolean;
  identityStartWith: number; identityIncrementBy: number; defaultValue: string;
  comment: string; primaryKey: boolean;
}
interface ForeignKey {
  name: string; columns: string[]; referencedTable: string; referencedColumnsText: string;
  onDelete: string; onUpdate: string;
}
interface CheckConstraint { name: string; expression: string; }

@Component({
  selector: 'app-schema-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schema-manager.html',
  styleUrl: './schema-manager.scss',
})
export class SchemaManager {
  private readonly http = inject(HttpClient);

  readonly apiBaseUrl = '/api/v1';
  schema = 'public';
  tableName = '';
  version = '1.0';
  tableComment = '';
  ifNotExists = false;
  temporary = false;
  registerEntity = true;
  activeView: 'create' | 'tables' = 'create';
  isSaving = false;
  isLoadingTables = false;
  notice: { type: 'success' | 'error' | 'info'; message: string } | null = null;
  tables: string[] = [];
  searchTerm = '';
  advancedColumnName = 'id';

  readonly dataTypes: { value: DataType; label: string; group: string; description: string }[] = [
    { value: 'SMALLINT', label: 'SMALLINT', group: 'Numeric', description: 'Small integer' },
    { value: 'INTEGER', label: 'INTEGER', group: 'Numeric', description: 'Whole number' },
    { value: 'BIGINT', label: 'BIGINT', group: 'Numeric', description: 'Large integer' },
    { value: 'DECIMAL', label: 'DECIMAL', group: 'Numeric', description: 'Exact decimal with precision and scale' },
    { value: 'NUMERIC', label: 'NUMERIC', group: 'Numeric', description: 'Exact numeric value' },
    { value: 'REAL', label: 'REAL', group: 'Numeric', description: 'Single-precision floating point' },
    { value: 'DOUBLE_PRECISION', label: 'DOUBLE PRECISION', group: 'Numeric', description: 'Double-precision floating point' },
    { value: 'SERIAL', label: 'SERIAL', group: 'Numeric', description: 'Auto-increment integer' },
    { value: 'BIGSERIAL', label: 'BIGSERIAL', group: 'Numeric', description: 'Auto-increment large integer' },
    { value: 'VARCHAR', label: 'VARCHAR', group: 'Character', description: 'Variable-length text' },
    { value: 'CHAR', label: 'CHAR', group: 'Character', description: 'Fixed-length text' },
    { value: 'TEXT', label: 'TEXT', group: 'Character', description: 'Unlimited text' },
    { value: 'DATE', label: 'DATE', group: 'Date & time', description: 'Date only' },
    { value: 'TIME', label: 'TIME', group: 'Date & time', description: 'Time only' },
    { value: 'TIMESTAMP', label: 'TIMESTAMP', group: 'Date & time', description: 'Date and time' },
    { value: 'TIMESTAMPTZ', label: 'TIMESTAMPTZ', group: 'Date & time', description: 'Date/time with timezone' },
    { value: 'BOOLEAN', label: 'BOOLEAN', group: 'Other', description: 'True or false' },
    { value: 'JSON', label: 'JSON', group: 'Other', description: 'JSON document' },
    { value: 'JSONB', label: 'JSONB', group: 'Other', description: 'Binary JSON document' },
    { value: 'UUID', label: 'UUID', group: 'Other', description: 'Unique identifier' },
    { value: 'BYTEA', label: 'BYTEA', group: 'Other', description: 'Binary data' },
    { value: 'INET', label: 'INET', group: 'Other', description: 'IP address' },
    { value: 'INTEGER_ARRAY', label: 'INTEGER ARRAY', group: 'Arrays', description: 'Array of integers' },
    { value: 'BIGINT_ARRAY', label: 'BIGINT ARRAY', group: 'Arrays', description: 'Array of large integers' },
    { value: 'VARCHAR_ARRAY', label: 'VARCHAR ARRAY', group: 'Arrays', description: 'Array of strings' },
    { value: 'TEXT_ARRAY', label: 'TEXT ARRAY', group: 'Arrays', description: 'Array of text values' },
  ];
  readonly groups = ['Numeric', 'Character', 'Date & time', 'Other', 'Arrays'];
  readonly actions = ['NO ACTION', 'RESTRICT', 'CASCADE', 'SET NULL', 'SET DEFAULT'];

  columns: Column[] = [
    this.makeColumn('id', 'BIGINT', { nullable: false, identity: true, primaryKey: true }),
    this.makeColumn('name', 'VARCHAR', { length: 255, nullable: false }),
  ];
  foreignKeys: ForeignKey[] = [];
  checkConstraints: CheckConstraint[] = [];

  private makeColumn(name = '', type: DataType = 'VARCHAR', extra: Partial<Column> = {}): Column {
    return {
      name, type, length: ['VARCHAR', 'CHAR'].includes(type) ? 255 : null,
      precision: ['DECIMAL', 'NUMERIC'].includes(type) ? 10 : null,
      scale: ['DECIMAL', 'NUMERIC'].includes(type) ? 2 : null,
      nullable: true, unique: false, identity: false, identityStartWith: 1,
      identityIncrementBy: 1, defaultValue: '', comment: '', primaryKey: false, ...extra,
    };
  }

  typesForGroup(group: string) { return this.dataTypes.filter(t => t.group === group); }
  typeNeedsLength(type: DataType) { return ['VARCHAR', 'CHAR'].includes(type); }
  typeNeedsPrecision(type: DataType) { return ['DECIMAL', 'NUMERIC'].includes(type); }
  get primaryKeyColumns() { return this.columns.filter(c => c.primaryKey); }
  get uniqueColumnCount() { return this.columns.filter(c => c.unique).length; }
  get filteredTables() {
    const q = this.searchTerm.trim().toLowerCase();
    return this.tables.filter(t => t.toLowerCase().includes(q));
  }

  addColumn() {
    const c = this.makeColumn(`column_${this.columns.length + 1}`);
    this.columns.push(c);
    this.advancedColumnName = c.name;
  }
  removeColumn(index: number) {
    if (this.columns.length <= 1) return this.show('error', 'A table must have at least one column.');
    const [removed] = this.columns.splice(index, 1);
    if (this.advancedColumnName === removed.name) this.advancedColumnName = this.columns[0]?.name || '';
    this.foreignKeys.forEach(fk => (fk.columns = fk.columns.filter(n => n !== removed.name)));
  }
  onTypeChange(c: Column) {
    if (!this.typeNeedsLength(c.type)) c.length = null;
    else c.length ||= 255;
    if (!this.typeNeedsPrecision(c.type)) { c.precision = null; c.scale = null; }
    else { c.precision ??= 10; c.scale ??= 2; }
    if (['SERIAL', 'BIGSERIAL'].includes(c.type)) { c.nullable = false; c.identity = false; }
  }
  togglePrimaryKey(c: Column, checked: boolean) {
    c.primaryKey = checked;
    if (checked) c.nullable = false;
  }
  addForeignKey() {
    this.foreignKeys.push({
      name: `fk_${this.tableName || 'table'}_${this.foreignKeys.length + 1}`,
      columns: this.columns[0]?.name ? [this.columns[0].name] : [],
      referencedTable: '', referencedColumnsText: '', onDelete: 'RESTRICT', onUpdate: 'CASCADE',
    });
  }
  addCheckConstraint() {
    this.checkConstraints.push({
      name: `chk_${this.tableName || 'table'}_${this.checkConstraints.length + 1}`, expression: '',
    });
  }

  saveSchema() {
  this.notice = null;
  const problem = this.validate();
  if (problem) return this.show('error', problem);

  const endpoint = this.registerEntity ? '/schema/create-and-register' : '/schema/create';
  this.isSaving = true;

  this.http.post(`${this.apiBaseUrl}${endpoint}`, this.buildPayload(), {
    // X-User-Id is required only by register endpoint per your API spec
    headers: this.registerEntity ? { 'X-User-Id': 'admin@company.com' } : {},
  }).subscribe({
    next: () => {
      this.isSaving = false;
      this.show('success', `Table "${this.schema}.${this.tableName}" created${this.registerEntity ? ' and registered' : ''}.`);
      this.loadTables();
    },
    error: (e: HttpErrorResponse) => {
      this.isSaving = false;
      // Now you'll actually SEE this error instead of being logged out
      this.show('error', this.errorText(e));
    },
  });
}

  private validate(): string | null {
    if (!this.schema.trim()) return 'Schema name is required.';
    if (!this.tableName.trim()) return 'Table name is required.';
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this.tableName.trim())) return 'Use lowercase snake_case or another valid SQL identifier for the table name.';
    if (!this.columns.length) return 'Add at least one column.';
    const names = this.columns.map(c => c.name.trim().toLowerCase());
    if (this.columns.some(c => !c.name.trim())) return 'Every column needs a name.';
    if (names.some((n, i) => names.indexOf(n) !== i)) return 'Column names must be unique.';
    if (this.columns.some(c => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c.name.trim()))) return 'Column names must start with a letter or underscore and contain only letters, numbers or underscores.';
    for (const c of this.columns) {
      if (this.typeNeedsLength(c.type) && (!c.length || c.length < 1)) return `Enter a valid length for "${c.name}".`;
      if (this.typeNeedsPrecision(c.type) && (!c.precision || c.precision < 1 || c.scale == null || c.scale < 0 || c.scale > c.precision)) return `Check precision and scale for "${c.name}".`;
    }
    if (this.foreignKeys.some(f => !f.name.trim() || !f.columns.length || !f.referencedTable.trim() || !f.referencedColumnsText.trim())) return 'Complete all foreign key fields.';
    if (this.foreignKeys.some(f => f.columns.length !== f.referencedColumnsText.split(',').filter(x => x.trim()).length)) return 'Foreign key source and referenced column counts must match.';
    if (this.checkConstraints.some(c => !c.name.trim() || !c.expression.trim())) return 'Complete all check constraint fields.';
    return null;
  }

  private buildPayload(): Record<string, unknown> {
    const columns = this.columns.map(c => {
      const item: Record<string, unknown> = {
        name: c.name.trim(), type: c.type, nullable: c.primaryKey ? false : c.nullable,
        unique: c.unique, identity: c.identity,
      };
      if (this.typeNeedsLength(c.type)) item['length'] = Number(c.length);
      if (this.typeNeedsPrecision(c.type)) { item['precision'] = Number(c.precision); item['scale'] = Number(c.scale); }
      if (c.defaultValue.trim()) item['defaultValue'] = c.defaultValue.trim();
      if (c.identity) { item['identityStartWith'] = Number(c.identityStartWith || 1); item['identityIncrementBy'] = Number(c.identityIncrementBy || 1); }
      if (c.comment.trim()) item['comment'] = c.comment.trim();
      return item;
    });
    return {
      schema: this.schema.trim(), tableName: this.tableName.trim(), ifNotExists: this.ifNotExists,
      temporary: this.temporary, ...(this.tableComment.trim() ? { tableComment: this.tableComment.trim() } : {}),
      columns,
      constraints: {
        primaryKeys: this.primaryKeyColumns.length ? [{ name: `pk_${this.tableName}`, columns: this.primaryKeyColumns.map(c => c.name.trim()) }] : [],
        uniqueKeys: this.columns.filter(c => c.unique).map(c => ({ name: `uk_${this.tableName}_${c.name}`, columns: [c.name.trim()] })),
        foreignKeys: this.foreignKeys.map(f => ({
          name: f.name.trim(), columns: f.columns,
          referencedTable: f.referencedTable.trim(),
          referencedColumns: f.referencedColumnsText.split(',').map(x => x.trim()).filter(Boolean),
          onDelete: f.onDelete, onUpdate: f.onUpdate,
        })),
        checkConstraints: this.checkConstraints.map(c => ({ name: c.name.trim(), expression: c.expression.trim() })),
      },
      ...(this.registerEntity ? { version: this.version.trim() || '1.0' } : {}),
    };
  }

  loadTables() {
    this.isLoadingTables = true;
    this.http.get<unknown>(`${this.apiBaseUrl}/schema/list`, { params: { schema: this.schema.trim() || 'public' } }).subscribe({
      next: response => { this.tables = this.parseTables(response); this.isLoadingTables = false; },
      error: (e: HttpErrorResponse) => { this.isLoadingTables = false; this.show('error', `Could not load tables: ${this.errorText(e)}`); },
    });
  }
  tableExists(table: string) {
    this.http.get(`${this.apiBaseUrl}/schema/exists`, { params: { schema: this.schema, tableName: table } }).subscribe({
      next: result => this.show('info', `${table}: ${JSON.stringify(result)}`),
      error: (e: HttpErrorResponse) => this.show('error', this.errorText(e)),
    });
  }
  viewTableInfo(table: string) {
    this.http.get(`${this.apiBaseUrl}/schema/info`, { params: { schema: this.schema, tableName: table } }).subscribe({
      next: result => this.show('info', JSON.stringify(result, null, 2)),
      error: (e: HttpErrorResponse) => this.show('error', this.errorText(e)),
    });
  }
  dropTable(table: string) {
    if (!window.confirm(`Drop table "${this.schema}.${table}"? This cannot be undone.`)) return;
    this.http.delete(`${this.apiBaseUrl}/schema/drop`, { body: { schema: this.schema, tableName: table } }).subscribe({
      next: () => { this.show('success', `Table "${table}" dropped.`); this.loadTables(); },
      error: (e: HttpErrorResponse) => this.show('error', this.errorText(e)),
    });
  }
  truncateTable(table: string) {
    if (!window.confirm(`Truncate all rows in "${this.schema}.${table}"?`)) return;
    this.http.delete(`${this.apiBaseUrl}/schema/truncate`, { body: { schema: this.schema, tableName: table } }).subscribe({
      next: () => this.show('success', `Table "${table}" truncated.`),
      error: (e: HttpErrorResponse) => this.show('error', this.errorText(e)),
    });
  }
  resetForm() {
    this.schema = 'public'; this.tableName = ''; this.version = '1.0'; this.tableComment = '';
    this.ifNotExists = false; this.temporary = false; this.registerEntity = true;
    this.columns = [
      this.makeColumn('id', 'BIGINT', { nullable: false, identity: true, primaryKey: true }),
      this.makeColumn('name', 'VARCHAR', { length: 255, nullable: false }),
    ];
    this.advancedColumnName = 'id'; this.foreignKeys = []; this.checkConstraints = []; this.notice = null;
  }

  private parseTables(response: unknown): string[] {
    const r: any = response;
    const list = Array.isArray(r) ? r : (r?.tables ?? r?.data ?? r?.result ?? []);
    if (!Array.isArray(list)) return [];
    return list
      .map((v: any) => (typeof v === 'string' ? v : v.tableName || v.table_name || v.name))
      .filter((v: unknown): v is string => typeof v === 'string');
  }
  private errorText(e: HttpErrorResponse): string {
    const message = e.error?.message || e.error?.error || e.error?.detail;
    if (message) return String(message);
    if (e.status === 0) return 'Cannot reach Schema API. Check that it is running and CORS is configured.';
    return `Request failed (${e.status} ${e.statusText || ''}).`;
  }
  private show(type: 'success' | 'error' | 'info', message: string) { this.notice = { type, message }; }
}