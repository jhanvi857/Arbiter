'use client'

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

const executionData = [
  { time: '00:00', cost: 2.5, optimized: 0.8 },
  { time: '04:00', cost: 2.8, optimized: 0.9 },
  { time: '08:00', cost: 2.2, optimized: 0.7 },
  { time: '12:00', cost: 3.1, optimized: 1.0 },
  { time: '16:00', cost: 2.9, optimized: 0.85 },
  { time: '20:00', cost: 2.6, optimized: 0.82 },
  { time: '24:00', cost: 2.4, optimized: 0.75 },
]

const accuracyData = [
  { name: 'Q1', accuracy: 92 },
  { name: 'Q2', accuracy: 94 },
  { name: 'Q3', accuracy: 95 },
  { name: 'Q4', accuracy: 96 },
  { name: 'Q5', accuracy: 97 },
  { name: 'Q6', accuracy: 98 },
]

const workloadData = [
  { period: 'Morning', queries: 45, optimized: 40 },
  { period: 'Afternoon', queries: 52, optimized: 48 },
  { period: 'Evening', queries: 38, optimized: 35 },
  { period: 'Night', queries: 28, optimized: 25 },
]

export function AnalyticsSection() {
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
    <section id="analytics" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-background">
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
            Real-time Analytics & Insights
          </h2>
          <p className="text-lg text-foreground/80 text-balance">
            Monitor performance metrics and optimization trends across your database
          </p>
        </motion.div>

        {/* Charts Grid */}
        <motion.div
          className="grid gap-6 lg:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Query Execution Graph */}
          <motion.div variants={itemVariants}>
            <Card className="border-border bg-card p-6">
              <h3 className="mb-6 font-semibold text-foreground">Query Execution Costs</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={executionData}>
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
                  <Area type="monotone" dataKey="cost" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="optimized" stroke="var(--secondary)" fill="var(--secondary)" fillOpacity={0.08} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* Model Accuracy Graph */}
          <motion.div variants={itemVariants}>
            <Card className="border-border bg-card p-6">
              <h3 className="mb-6 font-semibold text-foreground">Prediction Accuracy</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={accuracyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis dataKey="name" stroke="var(--foreground)" opacity={0.6} />
                  <YAxis stroke="var(--foreground)" opacity={0.6} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--foreground)',
                    }}
                  />
                  <Bar dataKey="accuracy" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* Database Workload */}
          <motion.div variants={itemVariants}>
            <Card className="border-border bg-card p-6">
              <h3 className="mb-6 font-semibold text-foreground">Database Workload</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={workloadData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis dataKey="period" stroke="var(--foreground)" opacity={0.6} />
                  <YAxis stroke="var(--foreground)" opacity={0.6} />
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

          {/* Optimization Trends */}
          <motion.div variants={itemVariants}>
            <Card className="border-border bg-card p-6">
              <h3 className="mb-6 font-semibold text-foreground">Optimization Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={executionData}>
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
                    dataKey="cost" 
                    stroke="var(--primary)" 
                    strokeWidth={3}
                    dot={{ fill: "var(--primary)", r: 5 }}
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
