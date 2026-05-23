'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import {
  TrendingDown,
  Zap,
  BarChart3,
  Brain,
  Gauge,
  Eye,
} from 'lucide-react'

const features = [
  {
    icon: TrendingDown,
    title: 'Query Cost Prediction',
    description: 'ML models predict execution costs before query execution for better planning',
    tone: 'bg-primary',
  },
  {
    icon: BarChart3,
    title: 'Execution Plan Analysis',
    description: 'Detailed analysis of query execution plans with actionable optimization insights',
    tone: 'bg-secondary',
  },
  {
    icon: Brain,
    title: 'Query Classification',
    description: 'Automatic classification of query types and patterns for smart recommendations',
    tone: 'bg-accent',
  },
  {
    icon: Zap,
    title: 'AI Optimization Suggestions',
    description: 'Get intelligent, context-aware suggestions to optimize your database queries',
    tone: 'bg-primary',
  },
  {
    icon: Gauge,
    title: 'Performance Benchmarking',
    description: 'Compare query performance against industry benchmarks and best practices',
    tone: 'bg-secondary',
  },
  {
    icon: Eye,
    title: 'Real-time Monitoring',
    description: 'Live monitoring of query performance metrics across your entire database',
    tone: 'bg-accent',
  },
]

export function FeaturesSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  return (
    <section id="features" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-background">
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
            Powerful Features for Query Optimization
          </h2>
          <p className="text-lg text-foreground/95 text-balance">
            Everything you need to optimize database queries with machine learning
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div key={index} variants={itemVariants}>
                <Card className="group relative overflow-hidden h-full border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10">
                  {/* Background Accent */}
                  <div
                    className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-15"
                    style={{
                      background: `radial-gradient(circle at center, var(--${feature.tone.split('-')[1]}) 0%, transparent 65%)`,
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Content */}
                  <div className="relative z-10">
                    {/* Icon */}
                    <motion.div
                      className={`mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl ${feature.tone} text-primary-foreground`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    >
                      <Icon className="w-6 h-6" />
                    </motion.div>

                    {/* Title */}
                    <h3 className="mb-2 text-xl font-bold text-foreground">
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-foreground/95 line-clamp-3">
                      {feature.description}
                    </p>

                    {/* Bottom accent line */}
                    <motion.div
                      className={`absolute bottom-0 left-0 h-1 ${feature.tone}`}
                      initial={{ width: 0 }}
                      whileHover={{ width: '100%' }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
