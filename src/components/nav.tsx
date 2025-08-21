
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Settings,
  MessageSquare,
  Activity,
} from 'lucide-react';
import {
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/settings', label: 'Project Settings', icon: Settings },
  { href: '/users', label: 'User Management', icon: Users },
  { href: '/log', label: 'Activity Log', icon: Activity },
  { href: '/feedback', label: 'Feedback', icon: MessageSquare },
];

export function Nav() {
  const pathname = usePathname();

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
