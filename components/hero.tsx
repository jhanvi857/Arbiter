'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Code, TrendingDown, Zap } from 'lucide-react'

export function HeroSection() {
  const floatingCards = [
    { label: 'Execution Cost Reduced', value: '72%', delay: 0 },
    { label: 'Latency Improvement', value: '45%', delay: 0.2 },
    { label: 'Prediction Accuracy', value: '94%', delay: 0.4 },
  ]

  const floatingCardPositions = [
    { top: '40px', right: '-96px' },
    { top: '180px', right: '-130px' },
    { top: '320px', right: '-84px' },
  ]

  return (
    <section id="home" className="relative min-h-screen overflow-hidden bg-background pt-32 pb-20">
      {/* Animated background elements */}
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
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          {/* Left Side */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badges */}
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

            {/* Headline */}
            <motion.h1
              className="mb-6 text-balance text-5xl font-bold leading-tight text-foreground sm:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Optimize Database Queries Using{' '}
              <span className="text-primary">
                Machine Learning
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              className="mb-8 text-lg text-foreground/95 text-balance sm:text-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Predict execution cost, recommend optimized query plans, analyze performance bottlenecks, and improve database efficiency through AI-powered optimization.
            </motion.p>

            {/* CTA Buttons */}
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
                Try Optimizer
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary/30 text-foreground hover:bg-primary/5"
              >
                View Architecture
              </Button>
            </motion.div>
          </motion.div>

          {/* Right Side - Dashboard Illustration */}
          <motion.div
            className="relative h-96 sm:h-[500px]"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="absolute inset-0 rounded-2xl bg-card/70 p-6 backdrop-blur-md border border-border shadow-2xl">
              {/* Mock Dashboard */}
              <div className="space-y-4">
                {/* SQL Editor */}
                <motion.div
                  className="rounded-lg bg-card p-4 border border-border"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="mb-2 flex h-3 gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    <div className="h-3 w-3 rounded-full bg-secondary" />
                    <div className="h-3 w-3 rounded-full bg-accent" />
                  </div>
                  <code className="text-xs text-foreground/95 line-clamp-3">
                    SELECT * FROM Orders JOIN Customers...
                  </code>
                </motion.div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {floatingCards.map((card, i) => (
                    <motion.div
                      key={card.label}
                      className="rounded-lg bg-background/20 p-3 border border-border"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + card.delay }}
                      whileHover={{ y: -5 }}
                    >
                      <div className="text-xs text-foreground/95 font-medium">{card.label}</div>
                      <div className="mt-1 text-xl font-bold text-primary">{card.value}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Mini Chart */}
                <motion.div
                  className="rounded-lg bg-card p-3 h-20 border border-border flex items-end gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  {[0.3, 0.6, 0.4, 0.8, 0.5, 0.9, 0.7].map((height, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-t bg-primary"
                      initial={{ height: 0 }}
                      animate={{ height: `${height * 100}%` }}
                      transition={{ delay: 1 + i * 0.1, duration: 0.5 }}
                    />
                  ))}
                </motion.div>
              </div>
            </div>

            {/* Floating elements */}
            {floatingCards.map((card, index) => (
              <motion.div
                key={`float-${card.label}`}
                className="absolute hidden rounded-xl bg-card/80 p-4 shadow-lg border border-border backdrop-blur-md lg:block"
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
