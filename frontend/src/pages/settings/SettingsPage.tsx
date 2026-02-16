import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Users, Shield, Building2, MapPin, Bell, Palette, Globe, Database,
  Lock, FileText, Printer, Mail,
} from 'lucide-react';

interface SettingsCard {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  badge?: string;
}

const settingsCards: SettingsCard[] = [
  {
    title: 'User Management',
    description: 'Manage staff accounts, roles, permissions, and access control',
    icon: Users,
    path: '/settings/users',
  },
  {
    title: 'Departments',
    description: 'Create and manage hospital departments',
    icon: Building2,
    path: '/settings/users?tab=departments',
  },
  {
    title: 'Branches',
    description: 'Manage hospital branches and satellite clinics',
    icon: MapPin,
    path: '/settings/users?tab=branches',
  },
  {
    title: 'Roles & Permissions',
    description: 'Configure system roles and granular permissions',
    icon: Shield,
    path: '/settings/users?tab=roles',
  },
  {
    title: 'Notifications',
    description: 'Configure email, SMS, and push notification settings',
    icon: Bell,
    path: '#',
    badge: 'Coming Soon',
  },
  {
    title: 'Appearance',
    description: 'Customize branding, logo, and theme colors',
    icon: Palette,
    path: '#',
    badge: 'Coming Soon',
  },
  {
    title: 'Localization',
    description: 'Language, currency, date format, and timezone settings',
    icon: Globe,
    path: '#',
    badge: 'Coming Soon',
  },
  {
    title: 'Backup & Data',
    description: 'Database backups, data export, and audit logs',
    icon: Database,
    path: '#',
    badge: 'Coming Soon',
  },
  {
    title: 'Security',
    description: 'Password policies, 2FA, session management',
    icon: Lock,
    path: '#',
    badge: 'Coming Soon',
  },
  {
    title: 'Templates',
    description: 'Invoice, prescription, and report templates',
    icon: FileText,
    path: '#',
    badge: 'Coming Soon',
  },
  {
    title: 'Printing',
    description: 'Printer configuration and label settings',
    icon: Printer,
    path: '#',
    badge: 'Coming Soon',
  },
  {
    title: 'Email / SMS',
    description: 'SMTP, SMS gateway, and messaging configuration',
    icon: Mail,
    path: '#',
    badge: 'Coming Soon',
  },
];

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your hospital management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsCards.map((card) => {
          const Icon = card.icon;
          const isDisabled = card.path === '#';

          const content = (
            <Card
              key={card.title}
              className={`transition-all ${isDisabled ? 'opacity-60' : 'hover:shadow-md hover:border-blue-200 cursor-pointer'}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDisabled ? 'bg-gray-100' : 'bg-blue-50'}`}>
                      <Icon className={`h-5 w-5 ${isDisabled ? 'text-gray-400' : 'text-blue-600'}`} />
                    </div>
                    <CardTitle className="text-base">{card.title}</CardTitle>
                  </div>
                  {card.badge && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {card.badge}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          );

          if (isDisabled) return <div key={card.title}>{content}</div>;

          return (
            <Link key={card.title} to={card.path} className="no-underline text-inherit">
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
