'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Database, Zap, Brain, Settings } from 'lucide-react'
import { ArrowRight } from 'lucide-react'

const architectureSteps = [
  {
    icon: Database,
    label: 'Database Logs',
    description: 'Collect query logs and execution metrics',
    tone: 'bg-primary',
  },
  {
    icon: Zap,
    label: 'Feature Engineering',
    description: 'Extract meaningful features from raw data',
    tone: 'bg-secondary',
  },
  {
    icon: Brain,
    label: 'ML Training Pipeline',
    description: 'Train models on historical query data',
    tone: 'bg-accent',
  },
  {
    icon: Settings,
    label: 'Prediction Model',
    description: 'Real-time predictions on new queries',
    tone: 'bg-primary',
  },
  {
    icon: Zap,
    label: 'Optimization Engine',
    description: 'Generate optimized query plans',
    tone: 'bg-secondary',
  },
]

export function ArchitectureSection() {
  return (
    <section id="documentation" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-balance text-4xl font-bold text-foreground sm:text-5xl mb-4">
            System Architecture
          </h2>
          <p className="text-lg text-foreground/80 text-balance">
            End-to-end ML pipeline for query optimization
          </p>
        </motion.div>

        {/* Desktop Architecture Flow */}
        <motion.div
          className="hidden lg:block mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center justify-between gap-4">
            {architectureSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={index} className="flex-1">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.15 }}
                    viewport={{ once: true }}
                  >
                    <Card className="relative border-border bg-card p-6 text-center group hover:shadow-lg transition-shadow">
                      {/* Icon Container */}
                      <motion.div
                        className={`mx-auto mb-4 inline-flex items-center justify-center w-14 h-14 rounded-xl ${step.tone} text-primary-foreground`}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                      >
                        <Icon className="w-7 h-7" />
                      </motion.div>

                      {/* Label */}
                      <h3 className="mb-2 font-semibold text-foreground">{step.label}</h3>
                      <p className="text-sm text-foreground/80">{step.description}</p>

                      {/* Arrow */}
                      {index < architectureSteps.length - 1 && (
                        <motion.div
                          className="absolute -right-12 top-1/2 -translate-y-1/2"
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <ArrowRight className="w-6 h-6 text-primary/80" />
                        </motion.div>
                      )}
                    </Card>
                  </motion.div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Mobile Architecture Flow */}
        <motion.div
          className="lg:hidden space-y-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          {architectureSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <Card className="border-border bg-card p-6">
                  <div className="flex items-center gap-4">
                    <motion.div
                      className={`flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl ${step.tone} text-primary-foreground`}
                      whileHover={{ scale: 1.1 }}
                    >
                      <Icon className="w-6 h-6" />
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{step.label}</h3>
                      <p className="text-sm text-foreground/80 mt-1">{step.description}</p>
                    </div>
                  </div>
                </Card>
                {index < architectureSteps.length - 1 && (
                  <motion.div
                    className="flex justify-center py-2"
                    animate={{ y: [0, 4, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <ArrowRight className="w-6 h-6 text-primary/80 rotate-90" />
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </motion.div>

        {/* Key Features Grid */}
        <motion.div
          className="mt-16 grid gap-4 md:grid-cols-3"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          viewport={{ once: true }}
        >
          {[
            { title: 'Scalable Infrastructure', description: 'Handles millions of queries per day' },
            { title: 'Real-time Processing', description: 'Sub-second optimization recommendations' },
            { title: 'Continuous Learning', description: 'Models improve with each query processed' },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="border-border bg-card p-6 text-center">
                <h4 className="font-semibold text-foreground mb-2">{feature.title}</h4>
                <p className="text-sm text-foreground/80">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
