import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/collab';

interface User {
  id: string;
  name: string;
  color: string;
  avatar?: string;
}

interface CursorPosition {
  lineNumber: number;
  column: number;
  selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
}

interface UserPresence extends User {
  cursor?: CursorPosition;
  isTyping?: boolean;
  lastActive: number;
}

interface CollaborationState {
  doc: Y.Doc | null;
  provider: WebsocketProvider | null;
  awareness: WebsocketProvider['awareness'] | null;
  connected: boolean;
  users: UserPresence[];
}

// Generate random color for user cursor
const generateColor = (): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Generate random user name
const generateUserName = (): string => {
  const adjectives = ['Swift', 'Bright', 'Clever', 'Bold', 'Quick', 'Sharp'];
  const nouns = ['Coder', 'Dev', 'Builder', 'Maker', 'Hacker', 'Creator'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}${noun}${Math.floor(Math.random() * 100)}`;
};

class CollaborationService {
  private state: CollaborationState = {
    doc: null,
    provider: null,
    awareness: null,
    connected: false,
    users: [],
  };

  private currentUser: User = {
    id: crypto.randomUUID(),
    name: generateUserName(),
    color: generateColor(),
  };

  private listeners: Set<(state: CollaborationState) => void> = new Set();

  // Join a collaborative session for a specific file
  joinSession(projectId: string, filePath: string): Y.Text {
    // Create a unique room name
    const roomName = `${projectId}:${filePath}`;
    
    // Disconnect from previous session if exists
    this.leaveSession();

    // Create new Yjs document
    const doc = new Y.Doc();
    
    // Create WebSocket provider
    const provider = new WebsocketProvider(WS_URL, roomName, doc, {
      connect: true,
    });

    // Set up awareness (user presence)
    const awareness = provider.awareness;
    awareness.setLocalStateField('user', this.currentUser);

    // Track connection status
    provider.on('status', (event: { status: string }) => {
      this.state.connected = event.status === 'connected';
      this.notifyListeners();
    });

    // Track users with cursor positions
    awareness.on('change', () => {
      const users: UserPresence[] = [];
      awareness.getStates().forEach((state) => {
        if (state.user) {
          users.push({
            ...state.user as User,
            cursor: state.cursor as CursorPosition | undefined,
            isTyping: state.isTyping as boolean | undefined,
            lastActive: state.lastActive as number || Date.now(),
          });
        }
      });
      this.state.users = users;
      this.notifyListeners();
    });

    this.state = {
      doc,
      provider,
      awareness,
      connected: false,
      users: [{ ...this.currentUser, lastActive: Date.now() }],
    };

    // Return the shared text type for the file
    return doc.getText('content');
  }

  // Leave current session
  leaveSession(): void {
    if (this.state.provider) {
      this.state.provider.disconnect();
      this.state.provider.destroy();
    }
    if (this.state.doc) {
      this.state.doc.destroy();
    }
    this.state = {
      doc: null,
      provider: null,
      awareness: null,
      connected: false,
      users: [],
    };
    this.notifyListeners();
  }

  // Get current state
  getState(): CollaborationState {
    return { ...this.state };
  }

  // Get current user
  getCurrentUser(): User {
    return this.currentUser;
  }

  // Update current user name
  setUserName(name: string): void {
    this.currentUser.name = name;
    if (this.state.awareness) {
      this.state.awareness.setLocalStateField('user', this.currentUser);
    }
  }

  // Update cursor position
  updateCursor(cursor: CursorPosition): void {
    if (this.state.awareness) {
      this.state.awareness.setLocalStateField('cursor', cursor);
      this.state.awareness.setLocalStateField('lastActive', Date.now());
    }
  }

  // Set typing status
  setTyping(isTyping: boolean): void {
    if (this.state.awareness) {
      this.state.awareness.setLocalStateField('isTyping', isTyping);
      this.state.awareness.setLocalStateField('lastActive', Date.now());
    }
  }

  // Get other users (excluding current user)
  getOtherUsers(): UserPresence[] {
    return this.state.users.filter(u => u.id !== this.currentUser.id);
  }

  // Subscribe to state changes
  subscribe(listener: (state: CollaborationState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  // Get Y.Doc for Monaco binding
  getDoc(): Y.Doc | null {
    return this.state.doc;
  }

  // Get awareness for cursor positions
  getAwareness(): WebsocketProvider['awareness'] | null {
    return this.state.awareness;
  }
}

export const collaborationService = new CollaborationService();
export type { User, UserPresence, CursorPosition, CollaborationState };
