'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { verifyEmail, resendVerification } from '@/lib/arbiter-api'
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function VerifyContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verifying your email address...')
  const [resendEmail, setResendEmail] = useState('')
  const [showResend, setShowResend] = useState(false)
  const [resendStatus, setResendStatus] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Verification token is missing in the URL.')
      return
    }

    let isMounted = true
    const doVerification = async () => {
      try {
        const res = await verifyEmail(token)
        if (isMounted) {
          setStatus('success')
          setMessage(res.message || 'Your email has been verified successfully!')
        }
      } catch (err) {
        if (isMounted) {
          setStatus('error')
          setMessage(err instanceof Error ? err.message : 'Invalid or expired verification token.')
          setShowResend(true)
        }
      }
    }

    doVerification()
    return () => {
      isMounted = false
    }
  }, [token])

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resendEmail) return
    setIsResending(true)
    setResendStatus(null)
    try {
      const res = await resendVerification(resendEmail)
      setResendStatus(res.message || 'Verification link sent successfully!')
    } catch (err) {
      setResendStatus(err instanceof Error ? err.message : 'Failed to resend verification link.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Card className="border border-border bg-card/70 backdrop-blur-md shadow-2xl rounded-2xl w-full max-w-md relative z-10">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
          {status === 'loading' && (
            <div className="bg-primary/20 p-4 rounded-2xl">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}
          {status === 'success' && (
            <div className="bg-emerald-500/20 p-4 rounded-2xl text-emerald-500">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          )}
          {status === 'error' && (
            <div className="bg-red-500/20 p-4 rounded-2xl text-red-500">
              <XCircle className="w-8 h-8" />
            </div>
          )}
        </div>
        <CardTitle className="text-3xl font-bold text-foreground tracking-tight">
          {status === 'loading' && 'Verifying...'}
          {status === 'success' && 'Email Verified!'}
          {status === 'error' && 'Verification Failed'}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-4 text-center">
        {status === 'success' ? (
          <p className="text-sm text-foreground/85 leading-relaxed font-medium">
            Your email is verified. You can now close this window, go back to the website, and log in.
          </p>
        ) : (
          <p className="text-sm text-foreground/85 leading-relaxed font-medium">
            {message}
          </p>
        )}

        {status === 'success' && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-500 font-medium">
            Account activated successfully.
          </div>
        )}

        {status === 'error' && showResend && (
          <div className="mt-6 text-left border-t border-border/50 pt-4">
            <p className="text-xs font-semibold text-foreground/80 mb-2">Request a new verification email:</p>
            <form onSubmit={handleResend} className="flex gap-2">
              <input
                type="email"
                required
                placeholder="Enter your email address"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                className="flex-1 bg-background/50 border border-border text-xs rounded-lg px-3 py-2 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary transition-colors"
              />
              <Button type="submit" disabled={isResending} className="text-xs px-3 py-2 h-auto cursor-pointer">
                {isResending ? 'Sending...' : 'Send'}
              </Button>
            </form>
            {resendStatus && (
              <p className="text-[11px] text-primary mt-2 font-medium">{resendStatus}</p>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-center pb-6 pt-2">
        {status === 'success' ? (
          <div className="text-xs text-foreground/50 text-center font-medium">
            Safe to close this tab.
          </div>
        ) : status === 'error' ? (
          <div className="flex gap-3 w-full">
            <Link href="/signup" className="flex-1">
              <Button variant="outline" className="w-full border border-border bg-background/50 text-foreground hover:bg-primary/5 cursor-pointer">
                Sign Up
              </Button>
            </Link>
            <Link href="/login" className="flex-1">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
                Log In
              </Button>
            </Link>
          </div>
        ) : null}
      </CardFooter>
    </Card>
  )
}

export default function VerifyPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6 lg:px-8">
      {/* Back to Home Button */}
      <div className="absolute top-8 left-8 z-20">
        <Link href="/">
          <Button variant="ghost" className="flex items-center gap-2 text-foreground/80 hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      {/* Animated background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
          animate={{
            y: [0, 40, 0],
            x: [0, 40, 0],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-secondary/10 blur-3xl"
          animate={{
            y: [0, -40, 0],
            x: [0, -40, 0],
          }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>

      <Suspense fallback={
        <Card className="border border-border bg-card/70 backdrop-blur-md shadow-2xl rounded-2xl w-full max-w-md relative z-10">
          <CardContent className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-sm text-foreground/80">Loading verification workbench...</p>
          </CardContent>
        </Card>
      }>
        <VerifyContent />
      </Suspense>
    </main>
  )
}
