import {
  LayoutDashboard, Users, Calendar, Pill, FlaskConical, CreditCard,
  UserCog, Settings, HeartPulse, UserPlus, ClipboardList,
  DollarSign, BarChart3, Shield, Truck, Package, FileText, Bed, Building2, Scan, Scissors, Baby, Siren, Wrench, ExternalLink, type LucideIcon,
} from 'lucide-react';

export interface SidebarItem {
  path: string;
  icon: LucideIcon;
  label: string;
  permission?: string;
}

export interface SidebarSection {
  section: string;
  items: SidebarItem[];
}

export const SIDEBAR_CONFIG: Record<string, SidebarSection[]> = {
  SUPER_ADMIN: [
    {
      section: 'Overview',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      ],
    },
    {
      section: 'Clinical',
      items: [
        { path: '/patients', icon: Users, label: 'Patients' },
        { path: '/appointments', icon: Calendar, label: 'Appointments' },
        { path: '/opd', icon: UserPlus, label: 'OPD' },
        { path: '/triage', icon: HeartPulse, label: 'Triage Station' },
        { path: '/emr', icon: ClipboardList, label: 'EMR / Consultation' },
      ],
    },
    {
      section: 'Services',
      items: [
        { path: '/pharmacy', icon: Pill, label: 'Pharmacy' },
        { path: '/pharmacy/purchase-orders', icon: Package, label: 'Purchase Orders' },
        { path: '/pharmacy/suppliers', icon: Truck, label: 'Suppliers' },
        { path: '/lab', icon: FlaskConical, label: 'Laboratory' },
      ],
    },
    {
      section: 'Inpatient',
      items: [
        { path: '/inpatient/admissions', icon: Bed, label: 'Admissions' },
        { path: '/inpatient/wards', icon: Building2, label: 'Ward & Beds' },
      ],
    },
    {
      section: 'Radiology',
      items: [
        { path: '/radiology', icon: Scan, label: 'Imaging Worklist' },
      ],
    },
    {
      section: 'Theatre',
      items: [
        { path: '/theatre', icon: Scissors, label: 'Surgery Schedule' },
      ],
    },
    {
      section: 'Maternity',
      items: [
        { path: '/maternity', icon: Baby, label: 'Maternity / ANC' },
      ],
    },
    {
      section: 'Emergency',
      items: [
        { path: '/emergency', icon: Siren, label: 'ER Board' },
      ],
    },
    {
      section: 'Inventory & Assets',
      items: [
        { path: '/inventory', icon: Package, label: 'Inventory' },
        { path: '/equipment', icon: Wrench, label: 'Equipment' },
      ],
    },
    {
      section: 'Financial',
      items: [
        { path: '/finance/pricing', icon: DollarSign, label: 'Finance & Pricing' },
        { path: '/finance/profitability', icon: BarChart3, label: 'Profitability' },
        { path: '/billing', icon: CreditCard, label: 'Billing' },
        { path: '/billing/outstanding', icon: FileText, label: 'Outstanding' },
        { path: '/billing/nhis', icon: Shield, label: 'NHIS Claims' },
      ],
    },
    {
      section: 'Reports',
      items: [
        { path: '/reports/analytics', icon: BarChart3, label: 'Analytics Dashboard' },
      ],
    },
    {
      section: 'Patient Portal',
      items: [
        { path: '/portal', icon: ExternalLink, label: 'Patient Portal' },
      ],
    },
    {
      section: 'Administration',
      items: [
        { path: '/hr', icon: UserCog, label: 'HR & Payroll' },
        { path: '/settings/users', icon: Shield, label: 'User Management' },
        { path: '/settings', icon: Settings, label: 'Settings' },
      ],
    },
  ],

  HOSPITAL_ADMIN: [
    {
      section: 'Overview',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      ],
    },
    {
      section: 'Clinical',
      items: [
        { path: '/patients', icon: Users, label: 'Patients', permission: 'VIEW_PATIENT' },
        { path: '/appointments', icon: Calendar, label: 'Appointments', permission: 'VIEW_APPOINTMENT' },
        { path: '/opd', icon: UserPlus, label: 'OPD' },
        { path: '/triage', icon: HeartPulse, label: 'Triage Station' },
        { path: '/emr', icon: ClipboardList, label: 'EMR / Consultation' },
      ],
    },
    {
      section: 'Services',
      items: [
        { path: '/pharmacy', icon: Pill, label: 'Pharmacy' },
        { path: '/pharmacy/purchase-orders', icon: Package, label: 'Purchase Orders' },
        { path: '/pharmacy/suppliers', icon: Truck, label: 'Suppliers' },
        { path: '/lab', icon: FlaskConical, label: 'Laboratory' },
      ],
    },
    {
      section: 'Inpatient',
      items: [
        { path: '/inpatient/admissions', icon: Bed, label: 'Admissions' },
        { path: '/inpatient/wards', icon: Building2, label: 'Ward & Beds' },
      ],
    },
    {
      section: 'Radiology',
      items: [
        { path: '/radiology', icon: Scan, label: 'Imaging Worklist' },
      ],
    },
    {
      section: 'Theatre',
      items: [
        { path: '/theatre', icon: Scissors, label: 'Surgery Schedule' },
      ],
    },
    {
      section: 'Maternity',
      items: [
        { path: '/maternity', icon: Baby, label: 'Maternity / ANC' },
      ],
    },
    {
      section: 'Emergency',
      items: [
        { path: '/emergency', icon: Siren, label: 'ER Board' },
      ],
    },
    {
      section: 'Inventory & Assets',
      items: [
        { path: '/inventory', icon: Package, label: 'Inventory' },
        { path: '/equipment', icon: Wrench, label: 'Equipment' },
      ],
    },
    {
      section: 'Financial',
      items: [
        { path: '/finance/pricing', icon: DollarSign, label: 'Finance & Pricing' },
        { path: '/finance/profitability', icon: BarChart3, label: 'Profitability' },
        { path: '/billing', icon: CreditCard, label: 'Billing' },
        { path: '/billing/outstanding', icon: FileText, label: 'Outstanding' },
        { path: '/billing/nhis', icon: Shield, label: 'NHIS Claims' },
      ],
    },
    {
      section: 'Reports',
      items: [
        { path: '/reports/analytics', icon: BarChart3, label: 'Analytics Dashboard' },
      ],
    },
    {
      section: 'Patient Portal',
      items: [
        { path: '/portal', icon: ExternalLink, label: 'Patient Portal' },
      ],
    },
    {
      section: 'Administration',
      items: [
        { path: '/hr', icon: UserCog, label: 'HR & Payroll' },
        { path: '/settings/users', icon: Shield, label: 'User Management' },
        { path: '/settings', icon: Settings, label: 'Settings' },
      ],
    },
  ],

  MEDICAL_DIRECTOR: [
    {
      section: 'Overview',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      ],
    },
    {
      section: 'Clinical',
      items: [
        { path: '/patients', icon: Users, label: 'Patients', permission: 'VIEW_PATIENT' },
        { path: '/appointments', icon: Calendar, label: 'Appointments', permission: 'VIEW_APPOINTMENT' },
        { path: '/emr', icon: ClipboardList, label: 'EMR / Consultation', permission: 'VIEW_ENCOUNTER' },
      ],
    },
    {
      section: 'Diagnostics',
      items: [
        { path: '/lab', icon: FlaskConical, label: 'Lab Results', permission: 'VIEW_LAB_RESULTS' },
        { path: '/radiology', icon: Scan, label: 'Radiology', permission: 'VIEW_RADIOLOGY_RESULTS' },
      ],
    },
    {
      section: 'Financial',
      items: [
        { path: '/finance/pricing', icon: DollarSign, label: 'Finance & Pricing' },
        { path: '/finance/profitability', icon: BarChart3, label: 'Profitability' },
      ],
    },
    {
      section: 'Reports',
      items: [
        { path: '/reports/analytics', icon: BarChart3, label: 'Analytics Dashboard' },
      ],
    },
    {
      section: 'Administration',
      items: [
        { path: '/settings/users', icon: Shield, label: 'User Management' },
        { path: '/settings', icon: Settings, label: 'Settings' },
      ],
    },
  ],

  DOCTOR: [
    {
      section: 'My Workspace',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/appointments', icon: Calendar, label: 'My Schedule' },
      ],
    },
    {
      section: 'Clinical',
      items: [
        { path: '/patients', icon: Users, label: 'Patient Search', permission: 'VIEW_PATIENT' },
        { path: '/emr', icon: ClipboardList, label: 'Consultations', permission: 'VIEW_ENCOUNTER' },
        { path: '/opd', icon: UserPlus, label: 'OPD Queue' },
      ],
    },
    {
      section: 'Inpatient',
      items: [
        { path: '/inpatient/admissions', icon: Bed, label: 'Admissions' },
        { path: '/inpatient/wards', icon: Building2, label: 'Ward & Beds' },
      ],
    },
    {
      section: 'Diagnostics',
      items: [
        { path: '/lab', icon: FlaskConical, label: 'Lab Results', permission: 'VIEW_LAB_RESULTS' },
        { path: '/radiology', icon: Scan, label: 'Radiology', permission: 'VIEW_RADIOLOGY_RESULTS' },
        { path: '/pharmacy', icon: Pill, label: 'Prescriptions', permission: 'VIEW_PRESCRIPTION' },
      ],
    },
    {
      section: 'Theatre',
      items: [
        { path: '/theatre', icon: Scissors, label: 'Surgery Schedule' },
      ],
    },
    {
      section: 'Maternity',
      items: [
        { path: '/maternity', icon: Baby, label: 'Maternity / ANC' },
      ],
    },
  ],

  NURSE: [
    {
      section: 'Nursing Station',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/triage', icon: HeartPulse, label: 'Triage Queue', permission: 'TRIAGE' },
      ],
    },
    {
      section: 'Patient Care',
      items: [
        { path: '/patients', icon: Users, label: 'Patient Search', permission: 'VIEW_PATIENT' },
        { path: '/opd', icon: UserPlus, label: 'OPD Queue' },
        { path: '/emr', icon: ClipboardList, label: 'Encounters', permission: 'VIEW_ENCOUNTER' },
      ],
    },
    {
      section: 'Inpatient',
      items: [
        { path: '/inpatient/admissions', icon: Bed, label: 'Admissions' },
        { path: '/inpatient/wards', icon: Building2, label: 'Ward & Beds' },
      ],
    },
  ],

  HEAD_NURSE: [
    {
      section: 'Nursing Station',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/triage', icon: HeartPulse, label: 'Triage Queue', permission: 'TRIAGE' },
      ],
    },
    {
      section: 'Patient Care',
      items: [
        { path: '/patients', icon: Users, label: 'Patient Search', permission: 'VIEW_PATIENT' },
        { path: '/opd', icon: UserPlus, label: 'OPD Queue' },
        { path: '/emr', icon: ClipboardList, label: 'Encounters', permission: 'VIEW_ENCOUNTER' },
      ],
    },
    {
      section: 'Inpatient',
      items: [
        { path: '/inpatient/admissions', icon: Bed, label: 'Admissions' },
        { path: '/inpatient/wards', icon: Building2, label: 'Ward & Beds' },
      ],
    },
  ],

  PHARMACIST: [
    {
      section: 'Pharmacy',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/pharmacy', icon: Pill, label: 'Dispensing Queue', permission: 'VIEW_PRESCRIPTION' },
        { path: '/pharmacy/stock', icon: Package, label: 'Stock Management' },
        { path: '/pharmacy/purchase-orders', icon: ClipboardList, label: 'Purchase Orders' },
        { path: '/pharmacy/suppliers', icon: Truck, label: 'Suppliers' },
      ],
    },
    {
      section: 'Patients',
      items: [
        { path: '/patients', icon: Users, label: 'Patient Search', permission: 'VIEW_PATIENT' },
      ],
    },
  ],

  LAB_TECHNICIAN: [
    {
      section: 'Laboratory',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/lab', icon: FlaskConical, label: 'Lab Worklist', permission: 'VIEW_LAB_ORDER' },
        { path: '/lab/worklist', icon: ClipboardList, label: 'Worklist' },
        { path: '/lab/verification', icon: Shield, label: 'Verification Queue' },
      ],
    },
    {
      section: 'Patients',
      items: [
        { path: '/patients', icon: Users, label: 'Patient Search', permission: 'VIEW_PATIENT' },
      ],
    },
  ],

  RECEPTIONIST: [
    {
      section: 'Front Desk',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/opd', icon: UserPlus, label: 'OPD / Check-in' },
      ],
    },
    {
      section: 'Patients',
      items: [
        { path: '/registration', icon: UserPlus, label: 'Register Patient', permission: 'REGISTER_PATIENT' },
        { path: '/patients', icon: Users, label: 'Patient Search', permission: 'VIEW_PATIENT' },
      ],
    },
    {
      section: 'Appointments',
      items: [
        { path: '/appointments', icon: Calendar, label: 'Appointments', permission: 'VIEW_APPOINTMENT' },
      ],
    },
  ],

  BILLING_OFFICER: [
    {
      section: 'Billing',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/billing', icon: CreditCard, label: 'Billing', permission: 'VIEW_INVOICE' },
        { path: '/billing/invoices', icon: FileText, label: 'Invoices' },
        { path: '/billing/outstanding', icon: FileText, label: 'Outstanding' },
        { path: '/billing/nhis', icon: Shield, label: 'NHIS Claims' },
      ],
    },
    {
      section: 'Financial',
      items: [
        { path: '/finance/pricing', icon: DollarSign, label: 'Finance & Pricing' },
        { path: '/finance/profitability', icon: BarChart3, label: 'Profitability' },
      ],
    },
    {
      section: 'Patients',
      items: [
        { path: '/patients', icon: Users, label: 'Patient Search', permission: 'VIEW_PATIENT' },
      ],
    },
  ],

  ACCOUNTANT: [
    {
      section: 'Financial',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/finance/pricing', icon: DollarSign, label: 'Finance & Pricing' },
        { path: '/finance/profitability', icon: BarChart3, label: 'Profitability' },
        { path: '/billing', icon: CreditCard, label: 'Billing', permission: 'VIEW_INVOICE' },
      ],
    },
  ],
};

export const DEFAULT_SIDEBAR: SidebarSection[] = [
  {
    section: 'General',
    items: [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/patients', icon: Users, label: 'Patients' },
    ],
  },
];
