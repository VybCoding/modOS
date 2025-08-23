'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, ShieldCheck, Cog, Star, Send, Gavel, SlidersHorizontal, Trophy, X } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { PoweredBy } from '@/components/powered-by';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                  modOS Telegram Moderator Bot
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  The ultimate gatekeeper for your Telegram community.
                  Automate member verification, prevent spam, and manage your
                  group with powerful, easy-to-use tools.
                </p>
              </motion.div>
              <motion.div
                  className="relative w-full max-w-lg mx-auto mt-8"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
                  transition={{
                      delay: 0.2,
                      duration: 0.8,
                      y: {
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut"
                      }
                  }}
              >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-gradient-from to-accent-gradient-to rounded-lg blur opacity-50"></div>
                  <div className="relative w-full h-64 bg-background rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">UI Mockup Placeholder</p>
                  </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                    animate={{
                        scale: [1, 1.02, 1],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                >
                    <Button asChild size="lg" className="bg-gradient-to-r from-accent-gradient-from to-accent-gradient-to text-white">
                      <Link href="/dashboard" className="flex items-center gap-2">
                        <Send size={20} />
                        Login with Telegram to Get Started
                      </Link>
                    </Button>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">
                  Key Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Built for Security and Community
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  From intelligent CAPTCHA to robust admin controls, modOS
                  provides everything you need to maintain a healthy
                  and spam-free community.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-2 lg:max-w-4xl xl:grid-cols-4">
              <motion.div whileHover={{ y: -5, scale: 1.02 }} className="mt-8 group">
                  <Card className="transition-all duration-300 group-hover:ring-2 group-hover:ring-accent-gradient-from">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldCheck size={28} className="text-accent-gradient-from" /> Automated Verification
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                      <p className="text-sm text-muted-foreground">
                        New users are greeted with a customizable CAPTCHA
                        challenge. Bots are stopped dead in their tracks, while
                        real users get seamless access.
                      </p>
                    </CardContent>
                  </Card>
              </motion.div>
              <motion.div whileHover={{ y: -5, scale: 1.02 }} className="mt-8 group">
                  <Card className="transition-all duration-300 group-hover:ring-2 group-hover:ring-accent-gradient-from">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gavel size={28} className="text-accent-gradient-from" /> Powerful Moderation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                      <p className="text-sm text-muted-foreground">
                        Set word blacklists, warning thresholds, and automatic mute
                        durations. Keep conversations clean and on-topic with less
                        manual effort.
                      </p>
                    </CardContent>
                  </Card>
              </motion.div>
              <motion.div whileHover={{ y: -5, scale: 1.02 }} className="mt-8 group">
                  <Card className="transition-all duration-300 group-hover:ring-2 group-hover:ring-accent-gradient-from">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <SlidersHorizontal size={28} className="text-accent-gradient-from" /> Full Control
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                      <p className="text-sm text-muted-foreground">
                        Manage everything from a simple, intuitive web dashboard.
                        Configure welcome messages, rules, and moderation settings
                        for your entire project.
                      </p>
                    </CardContent>
                  </Card>
              </motion.div>
              <motion.div whileHover={{ y: -5, scale: 1.02 }} className="mt-8 group">
                  <Card className="transition-all duration-300 group-hover:ring-2 group-hover:ring-accent-gradient-from">
                    <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Trophy size={28} className="text-accent-gradient-from" /> Gamified Engagement
                    </div>
                    <Badge variant="secondary">Coming Soon</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                       <p className="text-sm text-muted-foreground">
                        Reward active members with a built-in leveling and XP system. Encourage participation and build a vibrant, thriving community.
                      </p>
                    </CardContent>
                  </Card>
              </motion.div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
            <div className="container px-4 md:px-6">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                        Built by the Community, for the Community
                    </h2>
                    <p className="max-w-[600px] text-muted-foreground md:text-xl">
                        modOS is open source and community-driven. Join us on Telegram or follow us on X to get involved.
                    </p>
                    <div className="flex gap-4 mt-4">
                        <Button asChild size="lg">
                            <Link href="#" className="flex items-center gap-2">
                                <Send /> Join Telegram
                            </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline">
                            <Link href="#" className="flex items-center gap-2">
                                <X /> Follow on X
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
      </main>
       <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <div className="flex-1 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} modOS. All rights reserved.
        </div>
        <div className="flex-shrink-0">
           <PoweredBy />
        </div>
      </footer>
    </div>
  );
}
