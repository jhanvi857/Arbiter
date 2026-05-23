'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
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
  Server
} from 'lucide-react'

// Sample SQL Templates
const TEMPLATES = [
  {
    name: 'Unindexed Filter Query',
    db: 'PostgreSQL',
    sql: `SELECT * 
FROM orders 
WHERE customer_id = 45920 
  AND status = 'pending' 
ORDER BY created_at DESC 
LIMIT 50;`
  },
  {
    name: 'Heavy Three-Way JOIN',
    db: 'MySQL',
    sql: `SELECT c.name, COUNT(o.id) as total_orders, SUM(o.amount) as total_spend
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items i ON o.id = i.order_id
WHERE o.created_at >= '2025-01-01'
GROUP BY c.id, c.name
ORDER BY total_spend DESC;`
  },
  {
    name: 'Nested Correlated Subquery',
    db: 'PostgreSQL',
    sql: `SELECT name, department, salary
FROM employees e
WHERE salary > (
  SELECT AVG(salary)
  FROM employees
  WHERE department = e.department
);`
  }
]

const STAGES = [
  { label: 'Parsing SQL AST', desc: 'Validating syntax and building abstract tree' },
  { label: 'Featurizing Plan', desc: 'Encoding query structural features' },
  { label: 'ML Cost Estimation', desc: 'Predicting execution plan cost via Neural Network' },
  { label: 'Plan Search & Rewrite', desc: 'Executing genetic search algorithm to locate optimal plan' }
]

export default function OptimizerPage() {
  const [selectedDb, setSelectedDb] = useState('PostgreSQL')
  const [sql, setSql] = useState(TEMPLATES[0].sql)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [currentStage, setCurrentStage] = useState(-1)
  const [hasOptimized, setHasOptimized] = useState(false)

  // Simulation of ML optimization pipeline
  useEffect(() => {
    if (!isOptimizing) return
    setCurrentStage(0)

    const interval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev >= STAGES.length - 1) {
          clearInterval(interval)
          setIsOptimizing(false)
          setHasOptimized(true)
          return prev
        }
        return prev + 1
      })
    }, 900)

    return () => clearInterval(interval)
  }, [isOptimizing])

  const handleTemplateClick = (template: typeof TEMPLATES[0]) => {
    setSelectedDb(template.db)
    setSql(template.sql)
    setHasOptimized(false)
  }

  const startOptimization = () => {
    setHasOptimized(false)
    setIsOptimizing(true)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mt-16 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-primary" />
              Query Optimizer Workbench
            </h1>
            <p className="text-foreground/75 mt-1">
              Input database queries to optimize execution paths using Arbiter's Machine Learning models.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary py-1 px-3 text-sm">
              Model Version v2.1-stable
            </Badge>
          </div>
        </div>

        {/* Templates Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-card/40 border border-border p-4 rounded-xl">
          <span className="text-sm font-semibold text-foreground/80 flex items-center gap-1.5 mr-2">
            <Server className="w-4 h-4 text-primary" /> Load Template:
          </span>
          {TEMPLATES.map((tmpl) => (
            <Button
              key={tmpl.name}
              variant="outline"
              size="sm"
              onClick={() => handleTemplateClick(tmpl)}
              className="bg-card text-foreground hover:bg-primary/5 border-border hover:border-primary/50 text-xs py-1.5"
            >
              {tmpl.name} ({tmpl.db})
            </Button>
          ))}
        </div>

        {/* Main Interface Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Query Editor */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border border-border bg-card shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-foreground">SQL Query Input</CardTitle>
                  <select
                    value={selectedDb}
                    onChange={(e) => setSelectedDb(e.target.value)}
                    className="bg-background border border-border text-foreground px-3 py-1 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/50 font-medium"
                  >
                    <option value="PostgreSQL">PostgreSQL</option>
                    <option value="MySQL">MySQL</option>
                    <option value="Oracle">Oracle</option>
                    <option value="SQLite">SQLite</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative rounded-lg overflow-hidden border border-border font-mono text-sm">
                  {/* Mock editor line numbers */}
                  <div className="absolute left-0 top-0 bottom-0 w-10 bg-muted/30 border-r border-border/50 flex flex-col items-center pt-4 text-foreground/30 select-none">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <span key={i} className="leading-relaxed">{i + 1}</span>
                    ))}
                  </div>
                  <textarea
                    value={sql}
                    onChange={(e) => setSql(e.target.value)}
                    rows={10}
                    className="w-full bg-card text-foreground pl-14 pr-4 py-4 leading-relaxed font-mono resize-none focus:outline-none"
                    placeholder="Enter SELECT query here..."
                  />
                </div>

                <Button
                  onClick={startOptimization}
                  disabled={isOptimizing}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-base font-bold shadow-md shadow-primary/10 flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-current" />
                  {isOptimizing ? 'Analyzing Query...' : 'Optimize Query'}
                </Button>
              </CardContent>
            </Card>

            {/* Stage indicator during optimization */}
            <AnimatePresence>
              {isOptimizing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className="border border-primary/20 bg-primary/5">
                    <CardContent className="py-4 space-y-3">
                      <div className="flex items-center justify-between text-sm font-semibold text-primary">
                        <span>Optimizing with Arbiter ML...</span>
                        <Activity className="animate-pulse w-4 h-4" />
                      </div>
                      <div className="space-y-2.5">
                        {STAGES.map((stage, idx) => (
                          <div key={idx} className="flex items-start gap-2.5">
                            <div className="mt-1 flex h-4.5 w-4.5 items-center justify-center">
                              {currentStage > idx ? (
                                <CheckCircle className="w-4 h-4 text-primary fill-primary-foreground" />
                              ) : currentStage === idx ? (
                                <div className="h-2.5 w-2.5 rounded-full bg-primary animate-ping" />
                              ) : (
                                <div className="h-2 w-2 rounded-full bg-border" />
                              )}
                            </div>
                            <div>
                              <div className={`text-xs font-semibold ${currentStage === idx ? 'text-foreground font-bold' : 'text-foreground/60'}`}>
                                {stage.label}
                              </div>
                              {currentStage === idx && (
                                <div className="text-[10px] text-foreground/70">{stage.desc}</div>
                              )}
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

          {/* Right Column: Optimization Report / Results */}
          <div className="lg:col-span-7">
            {hasOptimized ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                {/* Result Statistics */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border border-border bg-card p-4">
                    <div className="text-xs text-foreground/60 font-semibold uppercase flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-primary" /> Cost Reduction
                    </div>
                    <div className="mt-1 text-2xl font-bold text-primary">94.2%</div>
                    <div className="text-[10px] text-foreground/50 mt-0.5">Estimated by ML planner</div>
                  </Card>
                  <Card className="border border-border bg-card p-4">
                    <div className="text-xs text-foreground/60 font-semibold uppercase flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5 text-secondary" /> Latency Est.
                    </div>
                    <div className="mt-1 text-2xl font-bold text-foreground">0.28s <span className="text-xs text-foreground/50 font-normal">vs 4.82s</span></div>
                    <div className="text-[10px] text-foreground/50 mt-0.5">4.54s time savings</div>
                  </Card>
                  <Card className="border border-border bg-card p-4">
                    <div className="text-xs text-foreground/60 font-semibold uppercase flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" /> I/O Reductions
                    </div>
                    <div className="mt-1 text-2xl font-bold text-foreground">98.1%</div>
                    <div className="text-[10px] text-foreground/50 mt-0.5">Page reads minimized</div>
                  </Card>
                </div>

                {/* Side-by-side SQL Comparison */}
                <Card className="border border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-1">
                      <Code className="w-4 h-4 text-primary" /> Query Rewriting Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 border-t border-border grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                    <div className="p-4">
                      <div className="text-xs font-semibold text-foreground/60 uppercase mb-2">Original SQL</div>
                      <pre className="text-xs text-foreground/80 font-mono bg-muted/20 p-3 rounded-lg overflow-x-auto leading-relaxed border border-border/30">
                        {sql}
                      </pre>
                    </div>
                    <div className="p-4 bg-primary/[0.01]">
                      <div className="text-xs font-semibold text-primary uppercase mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Arbiter Optimized SQL
                      </div>
                      <pre className="text-xs text-foreground font-mono bg-muted/40 p-3 rounded-lg overflow-x-auto leading-relaxed border border-primary/20">
                        {sql.includes('orders') ? `SELECT o.id, o.customer_id, o.status, o.created_at
FROM orders o 
/*+ INDEX(o orders_cust_status_idx) */
WHERE o.customer_id = 45920 
  AND o.status = 'pending' 
ORDER BY o.created_at DESC 
LIMIT 50;` : sql.includes('JOIN') ? `SELECT c.name, COUNT(o.id) as total_orders, SUM(o.amount) as total_spend
FROM customers c
/*+ STRAIGHT_JOIN */
JOIN orders o ON c.id = o.customer_id
JOIN order_items i ON o.id = i.order_id
WHERE o.created_at >= '2025-01-01'
GROUP BY c.id, c.name
ORDER BY total_spend DESC;` : `SELECT name, department, salary
FROM employees e
JOIN (
  SELECT department, AVG(salary) as avg_sal
  FROM employees
  GROUP BY department
) d ON e.department = d.department
WHERE e.salary > d.avg_sal;`}
                      </pre>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card className="border border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-foreground">Actionable Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <div className="font-semibold text-foreground">Missing Index Detected</div>
                        <div className="text-foreground/75 mt-0.5">
                          Creating a composite index: <code className="bg-background px-1 py-0.5 rounded font-bold border border-border">CREATE INDEX orders_cust_status_idx ON orders(customer_id, status, created_at DESC)</code> will resolve a sequential disk scan.
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 p-3 bg-secondary/5 rounded-lg border border-secondary/20">
                      <Info className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <div className="font-semibold text-foreground">Subquery Restructured to JOIN</div>
                        <div className="text-foreground/75 mt-0.5">
                          Rewrote the nested subquery into an explicit inner join. This allows query planners to use hash join algorithms instead of nested loop lookups.
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Visual Execution Plan Plan Tree */}
                <Card className="border border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-primary" /> Visual Execution Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="flex flex-col items-center gap-4 py-4 bg-muted/10 rounded-xl border border-border/30">
                      {/* Top Node */}
                      <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-bold border border-primary/20 text-center shadow">
                        Limit (50 rows)
                        <div className="text-[10px] opacity-70 font-normal">Cost: 0.05..12.30</div>
                      </div>
                      <ArrowRight className="w-4 h-4 rotate-90 text-foreground/40" />

                      {/* Middle Node */}
                      <div className="bg-card text-foreground px-4 py-2 rounded-lg text-xs font-bold border border-border text-center shadow">
                        Index Scan using orders_cust_status_idx
                        <div className="text-[10px] text-foreground/60 font-normal">Cost: 0.00..12.25</div>
                      </div>
                      <ArrowRight className="w-4 h-4 rotate-90 text-foreground/40" />

                      {/* Leaf Node */}
                      <div className="bg-muted/50 text-foreground/80 px-4 py-2 rounded-lg text-xs font-semibold border border-border/50 text-center">
                        Table: orders (Disk Heap Scan avoided)
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              /* Idle / Unoptimized State placeholder */
              <div className="h-full min-h-[400px] border border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-8 bg-card/20 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center border border-primary/20 mb-4 animate-pulse">
                  <Database className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Waiting for SQL Input</h3>
                <p className="text-sm text-foreground/70 max-w-sm mt-2">
                  Configure your query in the editor and click "Optimize Query" to run our machine learning cost engine.
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
