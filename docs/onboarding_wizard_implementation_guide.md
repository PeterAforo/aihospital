# Tenant Onboarding Wizard - Visual Guide & Implementation

## 🎯 OVERVIEW

**Purpose:** Guide new hospital tenants through all required setup steps on first login  
**Time to complete:** 30-60 minutes  
**Steps:** 10 steps (7 required, 3 optional)  
**Result:** Hospital ready to accept patients

---

## 📱 UI FLOW VISUALIZATION

### **Scenario 1: New Tenant First Login**

```
┌─────────────────────────────────────────────────────────┐
│ LOGIN SCREEN                                            │
│                                                         │
│ Email: admin@hospital.com                              │
│ Password: ********                                      │
│                                                         │
│                 [Login]                                 │
└─────────────────────────────────────────────────────────┘
                        ↓
                 (First login detected)
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 🎉 WELCOME MODAL (Full screen, cannot close)           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Welcome to MediCare Ghana!                            │
│   Let's set up your hospital in 10 easy steps          │
│                                                         │
│   ⏱️ Estimated time: 30-60 minutes                     │
│   💾 You can save and continue later                    │
│                                                         │
│              [Start Setup →]                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ SETUP WIZARD - Step 1 of 10                            │
├─────────────────────────────────────────────────────────┤
│ Progress: ●○○○○○○○○○ 10%                               │
│                                                         │
│ 🏥 Hospital Profile                                     │
│ Tell us about your hospital                             │
│                                                         │
│ Hospital Name: [_____________________________]          │
│ Hospital Type: [Teaching Hospital ▼]                   │
│ Category:      [Public ▼]                              │
│ Bed Capacity:  [50__]                                  │
│ Region:        [Greater Accra ▼]                       │
│ ...                                                     │
│                                                         │
│ [← Previous]  [Save & Continue Later]  [Next →]        │
└─────────────────────────────────────────────────────────┘
                        ↓
                  (User completes steps 1-10)
                        ↓
┌─────────────────────────────────────────────────────────┐
│ SETUP WIZARD - Step 10 of 10                           │
├─────────────────────────────────────────────────────────┤
│ Progress: ●●●●●●●●●● 100%                              │
│                                                         │
│ ✅ Review & Complete Setup                              │
│                                                         │
│ ✓ Hospital Profile - Korle Bu Teaching Hospital        │
│ ✓ Branches - 3 branches configured                     │
│ ✓ Departments - 8 departments                          │
│ ✓ Staff - 12 staff members                             │
│ ✓ Pricing - 45 services priced                         │
│ ✓ Drug Formulary - 150 drugs                           │
│ ✓ Lab Tests - 25 tests                                 │
│ ✓ Wards & Beds - 2 wards, 50 beds                      │
│ ✓ Integrations - 2 services connected                  │
│                                                         │
│            [Complete Setup →]                           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 🎉 SUCCESS MODAL                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Congratulations! Your hospital is ready!               │
│                                                         │
│  You can now start:                                     │
│  ✅ Registering patients                                │
│  ✅ Scheduling appointments                             │
│  ✅ Clinical consultations                              │
│  ✅ Managing pharmacy & lab                             │
│                                                         │
│  📚 View User Guide  🎥 Watch Tutorials                │
│                                                         │
│              [Go to Dashboard →]                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### **Scenario 2: Returning User with Incomplete Setup**

```
┌─────────────────────────────────────────────────────────┐
│ LOGIN → DASHBOARD                                       │
├─────────────────────────────────────────────────────────┤
│ ⚠️ SETUP INCOMPLETE BANNER (Top of page)               │
│ Your setup is 70% complete. 3 steps remaining.         │
│ [Continue Setup]  [✕ Dismiss]                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Dashboard Content Below...                              │
│                                                         │
│ ┌─────────────────────────────────┐                    │
│ │ 📋 Setup Progress Widget         │                    │
│ │ ●●●●●●●○○○ 70%                  │                    │
│ │                                 │                    │
│ │ Completed:                      │                    │
│ │ ✓ Hospital Profile              │                    │
│ │ ✓ Branches                      │                    │
│ │ ✓ Staff                         │                    │
│ │                                 │                    │
│ │ Pending:                        │                    │
│ │ ○ Departments                   │                    │
│ │ ○ Service Pricing               │                    │
│ │ ○ Drug Formulary                │                    │
│ │                                 │                    │
│ │ [Complete Setup →]              │                    │
│ └─────────────────────────────────┘                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 💻 IMPLEMENTATION EXAMPLES

### **1. Database Schema**

```sql
-- Add to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMP NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_progress_json JSONB DEFAULT '{}';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_step_1_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_step_2_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_step_3_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_step_4_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_step_5_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_step_6_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_step_7_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_step_8_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_step_9_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_step_10_completed BOOLEAN DEFAULT FALSE;

-- Example setup_progress_json structure
{
  "step_1": {"completed": true, "completed_at": "2024-02-15T10:00:00Z"},
  "step_2": {"completed": true, "completed_at": "2024-02-15T10:05:00Z"},
  "step_3": {"completed": false, "skipped": false},
  "overall_percentage": 20
}
```

---

### **2. Backend API (Node.js/NestJS)**

```typescript
// setup.controller.ts
@Controller('api/setup')
export class SetupController {
  
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getSetupStatus(@CurrentUser() user: User) {
    const org = await this.orgService.findById(user.organization_id);
    
    const steps = [
      { step: 1, title: 'Hospital Profile', completed: org.setup_step_1_completed, required: true },
      { step: 2, title: 'Branches', completed: org.setup_step_2_completed, required: true },
      { step: 3, title: 'Departments', completed: org.setup_step_3_completed, required: true },
      { step: 4, title: 'Staff', completed: org.setup_step_4_completed, required: true },
      { step: 5, title: 'Pricing', completed: org.setup_step_5_completed, required: true },
      { step: 6, title: 'Drug Formulary', completed: org.setup_step_6_completed, required: true },
      { step: 7, title: 'Lab Tests', completed: org.setup_step_7_completed, required: true },
      { step: 8, title: 'Wards & Beds', completed: org.setup_step_8_completed, required: false },
      { step: 9, title: 'Integrations', completed: org.setup_step_9_completed, required: false },
      { step: 10, title: 'Review', completed: org.setup_step_10_completed, required: true }
    ];
    
    const completedSteps = steps.filter(s => s.completed).length;
    const overallPercentage = (completedSteps / steps.length) * 100;
    
    const missingRequiredSteps = steps
      .filter(s => s.required && !s.completed)
      .map(s => s.step);
    
    return {
      setup_completed: org.setup_completed,
      overall_percentage: overallPercentage,
      steps,
      missing_required_steps: missingRequiredSteps,
      show_wizard: missingRequiredSteps.length > 0
    };
  }
  
  @Post('steps/:stepId')
  @UseGuards(JwtAuthGuard)
  async saveStepProgress(
    @Param('stepId') stepId: string,
    @Body() data: any,
    @CurrentUser() user: User
  ) {
    const stepNumber = this.getStepNumber(stepId);
    
    // Save step data (varies by step)
    await this.setupService.saveStepData(stepId, data, user.organization_id);
    
    // Mark step as completed
    await this.orgService.update(user.organization_id, {
      [`setup_step_${stepNumber}_completed`]: true,
      setup_progress_json: {
        ...org.setup_progress_json,
        [`step_${stepNumber}`]: {
          completed: true,
          completed_at: new Date()
        }
      }
    });
    
    return {
      success: true,
      step_completed: true,
      overall_percentage: await this.calculateProgress(user.organization_id)
    };
  }
  
  @Post('complete')
  @UseGuards(JwtAuthGuard)
  async completeSetup(@CurrentUser() user: User) {
    // Validate all required steps completed
    const status = await this.getSetupStatus(user);
    if (status.missing_required_steps.length > 0) {
      throw new BadRequestException('Required steps not completed');
    }
    
    // Mark setup complete
    await this.orgService.update(user.organization_id, {
      setup_completed: true,
      setup_completed_at: new Date()
    });
    
    // Send welcome email
    await this.emailService.sendWelcomeEmail(user);
    
    // Create audit log
    await this.auditService.log({
      organization_id: user.organization_id,
      user_id: user.id,
      action: 'SETUP_COMPLETED',
      timestamp: new Date()
    });
    
    return {
      success: true,
      message: 'Setup completed successfully'
    };
  }
}
```

---

### **3. Frontend Components (React)**

```typescript
// SetupWizardModal.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { setupAPI } from '@/api/setup';

export const SetupWizardModal: React.FC = () => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [setupData, setSetupData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    const status = await setupAPI.getStatus();
    
    // Find first incomplete step
    const firstIncomplete = status.steps.find(s => !s.completed);
    setCurrentStep(firstIncomplete?.step || 1);
    setLoading(false);
    
    // Don't show wizard if setup complete
    if (status.setup_completed) {
      return null;
    }
  };

  const handleStepComplete = async (stepId: string, data: any) => {
    await setupAPI.saveStep(stepId, data);
    setCurrentStep(prev => prev + 1);
  };

  const handleWizardComplete = async () => {
    await setupAPI.completeSetup();
    window.location.href = '/dashboard';
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Modal 
      isOpen={true} 
      closeable={false} 
      size="xl"
    >
      <div className="setup-wizard">
        {/* Progress Bar */}
        <ProgressBar 
          current={currentStep} 
          total={10} 
          percentage={(currentStep / 10) * 100}
        />

        {/* Step Content */}
        {currentStep === 1 && (
          <HospitalProfileStep 
            onComplete={(data) => handleStepComplete('hospital_profile', data)}
          />
        )}
        
        {currentStep === 2 && (
          <BranchesStep 
            onComplete={(data) => handleStepComplete('branches_setup', data)}
            onPrevious={() => setCurrentStep(1)}
          />
        )}
        
        {/* ... more steps ... */}
        
        {currentStep === 10 && (
          <ReviewStep 
            setupData={setupData}
            onComplete={handleWizardComplete}
            onPrevious={() => setCurrentStep(9)}
          />
        )}
      </div>
    </Modal>
  );
};
```

```typescript
// HospitalProfileStep.tsx
export const HospitalProfileStep: React.FC<StepProps> = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    hospital_name: '',
    hospital_type: '',
    region: '',
    phone: '',
    email: '',
    nhis_accreditation: ''
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors: any = {};
    if (!formData.hospital_name) newErrors.hospital_name = 'Required';
    if (!formData.hospital_type) newErrors.hospital_type = 'Required';
    // ... more validations
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onComplete(formData);
    }
  };

  return (
    <div className="step-content">
      <div className="step-header">
        <span className="step-icon">🏥</span>
        <h2>Hospital Profile</h2>
        <p>Tell us about your hospital</p>
      </div>

      <form className="step-form">
        <FormField
          label="Hospital Name"
          required
          error={errors.hospital_name}
        >
          <input
            type="text"
            value={formData.hospital_name}
            onChange={(e) => setFormData({...formData, hospital_name: e.target.value})}
            placeholder="e.g., Korle Bu Teaching Hospital"
          />
        </FormField>

        <FormField label="Hospital Type" required>
          <select
            value={formData.hospital_type}
            onChange={(e) => setFormData({...formData, hospital_type: e.target.value})}
          >
            <option value="">Select type...</option>
            <option value="Teaching Hospital">Teaching Hospital</option>
            <option value="District Hospital">District Hospital</option>
            <option value="Polyclinic">Polyclinic</option>
          </select>
        </FormField>

        {/* ... more fields ... */}

        <div className="step-actions">
          <button type="button" onClick={() => {/* Save & Continue Later */}}>
            Save & Continue Later
          </button>
          <button type="button" onClick={handleSubmit} className="primary">
            Next →
          </button>
        </div>
      </form>
    </div>
  );
};
```

```typescript
// SetupReminderBanner.tsx
export const SetupReminderBanner: React.FC = () => {
  const [setupStatus, setSetupStatus] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadSetupStatus();
  }, []);

  const loadSetupStatus = async () => {
    const status = await setupAPI.getStatus();
    if (!status.setup_completed) {
      setSetupStatus(status);
    }
  };

  if (!setupStatus || dismissed) return null;

  return (
    <div className="setup-banner warning">
      <div className="banner-content">
        <span className="icon">⚠️</span>
        <div className="message">
          <strong>Your setup is {setupStatus.overall_percentage}% complete.</strong>
          <span>{setupStatus.missing_required_steps.length} steps remaining.</span>
        </div>
        <button onClick={() => window.location.href = '/setup'}>
          Continue Setup
        </button>
        <button className="dismiss" onClick={() => setDismissed(true)}>
          ✕
        </button>
      </div>
      
      {/* Progress bar */}
      <div className="banner-progress">
        <div 
          className="progress-fill" 
          style={{ width: `${setupStatus.overall_percentage}%` }}
        />
      </div>
    </div>
  );
};
```

---

## 🎨 STYLING GUIDE

```css
/* setup-wizard.css */

.setup-wizard {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.progress-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.progress-steps {
  display: flex;
  gap: 0.5rem;
}

.progress-step {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.progress-step.completed {
  background: #10b981;
  color: white;
}

.progress-step.current {
  background: #3b82f6;
  color: white;
}

.step-header {
  text-align: center;
  margin-bottom: 2rem;
}

.step-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

.step-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.setup-banner {
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.setup-banner.warning {
  background: #fef3c7;
  border-color: #f59e0b;
}

.banner-progress {
  height: 4px;
  background: #e5e7eb;
  margin-top: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: #f59e0b;
  transition: width 0.3s;
}
```

---

## ✅ CHECKLIST FOR IMPLEMENTATION

### **Backend:**
```
☐ Add setup columns to organizations table
☐ Create GET /api/setup/status endpoint
☐ Create POST /api/setup/steps/:stepId endpoint
☐ Create POST /api/setup/complete endpoint
☐ Create POST /api/setup/steps/:stepId/skip endpoint
☐ Implement step validation logic
☐ Implement setup completion email
☐ Create audit logging
```

### **Frontend:**
```
☐ Create SetupWizardModal component
☐ Create SetupReminderBanner component
☐ Create individual step components (10 steps)
☐ Create SetupProgressWidget for dashboard
☐ Add setup check on login
☐ Add wizard trigger logic
☐ Implement form validation for each step
☐ Implement progress tracking
☐ Add "Save & Continue Later" functionality
☐ Style all components
```

### **Testing:**
```
☐ Test wizard appears on first login
☐ Test progress saves correctly
☐ Test "Save & Continue Later" works
☐ Test reminder banner appears for incomplete setup
☐ Test all validation rules
☐ Test setup completion flow
☐ Test email notifications
☐ Test skip optional steps
☐ Test with different hospital types
```

---

## 🚀 ROLLOUT STRATEGY

### **Phase 1: MVP (Week 1)**
```
✅ Steps 1-4 only (Profile, Branches, Departments, Staff)
✅ Basic wizard modal
✅ Simple progress tracking
✅ Test with 5 pilot hospitals
```

### **Phase 2: Full Features (Week 2)**
```
✅ Add Steps 5-10
✅ Add reminder banner
✅ Add dashboard widget
✅ Add email notifications
✅ Add bulk import features
```

### **Phase 3: Polish (Week 3)**
```
✅ UI/UX improvements
✅ Add preset templates
✅ Add help tooltips
✅ Add progress saving
✅ Add analytics tracking
```

---

## 📊 SUCCESS METRICS

**Track these KPIs:**
```
✅ Setup completion rate (target: >85%)
✅ Time to first patient (target: <30 min from signup)
✅ Setup abandonment at step X
✅ Most skipped optional steps
✅ Support tickets about setup (should decrease)
✅ User satisfaction (survey after completion)
```

---

**This wizard is CRITICAL for SaaS success! It dramatically reduces onboarding friction and gets hospitals productive faster!** 🎯
