'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  fetchModelStats,
  fetchQueryHistory,
  type ModelStatsResponse,
  type QueryHistoryItem,
} from '@/lib/arbiter-api'

export function AnalyticsSection() {
  const [history, setHistory] = useState<QueryHistoryItem[]>([])
  const [modelStats, setModelStats] = useState<ModelStatsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    Promise.all([fetchQueryHistory(), fetchModelStats()])
      .then(([historyResponse, statsResponse]) => {
        if (!active) {
          return
        }

        setHistory(historyResponse)
        setModelStats(statsResponse)
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load analytics data')
        }
      })

    return () => {
      active = false
    }
  }, [])

  const chartData = useMemo(
    () =>
      history
        .slice()
        .reverse()
        .slice(-8)
        .map((item) => ({
          time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          predicted: Number(item.predicted_cost_ms.toFixed(2)),
          actual: Number(item.actual_cost_ms.toFixed(2)),
        })),
    [history],
  )

  const featureImportanceData = useMemo(
    () =>
      Object.entries(modelStats?.feature_importances ?? {})
        .map(([name, value]) => ({ name, importance: Number(value.toFixed(4)) }))
        .sort((left, right) => right.importance - left.importance),
    [modelStats],
  )

  const workloadData = useMemo(() => {
    const hourlyBuckets = new Map<string, { period: string; queries: number; optimized: number }>()

    history.forEach((item) => {
      const hour = new Date(item.timestamp).getHours()
      const period = `${String(hour).padStart(2, '0')}:00`
      const bucket = hourlyBuckets.get(period) ?? { period, queries: 0, optimized: 0 }
      bucket.queries += 1
      bucket.optimized += item.actual_cost_ms <= item.predicted_cost_ms ? 1 : 0
      hourlyBuckets.set(period, bucket)
    })

    return Array.from(hourlyBuckets.values()).sort((left, right) => left.period.localeCompare(right.period))
  }, [history])

  const errorTrendData = useMemo(
    () =>
      history
        .slice()
        .reverse()
        .slice(-8)
        .map((item) => ({
          time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          error: Number(Math.abs(item.predicted_cost_ms - item.actual_cost_ms).toFixed(2)),
        })),
    [history],
  )

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  return (
    <section id="analytics" className="relative bg-background px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="mb-4 text-balance text-4xl font-bold text-foreground sm:text-5xl">
            Real-time Analytics & Insights
          </h2>
          <p className="text-balance text-lg text-foreground/80">
            Live history from the optimizer logs and the trained model metadata.
          </p>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </motion.div>

        <motion.div
          className="grid gap-6 lg:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={itemVariants}>
            <Card className="border-border bg-card p-6">
              <h3 className="mb-6 font-semibold text-foreground">Query Execution Costs</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis dataKey="time" stroke="var(--foreground)" opacity={0.6} />
                  <YAxis stroke="var(--foreground)" opacity={0.6} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--foreground)',
                    }}
                  />
                  <Area type="monotone" dataKey="predicted" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="actual" stroke="var(--secondary)" fill="var(--secondary)" fillOpacity={0.08} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-border bg-card p-6">
              <h3 className="mb-6 font-semibold text-foreground">Feature Importance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={featureImportanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis type="number" stroke="var(--foreground)" opacity={0.6} />
                  <YAxis dataKey="name" type="category" stroke="var(--foreground)" opacity={0.6} width={110} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--foreground)',
                    }}
                  />
                  <Bar dataKey="importance" fill="var(--primary)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-border bg-card p-6">
              <h3 className="mb-6 font-semibold text-foreground">Database Workload</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={workloadData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis dataKey="period" stroke="var(--foreground)" opacity={0.6} />
                  <YAxis stroke="var(--foreground)" opacity={0.6} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--foreground)',
                    }}
                  />
                  <Bar dataKey="queries" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="optimized" fill="var(--secondary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-border bg-card p-6">
              <h3 className="mb-6 font-semibold text-foreground">Prediction Error Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={errorTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis dataKey="time" stroke="var(--foreground)" opacity={0.6} />
                  <YAxis stroke="var(--foreground)" opacity={0.6} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--foreground)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="error"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    dot={{ fill: 'var(--primary)', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
