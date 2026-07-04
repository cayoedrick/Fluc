import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp, 
  DocumentData
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const getUserDocRef = (path: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  // Construct path: /users/{userId}/data/{path}
  return doc(db, 'users', user.uid, 'data', path);
};

export const saveData = async (path: string, data: DocumentData) => {
  try {
    const ref = getUserDocRef(path);
    const docSnapshot = await getDoc(ref);
    const timestamp = serverTimestamp();

    if (!docSnapshot.exists()) {
      await setDoc(ref, {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    } else {
      await updateDoc(ref, {
        ...data,
        updatedAt: timestamp
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteData = async (path: string) => {
  try {
    const ref = getUserDocRef(path);
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const subscribeToData = (path: string, callback: (data: DocumentData | null) => void) => {
  const ref = getUserDocRef(path);
  return onSnapshot(ref, (doc) => {
    callback(doc.exists() ? doc.data() : null);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};
