

const DB_NAME = 'UtopiaUrbanaBuilderDB_V4';
const STORE_NAME = 'site_data';
const DB_VERSION = 4;
const BACKUP_KEY = 'utopia_urbana_emergency_backup';

class StorageQueue {
  private queue: Promise<any> = Promise.resolve();

  enqueue<T>(operation: () => Promise<T>): Promise<T> {
    this.queue = this.queue.then(operation, (err) => {
      console.error("Erro na fila de salvamento:", err);
      return operation(); // Tenta recuperar na próxima
    });
    return this.queue as Promise<T>;
  }
}

const writeQueue = new StorageQueue();

export const storage = {
  db: null as IDBDatabase | null,

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async save(data: any): Promise<void> {
    if (!data) return;

    return writeQueue.enqueue(async () => {
      const db = await this.init();
      
      // Validação de sanidade: Não salvar se o dado parece corrompido ou vazio demais comparado ao atual
      const existing = await this.loadInternal();
      if (existing) {
        // Fix: Explicitly cast to Record and typing reduce results as number to avoid 'unknown' type comparison errors.
        const existingCount = Object.values(existing as Record<string, any>).reduce((acc: number, p: any) => acc + (p.elements?.length || 0), 0) as number;
        const newCount = Object.values(data as Record<string, any>).reduce((acc: number, p: any) => acc + (p.elements?.length || 0), 0) as number;
        
        // Se o novo estado está vazio mas o antigo tinha muito conteúdo, bloqueia o wipe acidental
        if (existingCount > 5 && newCount === 0) {
          console.warn("⚠️ Bloqueio de Segurança: Tentativa de apagar projeto ignorada.");
          return;
        }
      }

      // 1. Backup em LocalStorage (Apenas se couber, costuma ser 5MB)
      try {
        const strData = JSON.stringify(data);
        if (strData.length < 4000000) { // < 4MB
          localStorage.setItem(BACKUP_KEY, strData);
        }
      } catch (e) {
        console.warn("LocalStorage cheio, fotos grandes demais para o backup secundário. Usando apenas IndexedDB.");
      }

      // 2. Escrita Principal no IndexedDB
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(data, 'current_project');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    });
  },

  // Método interno sem fila para verificações
  async loadInternal(): Promise<any> {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('current_project');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      return null;
    }
  },

  async load(): Promise<any> {
    const dbData = await this.loadInternal();
    if (dbData) return dbData;

    // Fallback para LocalStorage
    const backup = localStorage.getItem(BACKUP_KEY);
    if (backup) {
      console.log("🛡️ Restaurado de Backup LocalStorage");
      try {
        return JSON.parse(backup);
      } catch {
        return null;
      }
    }
    return null;
  }
};
