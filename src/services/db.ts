import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { FlucState } from '../types';

export const saveData = async (collection: string, data: FlucState) => {
  if (!auth.currentUser) return;
  const docRef = doc(db, 'users', auth.currentUser.uid, 'data', collection);
  await setDoc(docRef, data);
};

export const subscribeToData = (collection: string, callback: (data: FlucState | null) => void) => {
  if (!auth.currentUser) return () => {};
  const docRef = doc(db, 'users', auth.currentUser.uid, 'data', collection);
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as FlucState);
    } else {
      callback(null);
    }
  });
};
