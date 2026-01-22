import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { formatAuthError } from '../lib/authErrors'
import { useAuth } from '../lib/AuthContext'

export default function SignupPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: cred.user.email,
        createdAt: serverTimestamp(),
      })
      navigate('/dashboard')
    } catch (err) {
      setError(formatAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-xl font-semibold">Create account</h1>
        <p className="text-sm text-gray-600 mt-1">Sign up to start uploading files</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            className="w-full rounded bg-blue-600 text-white py-2 hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Creating…' : 'Sign up'}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4">
          Already have an account? <Link className="text-blue-600 hover:underline" to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
