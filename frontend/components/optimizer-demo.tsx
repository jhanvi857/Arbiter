'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Code, Play, Sparkles } from 'lucide-react'
import { optimizeQuery, type QueryOptimizeResponse } from '@/lib/arbiter-api'

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

  const [result, setResult] = useState<QueryOptimizeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const optimizedCost = result
    ? result.recommendation === 'plan_b'
      ? result.plan_b.predicted_cost_ms
      : result.plan_a.predicted_cost_ms
    : null

  const latencyReduction =
    result && optimizedCost
      ? Math.max(0, ((result.plan_a.predicted_cost_ms - optimizedCost) / result.plan_a.predicted_cost_ms) * 100)
      : null

  const metrics = result
    ? [
        { label: 'Plan A Cost', value: `${result.plan_a.predicted_cost_ms.toFixed(2)} ms`, color: 'bg-primary/20 text-primary' },
        { label: 'Plan B Cost', value: `${result.plan_b.predicted_cost_ms.toFixed(2)} ms`, color: 'bg-secondary/20 text-secondary-foreground' },
        { label: 'Measured Latency', value: `${result.actual_cost_ms.toFixed(2)} ms`, color: 'bg-accent/20 text-accent-foreground' },
        { label: 'Latency Reduction', value: latencyReduction === null ? '0.00%' : `${latencyReduction.toFixed(2)}%`, color: 'bg-card text-card-foreground border border-border' },
      ]
    : []

  const runDemo = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await optimizeQuery(sampleQuery)
      setResult(response)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'Failed to load live optimizer data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="optimizer" className="relative bg-background px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="mb-4 text-balance text-4xl font-bold text-foreground sm:text-5xl">
            Live Optimizer Demo
          </h2>
          <p className="text-balance text-lg text-foreground/95">
            Run a real query through the backend and inspect the measured plan costs.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="h-full border-border bg-card p-6">
              <h3 className="mb-4 font-semibold text-foreground">SQL Input</h3>
              <div className="overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-sm leading-relaxed text-foreground/95">
                {sampleQuery}
              </div>
              <Button
                className="mt-4 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={runDemo}
                disabled={loading}
              >
                <Play className="h-4 w-4" />
                {loading ? 'Running Live Optimization...' : 'Run Live Optimization'}
              </Button>
              {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex items-center justify-center"
          >
            <Card className="w-full border-border bg-card p-8 lg:w-auto">
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
                      <stage.icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{stage.label}</span>
                    {index < pipelineStages.length - 1 && (
                      <ArrowRight className="ml-auto hidden h-4 w-4 text-primary sm:block" />
                    )}
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="h-full border-border bg-card p-6">
              <h3 className="mb-4 font-semibold text-foreground">Results</h3>
              <div className="space-y-3">
                {metrics.length > 0 ? (
                  metrics.map((metric, index) => (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="rounded-lg border border-border bg-card p-3"
                    >
                      <div className="mb-1 text-xs font-medium text-foreground/95">{metric.label}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">{metric.value}</span>
                        <Badge className={metric.color} variant="secondary">
                          Live
                        </Badge>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-foreground/70">
                    Run the demo to fetch live optimizer numbers from the backend.
                  </div>
                )}

                {result && (
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-foreground/80">
                    {result.plan_b.suggestion}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        {result && (
          <motion.div
            className="mt-12 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            viewport={{ once: true }}
          >
            <Button size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={runDemo}>
              <Sparkles className="h-4 w-4" />
              Refresh Live Result
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  )
}
