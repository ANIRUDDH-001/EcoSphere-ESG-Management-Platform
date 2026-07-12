import { 
  LayoutDashboard, 
  Leaf, 
  Users, 
  ShieldCheck, 
  Trophy, 
  BarChart, 
  Bot, 
  Bell, 
  Settings, 
  Database, 
  UserCog 
} from 'lucide-react';

export const NAV_SECTIONS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Environmental', path: '/environmental', icon: Leaf },
  { label: 'Social', path: '/social', icon: Users },
  { label: 'Governance', path: '/governance', icon: ShieldCheck },
  { label: 'Gamification', path: '/gamification', icon: Trophy },
  { label: 'Reports', path: '/reports', icon: BarChart },
  { label: 'Copilot', path: '/copilot', icon: Bot },
  { label: 'Notifications', path: '/notifications', icon: Bell },
  { label: 'Master Data', path: '/master', icon: Database, roles: ['admin', 'manager'] },
  { label: 'Settings', path: '/settings', icon: Settings, roles: ['admin', 'manager'] },
  { label: 'Admin', path: '/admin/users', icon: UserCog, roles: ['admin'] },
];
