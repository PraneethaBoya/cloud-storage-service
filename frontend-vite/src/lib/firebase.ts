import { initializeApp } from 'firebase/app'
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string
const appId = import.meta.env.VITE_FIREBASE_APP_ID as string

if (!apiKey) throw new Error('Missing VITE_FIREBASE_API_KEY')
if (!authDomain) throw new Error('Missing VITE_FIREBASE_AUTH_DOMAIN')
if (!projectId) throw new Error('Missing VITE_FIREBASE_PROJECT_ID')
if (!storageBucket) throw new Error('Missing VITE_FIREBASE_STORAGE_BUCKET')
if (!messagingSenderId) throw new Error('Missing VITE_FIREBASE_MESSAGING_SENDER_ID')
if (!appId) throw new Error('Missing VITE_FIREBASE_APP_ID')

const app = initializeApp({
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
})

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

setPersistence(auth, browserLocalPersistence).catch(() => {
  // Ignore persistence errors (e.g. blocked third-party cookies / private mode)
})
