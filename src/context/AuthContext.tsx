import { onAuthStateChanged, type User } from 'firebase/auth';
import { onDisconnect, onValue, ref, update } from 'firebase/database';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { auth, database } from '../config/firebase';
import { logout } from '../lib/authService';
import type { UserProfile } from '../types';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: () => void = () => undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile();
      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const profileRef = ref(database, `users/${user.uid}`);
      unsubscribeProfile = onValue(profileRef, (snapshot) => {
        setProfile((snapshot.val() ?? null) as UserProfile | null);
        setLoading(false);
      });

      update(profileRef, {
        online: true,
        lastSeen: Date.now()
      }).catch(() => undefined);

      onDisconnect(ref(database, `users/${user.uid}/online`)).set(false).catch(() => undefined);
      onDisconnect(ref(database, `users/${user.uid}/lastSeen`)).set(Date.now()).catch(() => undefined);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeAuth();
    };
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      loading,
      logout
    }),
    [firebaseUser, loading, profile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return value;
}
