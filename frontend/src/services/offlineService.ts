// Offline Service - Manages service worker and local caching
import type { ProjectFile } from '../types';

interface OfflineState {
  isOnline: boolean;
  isServiceWorkerReady: boolean;
  pendingSync: number;
}

type OfflineListener = (state: OfflineState) => void;

class OfflineService {
  private state: OfflineState = {
    isOnline: navigator.onLine,
    isServiceWorkerReady: false,
    pendingSync: 0,
  };
  
  private listeners: Set<OfflineListener> = new Set();
  private swRegistration: ServiceWorkerRegistration | null = null;
  private pendingOperations: Map<string, { type: string; data: unknown; timestamp: number }> = new Map();

  constructor() {
    this.initOnlineListeners();
  }

  // Initialize online/offline event listeners
  private initOnlineListeners() {
    window.addEventListener('online', () => {
      this.state.isOnline = true;
      this.notifyListeners();
      this.syncPendingOperations();
    });

    window.addEventListener('offline', () => {
      this.state.isOnline = false;
      this.notifyListeners();
    });
  }

  // Register the service worker
  async registerServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('[Offline] Service workers not supported');
      return false;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[Offline] Service worker registered');

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      this.state.isServiceWorkerReady = true;
      this.notifyListeners();

      // Handle updates
      this.swRegistration.addEventListener('updatefound', () => {
        const newWorker = this.swRegistration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[Offline] New service worker available');
              // Optionally notify user about update
            }
          });
        }
      });

      return true;
    } catch (error) {
      console.error('[Offline] Service worker registration failed:', error);
      return false;
    }
  }

  // Cache project files for offline access
  async cacheProject(projectId: string, files: ProjectFile[]): Promise<void> {
    // Store in IndexedDB for better offline support
    await this.storeInIndexedDB('projects', projectId, { files, timestamp: Date.now() });

    // Also notify service worker
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_PROJECT',
        projectId,
        files,
      });
    }
  }

  // Get cached project files
  async getCachedProject(projectId: string): Promise<ProjectFile[] | null> {
    const data = await this.getFromIndexedDB('projects', projectId) as { files?: ProjectFile[] } | null;
    return data?.files || null;
  }

  // Clear project cache
  async clearProjectCache(projectId: string): Promise<void> {
    await this.deleteFromIndexedDB('projects', projectId);

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_PROJECT_CACHE',
        projectId,
      });
    }
  }

  // Queue operation for later sync
  queueOperation(id: string, type: string, data: unknown): void {
    this.pendingOperations.set(id, { type, data, timestamp: Date.now() });
    this.state.pendingSync = this.pendingOperations.size;
    this.notifyListeners();
    
    // Store in IndexedDB for persistence
    this.storeInIndexedDB('pendingOps', id, { type, data, timestamp: Date.now() });
  }

  // Sync pending operations when back online
  private async syncPendingOperations(): Promise<void> {
    if (this.pendingOperations.size === 0) return;

    console.log('[Offline] Syncing pending operations:', this.pendingOperations.size);
    
    for (const [id, operation] of this.pendingOperations) {
      try {
        // Dispatch custom event for the app to handle
        window.dispatchEvent(new CustomEvent('offlineSync', {
          detail: { id, ...operation }
        }));
        
        this.pendingOperations.delete(id);
        await this.deleteFromIndexedDB('pendingOps', id);
      } catch (error) {
        console.error('[Offline] Failed to sync operation:', id, error);
      }
    }

    this.state.pendingSync = this.pendingOperations.size;
    this.notifyListeners();
  }

  // Load pending operations from IndexedDB on startup
  async loadPendingOperations(): Promise<void> {
    const db = await this.openDatabase();
    const tx = db.transaction('pendingOps', 'readonly');
    const store = tx.objectStore('pendingOps');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const operations = request.result;
        for (const op of operations) {
          this.pendingOperations.set(op.id, op);
        }
        this.state.pendingSync = this.pendingOperations.size;
        this.notifyListeners();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // IndexedDB helpers
  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('intelekt-offline', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pendingOps')) {
          db.createObjectStore('pendingOps', { keyPath: 'id' });
        }
      };
    });
  }

  private async storeInIndexedDB(store: string, id: string, data: unknown): Promise<void> {
    const db = await this.openDatabase();
    const tx = db.transaction(store, 'readwrite');
    const objectStore = tx.objectStore(store);
    
    return new Promise((resolve, reject) => {
      const request = objectStore.put({ id, ...data as object });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getFromIndexedDB(store: string, id: string): Promise<unknown | null> {
    const db = await this.openDatabase();
    const tx = db.transaction(store, 'readonly');
    const objectStore = tx.objectStore(store);
    
    return new Promise((resolve, reject) => {
      const request = objectStore.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromIndexedDB(store: string, id: string): Promise<void> {
    const db = await this.openDatabase();
    const tx = db.transaction(store, 'readwrite');
    const objectStore = tx.objectStore(store);
    
    return new Promise((resolve, reject) => {
      const request = objectStore.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Subscription management
  subscribe(listener: OfflineListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener({ ...this.state }));
  }

  // Getters
  getState(): OfflineState {
    return { ...this.state };
  }

  isOnline(): boolean {
    return this.state.isOnline;
  }

  isReady(): boolean {
    return this.state.isServiceWorkerReady;
  }

  // Force update service worker
  async updateServiceWorker(): Promise<void> {
    if (this.swRegistration) {
      await this.swRegistration.update();
    }
  }

  // Skip waiting and activate new service worker
  skipWaiting(): void {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
  }
}

export const offlineService = new OfflineService();
export type { OfflineState };
