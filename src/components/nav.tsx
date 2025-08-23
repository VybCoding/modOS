
"use client";

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  Home,
  Users,
  Settings,
  MessageSquare,
  Activity,
  Trophy,
} from 'lucide-react';
import {
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

export function Nav() {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.projectId as string;

  const navItems = [
    { href: `/dashboard/${projectId}`, label: 'Dashboard', icon: Home },
    { href: `/dashboard/${projectId}/leaderboard`, label: 'Leaderboard', icon: Trophy },
    { href: `/dashboard/${projectId}/settings`, label: 'Project Settings', icon: Settings },
    { href: `/dashboard/${projectId}/users`, label: 'User Management', icon: Users },
    { href: `/dashboard/${projectId}/log`, label: 'Activity Log', icon: Activity },
    { href: `/feedback`, label: 'Feedback', icon: MessageSquare },
  ];

  return (
    <>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href}
            tooltip={{ children: item.label, side: 'right' }}
          >
            <Link href={item.href}>
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );
}
