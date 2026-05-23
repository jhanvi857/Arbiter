'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function Navbar() {
  return (
    <motion.nav
      className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <span className="text-lg font-bold text-primary-foreground">A</span>
            </div>
            <span className="hidden text-xl font-bold text-foreground sm:inline">Arbiter</span>
          </motion.div>

          {/* Navigation Links */}
          <div className="hidden items-center gap-8 md:flex">
            {[
              { name: 'Home', href: '/' },
              { name: 'Features', href: '/#features' },
              { name: 'Optimizer', href: '/optimizer' },
              { name: 'Analytics', href: '/#analytics' },
              { name: 'Documentation', href: '/architecture' },
            ].map((item, i) => (
              <motion.a
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-foreground/95 transition-colors hover:text-primary"
                whileHover={{ color: 'rgb(216, 91, 83)' }}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                {item.name}
              </motion.a>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-sm font-medium text-foreground/95 hover:text-primary"
              >
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
