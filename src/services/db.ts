import { ref, set, onValue, off } from 'firebase/database';
import { db, auth } from '../lib/firebase';
import { FlucState } from '../types';

export const saveData = async (uid: string, path: string, data: FlucState): Promise<void> => {
  const dbRef = ref(db, `users/${uid}/${path}`);
  await set(dbRef, data);
};

export const subscribeToData = (uid: string, path: string, callback: (data: FlucState | null, isSyncing: boolean) => void) => {
  const dbRef = ref(db, `users/${uid}/${path}`);
  
  // Connection state monitoring
  const connectedRef = ref(db, '.info/connected');
  let isConnected = false;
  
  onValue(connectedRef, (snap) => {
    isConnected = !!snap.val();
  });

  const onDataChange = onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    callback(data as FlucState | null, !isConnected);
  });

  return () => {
    off(dbRef, 'value', onDataChange);
  };
};
