'use client'

import { motion } from 'framer-motion'
import { Github, Mail, ExternalLink } from 'lucide-react'

export function Footer() {
  const links = [
    { label: 'GitHub', icon: Github, href: '#' },
    { label: 'Documentation', href: '#' },
    { label: 'API', href: '#' },
    { label: 'Team', href: '#' },
    { label: 'Contact', icon: Mail, href: '#' },
  ]

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
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  }

  return (
    <footer className="relative border-t border-border bg-background py-12">
      {/* Gradient Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
          animate={{
            y: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-secondary/10 blur-3xl"
          animate={{
            y: [0, -30, 0],
          }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <motion.div
          className="mb-8 grid gap-8 sm:grid-cols-2 md:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Brand Column */}
          <motion.div variants={itemVariants}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">A</span>
              </div>
              <span className="font-bold text-foreground">Arbiter</span>
            </div>
            <p className="text-sm text-foreground/95">
              Optimize your database queries with machine learning.
            </p>
          </motion.div>

          {/* Product Links */}
          <motion.div variants={itemVariants}>
            <h3 className="mb-4 font-semibold text-foreground">Product</h3>
            <ul className="space-y-2">
              {[
                { name: 'Features', href: '/#features' },
                { name: 'Pricing', href: '/#pricing' },
                { name: 'Documentation', href: '/architecture' },
                { name: 'API', href: '/#api' },
              ].map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-foreground/95 transition-colors hover:text-primary"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Company Links */}
          <motion.div variants={itemVariants}>
            <h3 className="mb-4 font-semibold text-foreground">Company</h3>
            <ul className="space-y-2">
              {['About', 'Blog', 'Careers', 'Contact'].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-foreground/95 transition-colors hover:text-primary"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Legal Links */}
          <motion.div variants={itemVariants}>
            <h3 className="mb-4 font-semibold text-foreground">Legal</h3>
            <ul className="space-y-2">
              {['Privacy', 'Terms', 'Security', 'Status'].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-foreground/95 transition-colors hover:text-primary"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>

        {/* Divider */}
        <div className="mb-8 border-t border-border/50" />

        {/* Bottom Section */}
        <motion.div
          className="flex flex-col items-center justify-between gap-4 sm:flex-row"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          viewport={{ once: true }}
        >
          {/* Copyright */}
          <p className="text-sm text-foreground/95">
            &copy; 2024 Arbiter. All rights reserved.
          </p>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            {[
              { icon: Github, label: 'GitHub' },
              { label: 'Twitter', external: true },
              { icon: Mail, label: 'Email' },
            ].map((link, i) => (
              <motion.a
                key={i}
                href="#"
                className="inline-flex items-center justify-center rounded-lg bg-card p-2 text-foreground/95 transition-all hover:bg-primary/10 hover:text-primary"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {link.icon ? (
                  <link.icon className="h-5 w-5" />
                ) : (
                  <>
                    <span className="text-sm font-medium">{link.label}</span>
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </>
                )}
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  )
}
