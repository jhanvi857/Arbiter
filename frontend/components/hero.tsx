'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Code, TrendingDown, Zap } from 'lucide-react'
import Link from 'next/link'
import { fetchModelStats, type ModelStatsResponse } from '@/lib/arbiter-api'

export function HeroSection() {
  const [modelStats, setModelStats] = useState<ModelStatsResponse | null>(null)

  useEffect(() => {
    let active = true

    fetchModelStats()
      .then((stats) => {
        if (active) {
          setModelStats(stats)
        }
      })
      .catch(() => {
        if (active) {
          setModelStats(null)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const floatingCards = [
    {
      label: 'Training Samples',
      value: modelStats ? modelStats.training_samples.toLocaleString() : 'Loading',
      delay: 0,
    },
    {
      label: 'MAE (ms)',
      value: modelStats ? modelStats.mae_ms.toFixed(2) : 'Loading',
      delay: 0.2,
    },
    {
      label: 'R² Score',
      value: modelStats ? modelStats.r2_score.toFixed(4) : 'Loading',
      delay: 0.4,
    },
  ]

  const floatingCardPositions = [
    { top: '40px', right: '-96px' },
    { top: '180px', right: '-130px' },
    { top: '320px', right: '-84px' },
  ]

  return (
    <section id="home" className="relative min-h-screen overflow-hidden bg-background pt-32 pb-20">
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
          animate={{
            y: [0, 50, 0],
            x: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-secondary/10 blur-3xl"
          animate={{
            y: [0, -50, 0],
            x: [0, -30, 0],
          }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-8 flex flex-wrap gap-3">
              {[
                { icon: Zap, label: 'ML Powered' },
                { icon: TrendingDown, label: 'Real-time Analysis' },
                { icon: Code, label: 'Query Cost Prediction' },
              ].map((badge, i) => (
                <motion.div
                  key={badge.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                >
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                  >
                    <badge.icon className="mr-1 h-3 w-3" />
                    {badge.label}
                  </Badge>
                </motion.div>
              ))}
            </div>

            <motion.h1
              className="mb-6 text-balance text-5xl font-bold leading-tight text-foreground sm:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Optimize Database Queries Using{' '}
              <span className="text-primary">Machine Learning</span>
            </motion.h1>

            <motion.p
              className="mb-8 text-balance text-lg text-foreground/95 sm:text-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Predict execution cost, recommend optimized query plans, analyze performance bottlenecks, and improve database efficiency through AI-powered optimization.
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Link href="/optimizer">Try Optimizer</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary/30 text-foreground hover:bg-primary/10 hover:text-primary"
              >
                <Link href="/architecture">View Architecture</Link>
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            className="relative h-96 sm:h-auto"
            style={{ minHeight: '500px' }}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="absolute inset-0 rounded-2xl border border-border bg-card/70 p-6 shadow-2xl backdrop-blur-md">
              <div className="space-y-4">
                <motion.div
                  className="rounded-lg border border-border bg-card p-4"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="mb-2 flex h-3 gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    <div className="h-3 w-3 rounded-full bg-secondary" />
                    <div className="h-3 w-3 rounded-full bg-accent" />
                  </div>
                  <code className="line-clamp-3 text-xs text-foreground/95">
                    {modelStats
                      ? `Trained model samples: ${modelStats.training_samples.toLocaleString()} | MAE: ${modelStats.mae_ms.toFixed(2)} ms | R²: ${modelStats.r2_score.toFixed(4)}`
                      : 'Loading live model statistics from the backend...'}
                  </code>
                </motion.div>

                <div className="grid grid-cols-2 gap-3">
                  {floatingCards.map((card) => (
                    <motion.div
                      key={card.label}
                      className="rounded-lg border border-border bg-background/20 p-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + card.delay }}
                      whileHover={{ y: -5 }}
                    >
                      <div className="text-xs font-medium text-foreground/95">{card.label}</div>
                      <div className="mt-1 text-xl font-bold text-primary">{card.value}</div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  className="flex h-20 items-end gap-1 rounded-lg border border-border bg-card p-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  {Object.values(modelStats?.feature_importances ?? {}).slice(0, 7).map((importance, index) => (
                    <motion.div
                      key={index}
                      className="flex-1 rounded-t bg-primary"
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(12, importance * 100)}%` }}
                      transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
                    />
                  ))}
                  {!modelStats && (
                    <div className="flex h-full items-center text-xs text-foreground/60">Waiting for live data</div>
                  )}
                </motion.div>
              </div>
            </div>

            {floatingCards.map((card, index) => (
              <motion.div
                key={`float-${card.label}`}
                className="absolute hidden rounded-xl border border-border bg-card/80 p-4 shadow-lg backdrop-blur-md lg:block"
                style={{
                  width: '180px',
                  ...floatingCardPositions[index],
                }}
                animate={{
                  y: [0, -20, 0],
                }}
                transition={{
                  duration: 4,
                  delay: card.delay,
                  repeat: Infinity,
                }}
              >
                <div className="text-xs font-medium text-foreground/95">{card.label}</div>
                <div className="text-2xl font-bold text-primary">{card.value}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
