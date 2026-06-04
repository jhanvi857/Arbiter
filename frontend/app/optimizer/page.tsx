'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  Sparkles,
  Database,
  Code,
  ArrowRight,
  CheckCircle,
  Clock,
  TrendingDown,
  Activity,
  Layers,
  Info,
  Server,
} from 'lucide-react'
import { optimizeQuery, type QueryOptimizeResponse } from '@/lib/arbiter-api'

const TEMPLATES = [
  {
    name: 'Unindexed Filter Query',
    db: 'SQLite',
    sql: `SELECT *
FROM orders
WHERE customer_id = 45920
  AND status = 'pending'
ORDER BY created_at DESC
LIMIT 50;`,
  },
  {
    name: 'Heavy Three-Way JOIN',
    db: 'SQLite',
    sql: `SELECT c.name, COUNT(o.id) as total_orders, SUM(o.amount) as total_spend
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items i ON o.id = i.order_id
WHERE o.created_at >= '2025-01-01'
GROUP BY c.id, c.name
ORDER BY total_spend DESC;`,
  },
  {
    name: 'Nested Correlated Subquery',
    db: 'SQLite',
    sql: `SELECT name, department, salary
FROM employees e
WHERE salary > (
  SELECT AVG(salary)
  FROM employees
  WHERE department = e.department
);`,
  },
]

const STAGES = [
  { label: 'Parsing SQL AST', desc: 'Validating syntax and building abstract tree' },
  { label: 'Featurizing Plan', desc: 'Encoding query structural features' },
  { label: 'ML Cost Estimation', desc: 'Predicting execution cost from the trained model' },
  { label: 'Plan Search & Rewrite', desc: 'Comparing the live plan A and plan B measurements' },
]

function formatConfidence(confidence: string) {
  return confidence.toLowerCase()
}

export default function OptimizerPage() {
  const [sql, setSql] = useState(TEMPLATES[0].sql)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [currentStage, setCurrentStage] = useState(-1)
  const [result, setResult] = useState<QueryOptimizeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTemplateClick = (template: (typeof TEMPLATES)[0]) => {
    setSql(template.sql)
    setResult(null)
    setError(null)
  }

  const startOptimization = async () => {
    setError(null)
    setResult(null)
    setIsOptimizing(true)
    setCurrentStage(0)

    const stageTimer = setInterval(() => {
      setCurrentStage((previous) => Math.min(previous + 1, STAGES.length - 1))
    }, 700)

    try {
      const response = await optimizeQuery(sql)
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimizer request failed')
    } finally {
      clearInterval(stageTimer)
      setIsOptimizing(false)
      setCurrentStage(-1)
    }
  }

  const chosenPlan = result ? (result.recommendation === 'plan_b' ? result.plan_b : result.plan_a) : null
  const originalPlan = result?.plan_a ?? null
  const optimizedPlan = result?.plan_b ?? null
  const savings =
    result && originalPlan && chosenPlan
      ? Math.max(0, originalPlan.predicted_cost_ms - chosenPlan.predicted_cost_ms)
      : null

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-10 pt-16 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
              <Sparkles className="h-8 w-8 text-primary" />
              Query Optimizer Workbench
            </h1>
            <p className="mt-1 text-foreground/75">
              Send a live query to the backend and compare the predicted and measured execution costs.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary">
              Backend-linked model
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/40 p-4">
          <span className="mr-2 flex items-center gap-1.5 text-sm font-semibold text-foreground/80">
            <Server className="h-4 w-4 text-primary" />
            Load Template:
          </span>
          {TEMPLATES.map((template) => (
            <Button
              key={template.name}
              variant="outline"
              size="sm"
              onClick={() => handleTemplateClick(template)}
              className="border-border bg-card px-3 py-1.5 text-xs text-foreground hover:border-primary/50 hover:bg-primary/5"
            >
              {template.name} ({template.db})
            </Button>
          ))}
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <Card className="border border-border bg-card shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg font-bold text-foreground">SQL Query Input</CardTitle>
                  <Badge variant="outline" className="border-border bg-background text-xs text-foreground/80">
                    SQLite backend
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative overflow-hidden rounded-lg border border-border font-mono text-sm">
                  <div className="absolute bottom-0 left-0 top-0 flex w-10 select-none flex-col items-center border-r border-border/50 bg-muted/30 pt-4 text-foreground/30">
                    {Array.from({ length: 9 }).map((_, index) => (
                      <span key={index} className="leading-relaxed">
                        {index + 1}
                      </span>
                    ))}
                  </div>
                  <textarea
                    value={sql}
                    onChange={(event) => setSql(event.target.value)}
                    rows={10}
                    className="w-full resize-none bg-card py-4 pl-14 pr-4 font-mono leading-relaxed text-foreground focus:outline-none"
                    placeholder="Enter SELECT query here..."
                  />
                </div>

                <Button
                  onClick={startOptimization}
                  disabled={isOptimizing}
                  className="flex w-full items-center justify-center gap-2 bg-primary py-6 text-base font-bold text-primary-foreground shadow-md shadow-primary/10 hover:bg-primary/90"
                >
                  <Play className="h-5 w-5 fill-current" />
                  {isOptimizing ? 'Analyzing Query...' : 'Optimize Query'}
                </Button>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </CardContent>
            </Card>

            <AnimatePresence>
              {isOptimizing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className="border border-primary/20 bg-primary/5">
                    <CardContent className="space-y-3 py-4">
                      <div className="flex items-center justify-between text-sm font-semibold text-primary">
                        <span>Optimizing with Arbiter ML...</span>
                        <Activity className="h-4 w-4 animate-pulse" />
                      </div>
                      <div className="space-y-2.5">
                        {STAGES.map((stage, index) => (
                          <div key={stage.label} className="flex items-start gap-2.5">
                            <div className="mt-1 flex h-4.5 w-4.5 items-center justify-center">
                              {currentStage > index ? (
                                <CheckCircle className="h-4 w-4 text-primary fill-primary-foreground" />
                              ) : currentStage === index ? (
                                <div className="h-2.5 w-2.5 animate-ping rounded-full bg-primary" />
                              ) : (
                                <div className="h-2 w-2 rounded-full bg-border" />
                              )}
                            </div>
                            <div>
                              <div className={`text-xs font-semibold ${currentStage === index ? 'font-bold text-foreground' : 'text-foreground/60'}`}>
                                {stage.label}
                              </div>
                              {currentStage === index && <div className="text-[10px] text-foreground/70">{stage.desc}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-7">
            {result ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border border-border bg-card p-4">
                    <div className="flex items-center gap-1 text-xs font-semibold uppercase text-foreground/60">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      Cost Reduction
                    </div>
                    <div className="mt-1 text-2xl font-bold text-primary">
                      {savings === null ? '0.00 ms' : `${savings.toFixed(2)} ms`}
                    </div>
                    <div className="mt-0.5 text-[10px] text-foreground/50">Plan A vs recommended plan</div>
                  </Card>
                  <Card className="border border-border bg-card p-4">
                    <div className="flex items-center gap-1 text-xs font-semibold uppercase text-foreground/60">
                      <TrendingDown className="h-3.5 w-3.5 text-secondary" />
                      Latency Est.
                    </div>
                    <div className="mt-1 text-2xl font-bold text-foreground">
                      {chosenPlan ? `${chosenPlan.predicted_cost_ms.toFixed(2)} ms` : '0.00 ms'}
                    </div>
                    <div className="mt-0.5 text-[10px] text-foreground/50">
                      {chosenPlan ? `Confidence ${formatConfidence(chosenPlan.confidence)}` : 'No plan selected'}
                    </div>
                  </Card>
                  <Card className="border border-border bg-card p-4">
                    <div className="flex items-center gap-1 text-xs font-semibold uppercase text-foreground/60">
                      <Layers className="h-3.5 w-3.5 text-indigo-500" />
                      Actual Latency
                    </div>
                    <div className="mt-1 text-2xl font-bold text-foreground">
                      {result.actual_cost_ms.toFixed(2)} ms
                    </div>
                    <div className="mt-0.5 text-[10px] text-foreground/50">Measured by backend execution</div>
                  </Card>
                </div>

                <Card className="border border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-foreground">Actionable Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <div className="text-xs">
                        <div className="font-semibold text-foreground">Recommendation</div>
                        <div className="mt-0.5 text-foreground/75">{result.plan_b.suggestion}</div>
                      </div>
                    </div>
                    <div className="flex gap-3 rounded-lg border border-secondary/20 bg-secondary/5 p-3">
                      <Info className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                      <div className="text-xs">
                        <div className="font-semibold text-foreground">Selected Plan</div>
                        <div className="mt-0.5 text-foreground/75">
                          {result.recommendation === 'plan_b' ? 'Plan B was selected because it had the lower predicted cost.' : 'Plan A was selected because the rewrite did not improve the prediction.'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-1 text-base font-bold text-foreground">
                      <Code className="h-4 w-4 text-primary" />
                      Query Rewriting Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 divide-y divide-border border-t border-border p-0 md:grid-cols-2 md:divide-x md:divide-y-0">
                    <div className="p-4">
                      <div className="mb-2 text-xs font-semibold uppercase text-foreground/60">Plan A</div>
                      <pre className="overflow-x-auto rounded-lg border border-border/30 bg-muted/20 p-3 font-mono text-xs leading-relaxed text-foreground/80">
                        {result.plan_a.sql}
                      </pre>
                      <div className="mt-3 text-xs text-foreground/70">
                        {result.plan_a.predicted_cost_ms.toFixed(2)} ms, confidence {formatConfidence(result.plan_a.confidence)}
                      </div>
                    </div>
                    <div className="bg-primary/1 p-4">
                      <div className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase text-primary">
                        <Sparkles className="h-3 w-3" />
                        {result.plan_b.optimization_type ? `Plan B (${result.plan_b.optimization_type})` : 'Plan B'}
                      </div>
                      <pre className="overflow-x-auto rounded-lg border border-primary/20 bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground">
                        {result.plan_b.sql}
                      </pre>
                      <div className="mt-3 text-xs text-foreground/70">
                        {result.plan_b.predicted_cost_ms.toFixed(2)} ms, confidence {formatConfidence(result.plan_b.confidence)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-1.5 text-base font-bold text-foreground">
                      <Layers className="h-4 w-4 text-primary" />
                      Live Execution Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center gap-4 rounded-xl border border-border/30 bg-muted/10 py-6">
                      <div className="rounded-lg border border-primary/20 bg-primary text-center text-xs font-bold text-primary-foreground shadow px-4 py-2">
                        Recommendation: {result.recommendation.toUpperCase()}
                        <div className="text-[10px] font-normal opacity-80">Actual: {result.actual_cost_ms.toFixed(2)} ms</div>
                      </div>
                      <ArrowRight className="h-4 w-4 rotate-90 text-foreground/40" />
                      <div className="rounded-lg border border-border bg-card px-4 py-2 text-center text-xs font-bold text-foreground shadow">
                        {optimizedPlan?.optimization_type ? `Optimization type: ${optimizedPlan.optimization_type}` : 'No rewrite applied'}
                        <div className="text-[10px] font-normal text-foreground/60">
                          Model error: {result.model_error_ms.toFixed(2)} ms
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 rotate-90 text-foreground/40" />
                      <div className="rounded-lg border border-border/50 bg-muted/50 px-4 py-2 text-center text-xs font-semibold text-foreground/80">
                        Backend executed the selected plan and stored the real measurements in query_logs.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="flex min-h-155 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/20 p-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
                  <Database className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Waiting for SQL Input</h3>
                <p className="mt-2 max-w-sm text-sm text-foreground/70">
                  Configure a query in the editor and click Optimize Query to fetch live predictions and measured latency from the backend.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}