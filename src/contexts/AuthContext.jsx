import { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../lib/firebase'
import {
  onAuthStateChanged,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!auth) {
      setInitializing(false)
      return
    }
    const unsub = onAuthStateChanged(
      auth,
      (u) => {
        setUser(u || null)
        setInitializing(false)
      },
      (err) => {
        setError(err)
        setInitializing(false)
      }
    )
    return () => unsub()
  }, [])

  async function signInAnon() {
    if (!auth) return
    setError(null)
    try {
      await signInAnonymously(auth)
    } catch (e) {
      setError(e)
    }
  }

  async function signInGoogle() {
    if (!auth) return
    setError(null)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (e) {
      setError(e)
    }
  }

  async function signOutUser() {
    if (!auth) return
    setError(null)
    try {
      await signOut(auth)
    } catch (e) {
      setError(e)
    }
  }

  const value = { user, initializing, error, signInAnon, signInGoogle, signOut: signOutUser }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}