import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { BottomNav } from './components/BottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HeaderBar } from './components/HeaderBar';
import {
  fetchOrBootstrapUserProfile,
  signOutStaff,
} from './lib/firebase/auth';
import { auth } from './lib/firebase/config';
import { subscribeMosques } from './lib/firebase/mosques';
import { fetchQarabulliOsmMosques } from './lib/utils/osmMosques';
import { haversineDistanceMeters } from './lib/utils/geo';
import { AddMosquePage } from './pages/AddMosquePage';
import { GeneralMapPage } from './pages/GeneralMapPage';
import { LoginPage } from './pages/LoginPage';
import { MosquesListPage } from './pages/MosquesListPage';
import { UsersPage } from './pages/UsersPage';
import type { ActiveTab, MosqueRecord, OsmMosqueCandidate, UserProfile } from './types/mosque';

function MainApp() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authBanner, setAuthBanner] = useState<{
    type: 'verify-email' | 'no-profile';
    email?: string | null;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('add');
  const [mosques, setMosques] = useState<MosqueRecord[]>([]);
  const [rawOsmMosques, setRawOsmMosques] = useState<OsmMosqueCandidate[]>([]);
  const [mosquesLoading, setMosquesLoading] = useState(true);
  const [editingMosque, setEditingMosque] = useState<MosqueRecord | null>(null);
  const [firestoreError, setFirestoreError] = useState<Error | null>(null);

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Track browser online/offline state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadUserProfile = useCallback(async (user: User) => {
    const { profile, needsVerificationForBootstrap } =
      await fetchOrBootstrapUserProfile(user);

    if (profile) {
      setUserProfile(profile);
      setAuthBanner(null);
    } else if (needsVerificationForBootstrap) {
      setUserProfile(null);
      setAuthBanner({ type: 'verify-email', email: user.email });
    } else {
      setUserProfile(null);
      setAuthBanner({ type: 'no-profile', email: user.email });
    }
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          await loadUserProfile(user);
        } catch (err) {
          setFirestoreError(err instanceof Error ? err : new Error(String(err)));
        }
      } else {
        setUserProfile(null);
        setAuthBanner(null);
        setMosques([]);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, [loadUserProfile]);

  // Subscribe to mosques and load cached/live OSM mosques when authenticated
  useEffect(() => {
    if (!authReady || !userProfile) {
      setMosquesLoading(false);
      return;
    }

    setMosquesLoading(true);
    const unsub = subscribeMosques(
      (list) => {
        setMosques(list);
        setMosquesLoading(false);
      },
      (err) => {
        setMosquesLoading(false);
        setFirestoreError(err);
      }
    );

    void fetchQarabulliOsmMosques().then((items) => {
      setRawOsmMosques(items);
    });

    return () => unsub();
  }, [authReady, userProfile]);

  // Hide OSM candidate pins that are already documented in Firestore (within 35m)
  const unverifiedOsmCandidates = useMemo(
    () =>
      rawOsmMosques.filter(
        (cand) =>
          !mosques.some(
            (m) => haversineDistanceMeters(cand.lat, cand.lng, m.lat, m.lng) <= 35
          )
      ),
    [rawOsmMosques, mosques]
  );

  if (firestoreError) {
    throw firestoreError;
  }

  const pendingCount = useMemo(
    () => mosques.filter((m) => m.hasPendingWrites).length,
    [mosques]
  );

  const handleRefreshProfile = async () => {
    if (!firebaseUser) return;
    await firebaseUser.reload();
    if (auth.currentUser) {
      await loadUserProfile(auth.currentUser);
    }
  };

  const handleEditMosque = (mosque: MosqueRecord) => {
    setEditingMosque(mosque);
    setActiveTab('add');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center p-6">
        <p className="text-sm font-semibold text-[#0F4C3A]">جاري التحقق من الجلسة...</p>
      </div>
    );
  }

  if (!firebaseUser || !userProfile) {
    return (
      <LoginPage
        authBanner={authBanner}
        onRefreshProfile={handleRefreshProfile}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F4] flex flex-col">
      <HeaderBar
        user={userProfile}
        isOnline={isOnline}
        pendingCount={pendingCount}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab !== 'add') setEditingMosque(null);
          setActiveTab(tab);
        }}
        onSignOut={() => void signOutStaff()}
      />

      <main className="flex-1 flex flex-col">
        {activeTab === 'add' && (
          <AddMosquePage
            mosques={mosques}
            osmCandidates={unverifiedOsmCandidates}
            currentUser={userProfile}
            editingMosque={editingMosque}
            onClearEditing={() => setEditingMosque(null)}
            onSelectExistingForEdit={(existing) => setEditingMosque(existing)}
          />
        )}

        {activeTab === 'map' && (
          <GeneralMapPage
            mosques={mosques}
            osmCandidates={unverifiedOsmCandidates}
            currentUser={userProfile}
            onEditMosque={handleEditMosque}
          />
        )}

        {activeTab === 'list' && (
          <MosquesListPage
            mosques={mosques}
            currentUser={userProfile}
            loading={mosquesLoading}
            onEditMosque={handleEditMosque}
          />
        )}

        {activeTab === 'users' && <UsersPage currentUser={userProfile} />}
      </main>

      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab !== 'add') setEditingMosque(null);
          setActiveTab(tab);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
