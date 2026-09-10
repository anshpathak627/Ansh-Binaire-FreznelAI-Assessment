import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword as fbCreateUser,
  signInWithEmailAndPassword as fbSignIn,
  onAuthStateChanged as fbOnAuthStateChanged,
  signOut as fbSignOut,
  type Auth,
  type User,
} from "firebase/auth";

export interface MockUser {
  uid: string;
  email: string;
}

export interface AuthLike {
  createUserWithEmailAndPassword: (email: string, password: string) => Promise<{ user: MockUser | User }>;
  signInWithEmailAndPassword: (email: string, password: string) => Promise<{ user: MockUser | User }>;
  onAuthStateChanged: (cb: (user: MockUser | User | null) => void) => () => void;
  signOut: () => Promise<void>;
}

const MOCK_USER_KEY = "model_search_mock_user";
const MOCK_USERS_KEY = "model_search_mock_users"; // email -> password, demo only

/**
 * Mock, localStorage-backed auth implementation so the app is fully
 * runnable/demoable without real Firebase credentials configured. Enabled
 * via VITE_AUTH_MOCK=true.
 */
function createMockAuth(): AuthLike {
  const listeners: Set<(user: MockUser | null) => void> = new Set();

  function getUsers(): Record<string, string> {
    try {
      const raw = localStorage.getItem(MOCK_USERS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function getStoredUser(): MockUser | null {
    try {
      const raw = localStorage.getItem(MOCK_USER_KEY);
      return raw ? (JSON.parse(raw) as MockUser) : null;
    } catch {
      return null;
    }
  }

  function notify(user: MockUser | null): void {
    listeners.forEach((l) => l(user));
  }

  return {
    createUserWithEmailAndPassword: (email, password) => {
      return new Promise((resolve, reject) => {
        const users = getUsers();
        if (users[email]) {
          reject(new Error("An account with this email already exists."));
          return;
        }
        users[email] = password;
        localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
        const user: MockUser = { uid: `mock-${Date.now()}`, email };
        localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
        setTimeout(() => {
          notify(user);
          resolve({ user });
        }, 300);
      });
    },
    signInWithEmailAndPassword: (email, password) => {
      return new Promise((resolve, reject) => {
        const users = getUsers();
        if (users[email] !== undefined && users[email] !== password) {
          reject(new Error("Incorrect password."));
          return;
        }
        // demo-friendly: allow signing in even if never "signed up" locally
        const user: MockUser = { uid: `mock-${Date.now()}`, email };
        localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
        setTimeout(() => {
          notify(user);
          resolve({ user });
        }, 300);
      });
    },
    onAuthStateChanged: (cb) => {
      cb(getStoredUser());
      listeners.add(cb as (user: MockUser | null) => void);
      return () => {
        listeners.delete(cb as (user: MockUser | null) => void);
      };
    },
    signOut: () => {
      return new Promise((resolve) => {
        localStorage.removeItem(MOCK_USER_KEY);
        notify(null);
        resolve();
      });
    },
  };
}

function createRealAuth(): AuthLike {
  const app: FirebaseApp = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  });
  const auth: Auth = getAuth(app);

  return {
    createUserWithEmailAndPassword: (email, password) => fbCreateUser(auth, email, password),
    signInWithEmailAndPassword: (email, password) => fbSignIn(auth, email, password),
    onAuthStateChanged: (cb) => fbOnAuthStateChanged(auth, cb),
    signOut: () => fbSignOut(auth),
  };
}

export const isMockAuth = import.meta.env.VITE_AUTH_MOCK === "true";

export const auth: AuthLike = isMockAuth ? createMockAuth() : createRealAuth();
