# Role-Based UI System - Quick Implementation Guide

## 🎯 THE PROBLEM YOU IDENTIFIED

**Current State (BAD):**
```
Nurse logs in → Sees "Create Prescription" button → Clicks it → Gets 403 Error
"You don't have permission to prescribe medications"

❌ Frustrating UX
❌ Confusing
❌ Looks broken
```

**Desired State (GOOD):**
```
Nurse logs in → Only sees features they CAN use
✅ Triage Queue
✅ Record Vitals  
✅ Nursing Notes
(No prescription button - they don't have permission)

✅ Clean UX
✅ Clear capabilities
✅ Professional
```

---

## 🚀 IMPLEMENTATION (5 Steps)

### **STEP 1: Update Auth Context to Include Permissions**

**File:** `src/context/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleId: string;
  permissions: string[];  // ← NEW: Array of permission names
  organizationId: string;
  primaryBranchId: string;
  currentBranchId: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  
  // NEW: Permission helper functions
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    
    // Response from backend includes permissions array
    const userData = {
      id: response.user.id,
      email: response.user.email,
      firstName: response.user.firstName,
      lastName: response.user.lastName,
      role: response.user.role,
      roleId: response.user.roleId,
      permissions: response.user.permissions,  // ← From JWT or API
      organizationId: response.user.organizationId,
      primaryBranchId: response.user.primaryBranchId,
      currentBranchId: response.user.currentBranchId
    };
    
    setUser(userData);
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
  };

  // NEW: Permission checking functions
  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(p => user?.permissions?.includes(p)) || false;
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(p => user?.permissions?.includes(p)) || false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

### **STEP 2: Create PermissionGate Component**

**File:** `src/components/auth/PermissionGate.tsx`

```typescript
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';

interface PermissionGateProps {
  permission: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirect?: string;
  requireAll?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  children,
  fallback = null,
  redirect,
  requireAll = false
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();
  
  let hasAccess = false;
  
  if (typeof permission === 'string') {
    hasAccess = hasPermission(permission);
  } else if (Array.isArray(permission)) {
    hasAccess = requireAll 
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission);
  }
  
  if (!hasAccess) {
    if (redirect) {
      return <Navigate to={redirect} />;
    }
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};
```

**Usage Examples:**

```typescript
// 1. Hide button if no permission
<PermissionGate permission="PRESCRIBE">
  <Button onClick={handleAddPrescription}>
    Add Prescription
  </Button>
</PermissionGate>

// 2. Hide entire tab
<Tabs>
  <Tab label="History" value="history" />
  <Tab label="Vitals" value="vitals" />
  
  {/* Only doctors see prescription tab */}
  <PermissionGate permission="PRESCRIBE">
    <Tab label="Prescriptions" value="prescriptions" />
  </PermissionGate>
</Tabs>

// 3. Redirect if no access to page
<PermissionGate permission="VIEW_USERS" redirect="/403">
  <UserManagementPage />
</PermissionGate>

// 4. Show message instead
<PermissionGate 
  permission="VIEW_FINANCIAL_REPORTS"
  fallback={<Alert severity="warning">No access to financial data</Alert>}
>
  <FinancialChart />
</PermissionGate>
```

---

### **STEP 3: Create Role-Based Sidebar**

**File:** `src/config/sidebar.config.ts`

```typescript
export interface SidebarItem {
  label: string;
  route: string;
  icon: string;
  permission?: string;  // If null, always show
}

export interface SidebarSection {
  section: string;
  icon: string;
  items: SidebarItem[];
}

export const SIDEBAR_CONFIG: Record<string, { sections: SidebarSection[] }> = {
  DOCTOR: {
    sections: [
      {
        section: 'My Workspace',
        icon: '🏥',
        items: [
          { label: 'Dashboard', route: '/dashboard', icon: '📊' },
          { label: 'My Schedule', route: '/my-schedule', icon: '📅' },
          { label: 'My Patients', route: '/my-patients', icon: '👥', permission: 'VIEW_PATIENT' }
        ]
      },
      {
        section: 'Clinical',
        icon: '📋',
        items: [
          { label: 'Patient Search', route: '/patients', icon: '🔍', permission: 'VIEW_PATIENT' },
          { label: 'Consultations', route: '/encounters', icon: '📝', permission: 'VIEW_ENCOUNTER' },
          { label: 'Prescriptions', route: '/prescriptions', icon: '💊', permission: 'VIEW_PRESCRIPTION' }
        ]
      },
      {
        section: 'Diagnostics',
        icon: '🔬',
        items: [
          { label: 'Lab Results', route: '/lab/results', icon: '🧪', permission: 'VIEW_LAB_RESULTS' },
          { label: 'Radiology', route: '/radiology', icon: '🩻', permission: 'VIEW_RADIOLOGY_RESULTS' }
        ]
      }
    ]
  },

  NURSE: {
    sections: [
      {
        section: 'Nursing Station',
        icon: '🏥',
        items: [
          { label: 'Dashboard', route: '/dashboard', icon: '📊' },
          { label: 'Triage Queue', route: '/triage', icon: '🚨', permission: 'TRIAGE' },
          { label: 'Ward Patients', route: '/ward', icon: '🛏️', permission: 'VIEW_PATIENT' }
        ]
      },
      {
        section: 'Patient Care',
        icon: '💉',
        items: [
          { label: 'Patient Search', route: '/patients', icon: '🔍', permission: 'VIEW_PATIENT' },
          { label: 'Vital Signs', route: '/vitals', icon: '💓', permission: 'RECORD_VITALS' },
          { label: 'Medications', route: '/medications', icon: '💊', permission: 'ADMINISTER_MEDICATION' }
        ]
      },
      {
        section: 'Documentation',
        icon: '📝',
        items: [
          { label: 'Nursing Notes', route: '/nursing-notes', icon: '📄', permission: 'UPDATE_PATIENT_NOTES' }
        ]
      }
    ]
  },

  PHARMACIST: {
    sections: [
      {
        section: 'Pharmacy',
        icon: '💊',
        items: [
          { label: 'Dashboard', route: '/dashboard', icon: '📊' },
          { label: 'Prescription Queue', route: '/pharmacy/queue', icon: '📋', permission: 'VIEW_PRESCRIPTION' },
          { label: 'Dispense', route: '/pharmacy/dispense', icon: '✅', permission: 'DISPENSE_MEDICATION' }
        ]
      },
      {
        section: 'Inventory',
        icon: '📦',
        items: [
          { label: 'Drug Stock', route: '/pharmacy/inventory', icon: '📊', permission: 'VIEW_STOCK_LEVELS' },
          { label: 'Receive Stock', route: '/pharmacy/receive', icon: '📥', permission: 'RECEIVE_DRUG_STOCK' }
        ]
      }
    ]
  },

  RECEPTIONIST: {
    sections: [
      {
        section: 'Front Desk',
        icon: '🏥',
        items: [
          { label: 'Dashboard', route: '/dashboard', icon: '📊' },
          { label: 'Check-in', route: '/check-in', icon: '✅', permission: 'CHECK_IN_PATIENT' }
        ]
      },
      {
        section: 'Patients',
        icon: '👥',
        items: [
          { label: 'Register Patient', route: '/patients/register', icon: '➕', permission: 'REGISTER_PATIENT' },
          { label: 'Patient Search', route: '/patients', icon: '🔍', permission: 'VIEW_PATIENT_BASIC' }
        ]
      },
      {
        section: 'Appointments',
        icon: '📅',
        items: [
          { label: 'Book Appointment', route: '/appointments/book', icon: '➕', permission: 'CREATE_APPOINTMENT' },
          { label: 'Schedule', route: '/appointments', icon: '📅', permission: 'VIEW_APPOINTMENT' }
        ]
      }
    ]
  }
};
```

**File:** `src/components/layout/Sidebar.tsx`

```typescript
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { SIDEBAR_CONFIG } from '@/config/sidebar.config';

export const Sidebar: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  
  if (!user) return null;
  
  // Get sidebar config for user's role
  const roleConfig = SIDEBAR_CONFIG[user.role] || { sections: [] };
  
  // Filter items by permission
  const filterItemsByPermission = (items) => {
    return items.filter(item => {
      // If no permission required, always show
      if (!item.permission) return true;
      
      // Check if user has required permission
      return hasPermission(item.permission);
    });
  };
  
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>MediCare</h2>
        <p>{user.firstName} {user.lastName}</p>
        <span className="role-badge">{user.role}</span>
      </div>
      
      {roleConfig.sections.map(section => {
        const visibleItems = filterItemsByPermission(section.items);
        
        // Don't render section if no visible items
        if (visibleItems.length === 0) return null;
        
        return (
          <div key={section.section} className="sidebar-section">
            <h3>
              <span>{section.icon}</span>
              {section.section}
            </h3>
            <ul>
              {visibleItems.map(item => (
                <li 
                  key={item.route}
                  className={location.pathname === item.route ? 'active' : ''}
                >
                  <Link to={item.route}>
                    <span className="icon">{item.icon}</span>
                    <span className="label">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </aside>
  );
};
```

---

### **STEP 4: Create Role-Specific Dashboards**

**File:** `src/pages/Dashboard.tsx`

```typescript
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { DoctorDashboard } from './dashboards/DoctorDashboard';
import { NurseDashboard } from './dashboards/NurseDashboard';
import { PharmacistDashboard } from './dashboards/PharmacistDashboard';
import { ReceptionistDashboard } from './dashboards/ReceptionistDashboard';
import { AdminDashboard } from './dashboards/AdminDashboard';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  if (!user) return null;
  
  // Route to role-specific dashboard
  switch (user.role) {
    case 'SUPER_ADMIN':
    case 'HOSPITAL_ADMIN':
      return <AdminDashboard />;
    
    case 'DOCTOR':
      return <DoctorDashboard />;
    
    case 'NURSE':
    case 'HEAD_NURSE':
      return <NurseDashboard />;
    
    case 'PHARMACIST':
      return <PharmacistDashboard />;
    
    case 'LAB_TECHNICIAN':
      return <LabTechnicianDashboard />;
    
    case 'RECEPTIONIST':
      return <ReceptionistDashboard />;
    
    case 'BILLING_OFFICER':
      return <BillingDashboard />;
    
    default:
      return <DefaultDashboard />;
  }
};
```

**File:** `src/pages/dashboards/DoctorDashboard.tsx`

```typescript
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { PatientQueueWidget } from '@/components/dashboard/PatientQueueWidget';
import { TodayScheduleWidget } from '@/components/dashboard/TodayScheduleWidget';

export const DoctorDashboard: React.FC = () => {
  const { data: appointments } = useQuery(['my-appointments-today'], fetchMyAppointmentsToday);
  const { data: queue } = useQuery(['patient-queue'], fetchMyPatientQueue);
  const { data: pendingLabs } = useQuery(['pending-lab-results'], fetchPendingLabResults);
  
  return (
    <div className="doctor-dashboard">
      <h1>My Clinical Workspace</h1>
      
      <div className="metrics-row">
        <MetricCard 
          title="Today's Appointments" 
          value={appointments?.length || 0}
          subtitle={`${appointments?.filter(a => a.status === 'COMPLETED').length || 0} completed`}
          icon="📅"
        />
        <MetricCard 
          title="Patients in Queue" 
          value={queue?.length || 0}
          subtitle={queue?.[0] ? `Next: ${queue[0].patientName}` : 'No waiting patients'}
          icon="⏳"
          alert={queue?.length > 5}
        />
        <MetricCard 
          title="Pending Lab Results" 
          value={pendingLabs?.length || 0}
          subtitle="Need your review"
          icon="🔬"
        />
      </div>
      
      <div className="dashboard-grid">
        <PatientQueueWidget queue={queue} />
        <TodayScheduleWidget appointments={appointments} />
        <PendingLabResultsWidget results={pendingLabs} />
        <RecentPatientsWidget />
      </div>
      
      <div className="quick-actions">
        <Button icon="➕" onClick={() => navigate('/encounters/new')}>
          New Consultation
        </Button>
        <Button icon="🔍" onClick={() => navigate('/patients')}>
          Search Patient
        </Button>
        <Button icon="📋" onClick={() => navigate('/my-schedule')}>
          My Schedule
        </Button>
      </div>
    </div>
  );
};
```

**File:** `src/pages/dashboards/NurseDashboard.tsx`

```typescript
export const NurseDashboard: React.FC = () => {
  const { data: triageQueue } = useQuery(['triage-queue'], fetchTriageQueue);
  const { data: vitalsDue } = useQuery(['vitals-due'], fetchVitalsDue);
  
  return (
    <div className="nurse-dashboard">
      <h1>Nursing Station</h1>
      
      <div className="metrics-row">
        <MetricCard 
          title="Patients to Triage" 
          value={triageQueue?.length || 0}
          subtitle={triageQueue?.filter(p => p.priority === 'RED').length + ' urgent'}
          icon="🚨"
          alert={triageQueue?.some(p => p.priority === 'RED')}
        />
        <MetricCard 
          title="Vitals Due" 
          value={vitalsDue?.length || 0}
          subtitle={vitalsDue?.filter(p => p.overdue).length + ' overdue'}
          icon="💓"
        />
      </div>
      
      <div className="dashboard-grid">
        <TriageQueueWidget queue={triageQueue} />
        <VitalsDueWidget patients={vitalsDue} />
        <MedicationAdministrationWidget />
      </div>
      
      <div className="quick-actions">
        <Button icon="🚨" onClick={() => navigate('/triage')}>
          Triage Patient
        </Button>
        <Button icon="💓" onClick={() => navigate('/vitals')}>
          Record Vitals
        </Button>
        <Button icon="📝" onClick={() => navigate('/nursing-notes')}>
          Nursing Notes
        </Button>
      </div>
    </div>
  );
};
```

---

### **STEP 5: Update Encounter Workspace (Example)**

**File:** `src/pages/EncounterWorkspace.tsx`

**BEFORE (Everyone sees prescription tab):**
```typescript
<Tabs value={activeTab} onChange={setActiveTab}>
  <Tab label="History" value="history" />
  <Tab label="Subjective" value="subjective" />
  <Tab label="Objective" value="objective" />
  <Tab label="Assessment" value="assessment" />
  <Tab label="Plan" value="plan" />
  <Tab label="Prescriptions" value="prescriptions" />  {/* ← EVERYONE SEES THIS */}
  <Tab label="Lab Orders" value="lab" />
</Tabs>
```

**AFTER (Only doctors see prescription tab):**
```typescript
import { PermissionGate } from '@/components/auth/PermissionGate';

<Tabs value={activeTab} onChange={setActiveTab}>
  <Tab label="History" value="history" />
  <Tab label="Subjective" value="subjective" />
  <Tab label="Objective" value="objective" />
  <Tab label="Assessment" value="assessment" />
  <Tab label="Plan" value="plan" />
  
  {/* Only show if user has PRESCRIBE permission */}
  <PermissionGate permission="PRESCRIBE">
    <Tab label="Prescriptions" value="prescriptions" />
  </PermissionGate>
  
  {/* Only show if user has ORDER_LAB permission */}
  <PermissionGate permission="ORDER_LAB">
    <Tab label="Lab Orders" value="lab" />
  </PermissionGate>
</Tabs>

<TabPanel value="prescriptions">
  <PermissionGate permission="PRESCRIBE">
    <PrescriptionForm />
  </PermissionGate>
</TabPanel>
```

---

## 🎯 REAL-WORLD EXAMPLE

### **Doctor vs Nurse - Same Page, Different UI**

**Doctor sees:**
```
┌────────────────────────────────────────┐
│ Patient: Kwame Mensah                  │
├────────────────────────────────────────┤
│ [History] [Subjective] [Objective]     │
│ [Assessment] [Plan] [Prescriptions] ✅ │
│ [Lab Orders] ✅                         │
├────────────────────────────────────────┤
│ Chief Complaint: Fever                 │
│                                        │
│ [Add Diagnosis] ✅                      │
│ [Add Prescription] ✅                   │
│ [Order Lab Test] ✅                     │
│                                        │
│ [Complete Encounter] [Sign] ✅         │
└────────────────────────────────────────┘
```

**Nurse sees (same patient, same page):**
```
┌────────────────────────────────────────┐
│ Patient: Kwame Mensah                  │
├────────────────────────────────────────┤
│ [History] [Subjective] [Objective]     │
│                                        │
├────────────────────────────────────────┤
│ Chief Complaint: Fever                 │
│                                        │
│ Vital Signs:                           │
│ BP: 120/80  HR: 78  Temp: 38.5°C     │
│                                        │
│ [Update Nursing Notes] ✅               │
│                                        │
│ (No prescription button)               │
│ (No lab order button)                  │
│ (No sign encounter button)             │
└────────────────────────────────────────┘
```

---

## ✅ IMPLEMENTATION CHECKLIST

```
☐ Step 1: Update AuthContext to include permissions array
☐ Step 2: Create PermissionGate component
☐ Step 3: Define sidebar config for each role
☐ Step 4: Create role-specific dashboards
☐ Step 5: Wrap all protected components in PermissionGate

☐ Test: Login as DOCTOR → See prescription tab ✅
☐ Test: Login as NURSE → Don't see prescription tab ✅
☐ Test: Login as PHARMACIST → See pharmacy sidebar only ✅
☐ Test: Login as RECEPTIONIST → See registration/appointments only ✅
```

---

## 🎉 RESULT

**BEFORE:**
- Everyone sees same interface
- Nurses click "Add Prescription" → 403 error
- Confusing and frustrating

**AFTER:**
- Each role sees tailored interface
- Nurses never see prescription button
- Clean, professional, role-appropriate UX

This is a **MAJOR UX improvement**! 🚀
