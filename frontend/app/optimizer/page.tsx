'use client'

import { useState, useEffect, useRef } from 'react'
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
  Upload,
} from 'lucide-react'
import { 
  optimizeQuery, 
  fetchDatabaseStatus, 
  resetDatabase, 
  uploadDatabase,
  type QueryOptimizeResponse, 
  type DbStatusResponse 
} from '@/lib/arbiter-api'
import { Toaster, toast } from 'sonner'
import Link from 'next/link'

const TEMPLATES = [
  {
    name: 'Unindexed Filter Query',
    db: 'SQLite',
    sql: `SELECT oi.id, oi.price 
FROM order_items oi 
JOIN products p ON oi.product_id = p.id 
WHERE oi.price > (
    SELECT AVG(p2.price) FROM products p2 WHERE p2.category = p.category
);`,
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

  // Database status and dynamic ingestion states
  const [dbStatus, setDbStatus] = useState<DbStatusResponse | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({})
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDbStatus = async () => {
    try {
      const status = await fetchDatabaseStatus()
      setDbStatus(status)
    } catch (err) {
      console.error('Failed to load database status:', err)
    }
  }

  useEffect(() => {
    loadDbStatus()
    if (typeof window !== 'undefined') {
      setIsLoggedIn(!!localStorage.getItem('token'))
    }
  }, [])

  const toggleTable = (tableName: string) => {
    setExpandedTables((prev) => ({
      ...prev,
      [tableName]: !prev[tableName],
    }))
  }

  const handleDbUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const uploadToastId = toast.loading('Uploading database file...')

    try {
      const status = await uploadDatabase(file)
      setDbStatus(status)
      setResult(null)
      setError(null)
      // Pick a sample table from the uploaded database that isn't internal logs
      if (status.tables.length > 0) {
        const firstTable = status.tables.find((t) => t.name.toLowerCase() !== 'query_logs') || status.tables[0]
        setSql(`SELECT * FROM ${firstTable.name} LIMIT 10;`)
      } else {
        setSql('')
      }
      toast.success(`Successfully uploaded "${file.name}"!`, { id: uploadToastId })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload database', { id: uploadToastId })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDbReset = async () => {
    const resetToastId = toast.loading('Resetting database to E-Commerce demo database...')
    try {
      const status = await resetDatabase()
      setDbStatus(status)
      setResult(null)
      setError(null)
      setSql(TEMPLATES[0].sql)
      toast.success('Reset back to demo database successfully!', { id: resetToastId })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset database', { id: resetToastId })
    }
  }

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

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/40 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
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
                disabled={dbStatus ? !dbStatus.is_demo : false}
              >
                {template.name}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border/40 pt-3 lg:border-t-0 lg:pt-0">
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 text-xs">
              <Database className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium text-foreground/80">Database:</span>
              <span className="font-semibold text-foreground">{dbStatus?.database_name || 'optimizer.db'}</span>
              {dbStatus && (
                <span className="text-foreground/50">({dbStatus.size_mb.toFixed(2)} MB)</span>
              )}
              {dbStatus?.is_demo ? (
                <Badge className="bg-primary/10 border border-primary/20 text-primary text-[10px] py-0 px-1.5 hover:bg-primary/20">Demo DB</Badge>
              ) : (
                <Badge className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] py-0 px-1.5 hover:bg-amber-500/20">Custom DB</Badge>
              )}
            </div>

            {isLoggedIn ? (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleDbUpload}
                  accept=".db,.sqlite,.sqlite3"
                  className="hidden"
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 border-primary/20 bg-primary/5 text-xs font-semibold text-primary hover:bg-primary/10 hover:border-primary/40 cursor-pointer"
                  disabled={isUploading}
                >
                  <Upload className="h-3 w-3" />
                  {isUploading ? 'Uploading...' : 'Upload DB'}
                </Button>

                {dbStatus && !dbStatus.is_demo && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDbReset}
                    className="border-border bg-card text-xs text-foreground hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive cursor-pointer"
                  >
                    Reset to Demo
                  </Button>
                )}
              </>
            ) : (
              <span className="text-[10px] font-bold text-foreground/45 uppercase tracking-wider px-2">
                Log in to upload database
              </span>
            )}
          </div>
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

            {/* Database Schema Browser */}
            <Card className="border border-border bg-card/60 shadow-md">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-bold text-foreground">Database Schema Browser</CardTitle>
                  </div>
                  {dbStatus && (
                    <Badge variant="outline" className="text-[10px] font-semibold text-foreground/75 bg-background border-border/50">
                      {dbStatus.table_count} {dbStatus.table_count === 1 ? 'Table' : 'Tables'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-80 overflow-y-auto divide-y divide-border/30">
                {dbStatus && dbStatus.tables.length > 0 ? (
                  dbStatus.tables.map((table) => {
                    const isExpanded = expandedTables[table.name]
                    return (
                      <div key={table.name} className="flex flex-col bg-card/10 hover:bg-card/30 transition-colors">
                        <button
                          onClick={() => toggleTable(table.name)}
                          className="flex items-center justify-between w-full px-4 py-2.5 text-left focus:outline-none cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {table.name}
                            </span>
                            <span className="text-[10px] text-foreground/50 font-normal">
                              ({table.row_count.toLocaleString()} rows)
                            </span>
                          </div>
                          <span className="text-foreground/40 text-xs font-semibold select-none">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-3 pt-1 border-t border-dashed border-border/20 bg-muted/10">
                            <div className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider mb-1.5">Columns</div>
                            <div className="flex flex-wrap gap-1">
                              {table.columns.map((column) => (
                                <Badge
                                  key={column}
                                  variant="outline"
                                  className="font-mono text-[9px] py-0 px-1.5 border-border/40 bg-background text-foreground/75"
                                >
                                  {column}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="p-6 text-center text-xs text-foreground/50">
                    No tables found in the active database.
                  </div>
                )}
              </CardContent>
              {!isLoggedIn && (
                <div className="p-4 bg-primary/5 border-t border-border/30 text-center rounded-b-xl">
                  <p className="text-xs text-foreground/75 mb-2.5 font-medium leading-relaxed">
                    You are exploring Arbiter on the <strong>Demo Database</strong>. Log in to upload and optimize queries on your own SQLite database schemas.
                  </p>
                  <Link href="/login">
                    <Button size="sm" className="w-full bg-primary text-[11px] font-bold text-primary-foreground hover:bg-primary/90 h-8 cursor-pointer shadow shadow-primary/5">
                      Log In to Upload DB
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
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
              <div className="flex min-h-155 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/20 p-8 text-center animate-fade-in">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
                  <Database className="h-8 w-8 text-primary animate-pulse" />
                </div>
                {dbStatus && !dbStatus.is_demo ? (
                  <>
                    <h3 className="text-lg font-bold text-foreground">Custom Database Active</h3>
                    <p className="mt-2 max-w-sm text-sm text-foreground/70">
                      The custom database <code className="font-semibold text-primary">{dbStatus.database_name}</code> was loaded successfully.
                    </p>
                    <div className="mt-4 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3 text-xs text-foreground/80 max-w-md">
                      <strong>Schema update complete!</strong> Check the schema browser on the left to see the tables and columns. Enter a query in the editor and click <strong>Optimize Query</strong> to begin analysis.
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-foreground">Waiting for SQL Input</h3>
                    <p className="mt-2 max-w-sm text-sm text-foreground/70">
                      Configure a query in the editor and click Optimize Query to fetch live predictions and measured latency from the backend.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <Toaster position="bottom-right" richColors />
    </div>
  )
}