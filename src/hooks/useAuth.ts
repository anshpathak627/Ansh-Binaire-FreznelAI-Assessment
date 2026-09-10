import { useEffect, useState } from "react";
import { auth, type MockUser } from "../lib/firebase";
import type { User } from "firebase/auth";

export function useAuth() {
  const [user, setUser] = useState<MockUser | User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  return { user, initializing, auth };
}
