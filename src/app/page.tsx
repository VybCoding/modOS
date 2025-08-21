import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, ShieldCheck, Cog, Star } from 'lucide-react';
import Link from 'next/link';
import { PoweredBy } from '@/components/powered-by';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                  modOS Telegram Moderator Bot
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  The ultimate gatekeeper for your Telegram community.
                  Automate member verification, prevent spam, and manage your
                  group with powerful, easy-to-use tools.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button asChild size="lg">
                  <Link href="/dashboard">Login with Telegram to Get Started</Link>
                </Button>
              </div>
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
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot /> Automated Verification
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
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck /> Powerful Moderation
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
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cog /> Full Control
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
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star /> Gamified Engagement (Coming Soon)
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                   <p className="text-sm text-muted-foreground">
                    Reward active members with a built-in leveling and XP system. Encourage participation and build a vibrant, thriving community.
                  </p>
                </CardContent>
              </Card>
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
