import Dexie, { type Table } from 'dexie';
import type { Workspace, Notebook, Page } from '../types';

export class SmartNotebookDB extends Dexie {
  workspaces!: Table<Workspace, string>;
  notebooks!: Table<Notebook, string>;
  pages!: Table<Page, string>;

  constructor() {
    super('SmartNotebookDB');
    this.version(2).stores({
      workspaces: 'id, name, createdAt',
      notebooks: 'id, workspaceId, title, createdAt',
      pages: 'id, notebookId, order, createdAt, updatedAt'
    });
  }
}

export const db = new SmartNotebookDB();

export const initDB = async () => {
  const count = await db.workspaces.count();
  if (count === 0) {
    await db.workspaces.add({
      id: 'default-workspace',
      name: 'My Workspace',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    await db.notebooks.add({
      id: 'default-notebook',
      workspaceId: 'default-workspace',
      title: 'Welcome Notebook',
      coverColor: '#ef4444',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
};
