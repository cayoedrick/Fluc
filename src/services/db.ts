import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FlucState } from '../types';

/**
 * Saves application state to Firestore at `/users/{uid}/data/{path}`
 * Sanitizes object by removing `undefined` properties to adhere to Firestore requirements.
 */
export const saveData = async (uid: string, path: string, data: FlucState): Promise<void> => {
  const docRef = doc(db, 'users', uid, 'data', path);
  // Strip any `undefined` values that would cause Firestore setDoc to fail
  const cleanData = JSON.parse(JSON.stringify(data));
  await setDoc(docRef, cleanData);
};

/**
 * Subscribes to real-time updates from Firestore for `/users/{uid}/data/{path}`
 */
export const subscribeToData = (
  uid: string,
  path: string,
  callback: (data: FlucState | null, isSyncing: boolean, error: Error | null) => void
) => {
  const docRef = doc(db, 'users', uid, 'data', path);

  const unsubscribe = onSnapshot(
    docRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      const isSyncing = snapshot.metadata.hasPendingWrites;
      if (snapshot.exists()) {
        const data = snapshot.data() as FlucState;
        callback(data, isSyncing, null);
      } else {
        callback(null, isSyncing, null);
      }
    },
    (error) => {
      console.error('[Firestore Sync] Subscription error:', error);
      callback(null, false, error);
    }
  );

  return unsubscribe;
};

/**
 * Fetches the document snapshot once from Firestore
 */
export const getData = async (uid: string, path: string): Promise<FlucState | null> => {
  const docRef = doc(db, 'users', uid, 'data', path);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return snapshot.data() as FlucState;
  }
  return null;
};
