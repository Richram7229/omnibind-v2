import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import baseFirebaseConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: "AIzaSyCP1KZtwCySfRNpkwsDm1dstd1jNOuWjjU",
  authDomain: "omnibind-core.firebaseapp.com",
  projectId: "omnibind-core",
  storageBucket: "omnibind-core.firebasestorage.app",
  messagingSenderId: "906038939023",
  appId: "1:906038939023:web:01f3d3aeefdc31cd5c0ffa"
};

// Prevent duplicate initialization
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = getFirestore(app);

// Global Error Handler for Firestore Permission Errors
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
