'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Brain,
  Database,
  Cpu,
  Workflow,
  Search,
  Code,
  ArrowRight,
  Info
} from 'lucide-react'

// Step definitions
const STEPS = [
  {
    icon: Database,
    title: 'Query Logging & Ingestion',
    desc: 'Listens to queries from databases (PostgreSQL, MySQL, etc.) and captures execution plan statistics, table sizes, cardinality, and disk read measurements.',
    color: 'bg-primary/10 text-primary border-primary/20'
  },
  {
    icon: Workflow,
    title: 'Feature Vector Extraction',
    desc: 'Translates raw SQL syntax into high-dimensional numerical feature vectors, parsing predicates, scan nodes, join sizes, and operation complexities.',
    color: 'bg-secondary/10 text-secondary border-secondary/20'
  },
  {
    icon: Brain,
    title: 'Neural Net Cost Inference',
    desc: 'Computes cost estimations using deep neural network cost models (trained on historical logs) to predict hardware execution footprint.',
    color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
  },
  {
    icon: Cpu,
    title: 'Search Plan Generation',
    desc: 'Applies heuristic query rewrites and selects the execution plan with the lowest predicted ML cost metric.',
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
  }
]

// Mock Query Feature Engineering Data
const QUERY_SAMPLES = [
  {
    sql: 'SELECT * FROM users WHERE age > 25 AND country = "US";',
    features: {
      'Tables Scanned': 'users',
      'Filters Detected': 'age > 25, country = "US"',
      'Total Join Operations': '0',
      'Predicates Complexity': 'Low',
      'ML Feature Vector': '[1.0, 0.0, 2.0, 0.25, 0.0, 1.12]'
    }
  },
  {
    sql: `SELECT orders.id, customers.name 
FROM orders 
JOIN customers ON orders.customer_id = customers.id 
WHERE amount > 1000;`,
    features: {
      'Tables Scanned': 'orders, customers',
      'Filters Detected': 'amount > 1000',
      'Total Join Operations': '1 (Hash Join)',
      'Predicates Complexity': 'Medium',
      'ML Feature Vector': '[2.0, 1.0, 1.0, 0.85, 1.0, 4.38]'
    }
  }
]

export default function ArchitecturePage() {
  const [selectedSample, setSelectedSample] = useState(0)
  const [customSql, setCustomSql] = useState('')

  // Dynamically compute feature extraction mockup
  const handleCustomSqlChange = (val: string) => {
    setCustomSql(val)
  }

  const activeFeatures = customSql.trim()
    ? {
        'Tables Scanned': customSql.toLowerCase().includes('from')
          ? customSql.toLowerCase().split('from')[1]?.split('where')[0]?.trim() || 'unknown'
          : 'None',
        'Filters Detected': customSql.toLowerCase().includes('where')
          ? customSql.toLowerCase().split('where')[1]?.trim() || 'None'
          : 'None',
        'Total Join Operations': (customSql.toLowerCase().match(/join/g) || []).length.toString(),
        'Predicates Complexity': (customSql.toLowerCase().match(/and|or/g) || []).length > 1 ? 'High' : 'Low',
        'ML Feature Vector': `[${(customSql.match(/[a-zA-Z]/g) || []).length}.0, ${(customSql.match(/join/g) || []).length}.0, 1.0, 0.50]`
      }
    : QUERY_SAMPLES[selectedSample].features

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mt-16 space-y-12">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary py-1 px-3 text-sm">
            Core Engine Overview
          </Badge>
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl">
            Inside the <span className="text-primary">Arbiter</span> ML Engine
          </h1>
          <p className="text-lg text-foreground/75">
            Learn how Arbiter utilizes neural network cost estimators and query plan searches to achieve up to 95% latency reduction.
          </p>
        </div>

        {/* Step-by-Step Architecture Pipeline */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Workflow className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">The ML Ingestion & Optimization Pipeline</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, idx) => {
              const Icon = step.icon
              return (
                <Card key={idx} className="border border-border bg-card shadow hover:shadow-lg transition-all relative group flex flex-col">
                  {/* Step Number Badge */}
                  <div className="absolute top-4 right-4 text-xs font-bold text-foreground/30 font-mono">
                    STEP 0{idx + 1}
                  </div>

                  <CardHeader className="pb-2">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${step.color} mb-3`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-lg font-bold text-foreground leading-snug">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-foreground/75 leading-relaxed">{step.desc}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Interactive Feature Extractor Sandbox */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Side: SQL Input */}
          <div className="lg:col-span-6 space-y-6">
            <Card className="border border-border bg-card shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Code className="w-5 h-5 text-primary" />
                  ML Feature Extractor Sandbox
                </CardTitle>
                <CardDescription className="text-foreground/75">
                  Type a custom query or select one of our pre-built samples to see what structural features Arbiter extracts before cost inference.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sample selection */}
                <div className="flex items-center gap-2.5">
                  {QUERY_SAMPLES.map((sample, i) => (
                    <Button
                      key={i}
                      variant={selectedSample === i && !customSql ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedSample(i)
                        setCustomSql('')
                      }}
                      className="text-xs"
                    >
                      Sample 0{i + 1}
                    </Button>
                  ))}
                  <Button
                    variant={customSql ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCustomSql('SELECT * FROM orders JOIN products ON orders.prod_id = products.id;')}
                    className="text-xs"
                  >
                    Custom Sandbox
                  </Button>
                </div>

                {/* Textarea */}
                <div className="relative rounded-lg overflow-hidden border border-border font-mono text-sm">
                  <textarea
                    value={customSql || QUERY_SAMPLES[selectedSample].sql}
                    onChange={(e) => handleCustomSqlChange(e.target.value)}
                    rows={6}
                    className="w-full bg-card text-foreground px-4 py-4 leading-relaxed font-mono resize-none focus:outline-none"
                    placeholder="Enter SELECT query here..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side: Features Vector */}
          <div className="lg:col-span-6">
            <Card className="border border-border bg-card shadow-lg h-full">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Extracted Feature Outputs
                </CardTitle>
                <CardDescription className="text-foreground/75">
                  The numerical vector values below are fed directly into Arbiter's deep neural networks.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border border-y border-border">
                  {Object.entries(activeFeatures).map(([key, value]) => (
                    <div key={key} className="py-3 flex justify-between gap-4 items-start">
                      <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">{key}</span>
                      <span className={`text-xs font-mono font-bold text-right ${key.includes('Vector') ? 'text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/20' : 'text-foreground'}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 p-3 bg-secondary/5 border border-secondary/20 rounded-lg mt-6">
                  <Info className="w-5 h-5 text-secondary shrink-0" />
                  <p className="text-[11px] text-foreground/80 leading-relaxed">
                    Arbiter translates tree structures, indices, column statistics, operations, and joins into this structured representation to let machine learning models accurately predict cost outputs.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
