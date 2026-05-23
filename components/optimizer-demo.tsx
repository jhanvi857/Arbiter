'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Code } from 'lucide-react'

export function OptimizerDemo() {
  const pipelineStages = [
    { label: 'Raw Query', icon: Code },
    { label: 'Parser', icon: Code },
    { label: 'Feature Extraction', icon: Code },
    { label: 'ML Model', icon: Code },
    { label: 'Cost Estimation', icon: Code },
    { label: 'Optimized Query', icon: Code },
  ]

  const sampleQuery = `SELECT * FROM Orders
JOIN Customers
ON Orders.customer_id = Customers.id
WHERE Orders.amount > 500;`

  const metrics = [
    { label: 'Original Cost', value: '2.54s', color: 'bg-primary/20 text-primary' },
    { label: 'Optimized Cost', value: '0.71s', color: 'bg-secondary/20 text-secondary-foreground' },
    { label: 'Latency Reduction', value: '72%', color: 'bg-accent/20 text-accent-foreground' },
    { label: 'Suggested Indexes', value: '3', color: 'bg-card text-card-foreground border border-border' },
  ]

  return (
    <section id="optimizer" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-background">
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
            Interactive Optimizer Demo
          </h2>
          <p className="text-lg text-foreground/95 text-balance">
            See how our ML engine transforms your queries in real-time
          </p>
        </motion.div>

        {/* Demo Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left - SQL Input */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="h-full border-border bg-card p-6">
              <h3 className="mb-4 font-semibold text-foreground">SQL Input</h3>
              <div className="rounded-lg bg-card p-4 border border-border font-mono text-sm text-foreground/95 leading-relaxed overflow-x-auto">
                {sampleQuery}
              </div>
              <Button
                className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Optimize Query
              </Button>
            </Card>
          </motion.div>

          {/* Center - Pipeline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex items-center justify-center"
          >
            <Card className="border-border bg-card p-8 w-full lg:w-auto">
              <div className="space-y-4">
                {pipelineStages.map((stage, index) => (
                  <motion.div
                    key={stage.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-3"
                  >
                    <div className="rounded-lg bg-primary p-2 text-primary-foreground">
                      <stage.icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm text-foreground">{stage.label}</span>
                    {index < pipelineStages.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-primary ml-auto hidden sm:block" />
                    )}
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Right - Results */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="h-full border-border bg-card p-6">
              <h3 className="mb-4 font-semibold text-foreground">Results</h3>
              <div className="space-y-3">
                {metrics.map((metric, i) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="rounded-lg p-3 bg-card border border-border"
                  >
                    <div className="text-xs text-foreground/95 font-medium mb-1">
                      {metric.label}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">
                        {metric.value}
                      </span>
                      <Badge className={metric.color} variant="secondary">
                        {metric.label.includes('Reduction') ? 'Improvement' : 'Optimized'}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          viewport={{ once: true }}
        >
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Try the Full Optimizer →
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
