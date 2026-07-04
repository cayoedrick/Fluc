import { ref, set, onValue, off } from 'firebase/database';
import { db, auth } from '../lib/firebase';
import { FlucState } from '../types';

export const saveData = async (path: string, data: FlucState): Promise<void> => {
  if (!auth.currentUser) return;
  const dbRef = ref(db, `users/${auth.currentUser.uid}/${path}`);
  await set(dbRef, data);
};

export const subscribeToData = (path: string, callback: (data: FlucState | null, isSyncing: boolean) => void) => {
  if (!auth.currentUser) return () => {};
  
  const dbRef = ref(db, `users/${auth.currentUser.uid}/${path}`);
  
  // Connection state monitoring
  const connectedRef = ref(db, '.info/connected');
  let isConnected = false;
  
  onValue(connectedRef, (snap) => {
    isConnected = !!snap.val();
  });

  const onDataChange = onValue(dbRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as FlucState, !isConnected);
    } else {
      callback(null, !isConnected);
    }
  });

  return () => {
    off(dbRef, 'value', onDataChange);
  };
};
