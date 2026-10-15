import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Keys for persistence in localStorage
const TOKEN_STORAGE_KEY = 'fluc_google_access_token';
const TOKEN_EXPIRY_KEY = 'fluc_google_token_expires_at';
const USER_STORAGE_KEY = 'fluc_google_user';

let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;

export interface SavedUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const getSavedUser = (): SavedUserProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setCachedAccessToken = (token: string | null, expiresInSeconds = 3500) => {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresInSeconds * 1000));
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
    }
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // Restore access token from storage if not already cached in memory
      if (!cachedAccessToken && typeof window !== 'undefined') {
        cachedAccessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      }

      // Persist user profile for immediate offline & refresh continuity
      if (typeof window !== 'undefined') {
        try {
          const profile: SavedUserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          };
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
        } catch {
          // ignore storage quota issues
        }
      }

      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      // If there is already a saved user in localStorage (e.g. page refresh), preserve the session
      const savedUser = getSavedUser();
      const savedToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
      if (savedUser && savedToken) {
        cachedAccessToken = savedToken;
        if (onAuthSuccess) {
          onAuthSuccess(savedUser as any as User, savedToken);
        }
      } else {
        // Only trigger failure if truly logged out and no saved session exists
        cachedAccessToken = null;
        if (onAuthFailure) {
          onAuthFailure();
        }
      }
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter token de acesso do Google.');
    }

    setCachedAccessToken(credential.accessToken);

    if (result.user && typeof window !== 'undefined') {
      try {
        const profile: SavedUserProfile = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL
        };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
      } catch {
        // ignore
      }
    }

    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    if (error?.code === 'auth/popup-blocked') {
      console.warn('Google sign-in popup was blocked by browser.');
    } else {
      console.error('Sign in error:', error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken && typeof window !== 'undefined') {
    cachedAccessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  }
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }
};
