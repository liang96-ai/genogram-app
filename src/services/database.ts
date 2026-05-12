import Dexie, { type Table } from 'dexie';
import type { Genogram } from '../types/genogram';

type SettingRecord = { key: string; value: unknown };
type TemplateRecord = { id: string; name: string; data: unknown };

export class GenogramDB extends Dexie {
  cases!: Table<Genogram, string>;
  settings!: Table<SettingRecord, string>;
  templates!: Table<TemplateRecord, string>;

  constructor() {
    super('genogram-db');
    this.version(1).stores({
      cases: 'id, caseName, lastModifiedAt',
      settings: 'key',
      templates: 'id, name',
    });
  }
}

export const db = new GenogramDB();
