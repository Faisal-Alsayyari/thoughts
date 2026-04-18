import { openDB, type DBSchema } from 'idb';
import type { Conversation } from '../types/node';

interface ThoughtsDB extends DBSchema {
  conversations: {
    key: string;
    value: Conversation;
    indexes: { 'by-updated': number };
  };
}

const DB_NAME = 'thoughts-db';
const DB_VERSION = 1;

function getDB() {
  return openDB<ThoughtsDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore('conversations', { keyPath: 'id' });
      store.createIndex('by-updated', 'updatedAt');
    },
  });
}

export async function saveConversation(conversation: Conversation): Promise<void> {
  const db = await getDB();
  await db.put('conversations', { ...conversation, updatedAt: Date.now() });
}

export async function loadConversation(id: string): Promise<Conversation | undefined> {
  const db = await getDB();
  return db.get('conversations', id);
}

export async function listConversations(): Promise<Conversation[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('conversations', 'by-updated');
  return all.reverse(); // newest first
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('conversations', id);
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const db = await getDB();
  const conv = await db.get('conversations', id);
  if (conv) {
    await db.put('conversations', { ...conv, title, updatedAt: Date.now() });
  }
}

export async function pinConversation(id: string, pinned: boolean): Promise<void> {
  const db = await getDB();
  const conv = await db.get('conversations', id);
  if (conv) {
    await db.put('conversations', { ...conv, pinned, updatedAt: Date.now() });
  }
}
