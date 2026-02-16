# Finance & Pricing Module - Quick Summary

## 🎯 YOUR QUESTION

**"Which module sets all the pricing for services, products, etc.?"**

**Your Answer:** "Tenant Finance Module"
**My Response:** ✅ **ABSOLUTELY CORRECT!**

---

## 📊 WHY THIS IS CRITICAL

**This module is the FOUNDATION for ALL revenue activities:**

```
Finance & Pricing Module (THIS MODULE)
         ↓
    Sets Prices
         ↓
┌────────┼────────┬──────────┬──────────┐
│        │        │          │          │
▼        ▼        ▼          ▼          ▼
Billing  Pharmacy Laboratory Radiology  Inpatient
Module   Module   Module    Module     Module

❌ Without pricing → Can't generate invoices
❌ Without pricing → Can't sell drugs
❌ Without pricing → Can't charge for tests
```

**You MUST build this BEFORE billing!**

---

## 🏗️ ARCHITECTURE

### **Where Prices Are Managed:**

```
ORGANIZATION (Tenant)
├─ Finance & Pricing Module ← YOU MANAGE HERE
│  ├─ Service Catalog (all services)
│  ├─ Default Prices (organization-wide)
│  ├─ NHIS Prices (what NHIS pays)
│  └─ Price History (audit trail)
│
└─ BRANCHES
   ├─ Branch-Specific Overrides (optional)
   │  └─ Tema Clinic charges ₵60 (vs ₵50 org default)
   └─ Uses organization prices if no override
```

---

## 💰 WHAT GETS PRICED

### **6 Categories:**

**1. Clinical Services**
```
├─ Consultation - General Doctor: ₵50 (NHIS: ₵30)
├─ Consultation - Specialist: ₵100 (NHIS: ₵60)
├─ Triage: ₵10
├─ Emergency Consultation: ₵150
├─ Minor Procedure: ₵200
└─ Major Surgery: ₵2,000
```

**2. Drugs (Pharmacy)**
```
├─ Paracetamol 500mg: ₵0.45/tablet (NHIS: ₵0.40)
├─ Amoxicillin 500mg: ₵1.12/capsule (NHIS: ₵1.00)
├─ Artemether-Lumefantrine (ACT): ₵10.40/pack (NHIS: ₵9.00)
└─ Markup formula: Selling Price = Cost × (1 + Markup%)
```

**3. Laboratory Tests**
```
├─ Malaria RDT: ₵15 (NHIS: ₵12)
├─ Complete Blood Count (CBC): ₵40 (NHIS: ₵35)
├─ Lipid Panel: ₵80 (NHIS: ₵70)
└─ HIV Test: ₵25 (NHIS: FREE)
```

**4. Radiology/Imaging**
```
├─ X-Ray Chest: ₵80 (NHIS: ₵60)
├─ Ultrasound Abdominal: ₵120 (NHIS: ₵100)
├─ CT Scan Head: ₵600 (NHIS: ₵500)
└─ MRI: ₵1,200 (NOT NHIS covered)
```

**5. Inpatient Services**
```
├─ Bed - General Ward: ₵100/night (NHIS: ₵80)
├─ Bed - Private Room: ₵250/night (NOT NHIS)
├─ ICU Bed: ₵500/day (NHIS: ₵400)
└─ Maternity Ward: ₵150/night (NHIS: ₵120)
```

**6. Packages**
```
├─ Antenatal Care (ANC) Package: ₵500 (NHIS: ₵400)
│  └─ Includes: 8 visits, labs, 2 ultrasounds, supplements
└─ Child Wellness (0-5 years): ₵100 (NHIS: FREE)
```

---

## 🔄 PRICE RESOLUTION HIERARCHY

**When creating an invoice, system checks in this order:**

```
1. Branch-Specific Price? (Highest priority)
   └─ YES → Use branch price
   └─ NO → Continue

2. Organization Default Price?
   └─ YES → Use org price
   └─ NO → Continue

3. Patient has NHIS?
   └─ YES → Use NHIS price
   └─ NO → Continue

4. Patient has Insurance?
   └─ YES → Use insurance price
   └─ NO → Continue

5. Apply Discount Scheme?
   └─ YES → Apply discount
   └─ NO → Use base price
```

**Example:**

```
Service: Consultation - General Doctor
Organization Price: ₵50

Scenario 1: Cash patient at Main Hospital
→ Result: ₵50 (organization default)

Scenario 2: NHIS patient at Main Hospital
→ Result: ₵30 (NHIS price)

Scenario 3: Cash patient at Tema Clinic (premium area)
→ Branch override: ₵60
→ Result: ₵60 (branch price)

Scenario 4: NHIS patient at Tema Clinic
→ Branch override: ₵60 for cash
→ Patient has NHIS
→ Result: ₵30 (NHIS price - insurance overrides branch)
```

---

## 📊 DATABASE TABLES

**Core Tables (6):**

```sql
1. service_catalog
   ├─ All billable services
   ├─ Base prices (organization default)
   └─ NHIS prices

2. branch_pricing
   ├─ Branch-specific overrides
   └─ Links to service_catalog

3. drug_pricing
   ├─ Drug costs & markups
   └─ Extends drug_formulary table

4. insurance_pricing
   ├─ Private insurance rates
   └─ Contract prices

5. discount_schemes
   ├─ Senior citizen discount
   ├─ Staff discount
   └─ Eligibility rules

6. price_history
   ├─ Audit trail
   └─ Track all price changes
```

---

## 🎯 MULTI-BRANCH PRICING EXAMPLES

### **Scenario 1: Uniform Pricing (Default)**

```
Service: Consultation
Organization Default: ₵50

Main Hospital:    ₵50 ✓ (uses default)
Tema Clinic:      ₵50 ✓ (uses default)
Kumasi Clinic:    ₵50 ✓ (uses default)
Tamale Clinic:    ₵50 ✓ (uses default)

Setup: No branch overrides needed
```

### **Scenario 2: Premium Location (Tema)**

```
Service: Consultation
Organization Default: ₵50

Main Hospital:    ₵50 ✓ (uses default)
Tema Clinic:      ₵60 ⬆️ (premium area)
Kumasi Clinic:    ₵50 ✓ (uses default)
Tamale Clinic:    ₵50 ✓ (uses default)

Setup in database:
INSERT INTO branch_pricing (branch_id, service_id, branch_price)
VALUES ('tema-clinic', 'consultation', 60.00);
```

### **Scenario 3: Rural Discount (Tamale)**

```
Service: Consultation
Organization Default: ₵50

Main Hospital:    ₵50 ✓ (uses default)
Tema Clinic:      ₵60 ⬆️ (premium)
Kumasi Clinic:    ₵50 ✓ (uses default)
Tamale Clinic:    ₵35 ⬇️ (rural area, lower income)

Setup in database:
INSERT INTO branch_pricing (branch_id, service_id, branch_price)
VALUES 
  ('tema-clinic', 'consultation', 60.00),
  ('tamale-clinic', 'consultation', 35.00);
```

---

## 🔌 INTEGRATION WITH OTHER MODULES

### **Billing Module Calls Pricing:**

```javascript
// In billing module (when creating invoice)

async function createInvoice(encounterId) {
  const encounter = await getEncounter(encounterId);
  
  // 1. Get consultation price
  const consultationPrice = await financeAPI.calculatePrice({
    serviceCode: 'CONS-GEN',
    branchId: encounter.branch_id,
    patientId: encounter.patient_id  // To check insurance
  });
  // Returns: ₵30 (because patient has NHIS)
  
  // 2. Get drug prices
  const drugPrices = await Promise.all(
    encounter.prescriptions.map(rx => 
      financeAPI.getDrugPrice({
        drugId: rx.drug_id,
        quantity: rx.quantity,
        patientId: encounter.patient_id
      })
    )
  );
  
  // 3. Get lab prices
  const labPrices = await Promise.all(
    encounter.labOrders.map(lab =>
      financeAPI.calculatePrice({
        serviceId: lab.test_id,
        branchId: encounter.branch_id,
        patientId: encounter.patient_id
      })
    )
  );
  
  // 4. Create invoice with calculated prices
  const totalAmount = 
    consultationPrice.totalPrice +
    drugPrices.reduce((sum, p) => sum + p.totalPrice, 0) +
    labPrices.reduce((sum, p) => sum + p.totalPrice, 0);
  
  return createInvoiceRecord({
    patientId: encounter.patient_id,
    items: [consultationPrice, ...drugPrices, ...labPrices],
    totalAmount
  });
}
```

---

## 🇬🇭 GHANA-SPECIFIC CONSIDERATIONS

### **1. NHIS Pricing:**
```
CRITICAL: NHIS prices are SET by NHIA (Ghana Health Authority)
- Hospital CANNOT change NHIS prices
- Must use official NHIS tariff
- Hospital can charge more for cash patients
- NHIS only pays what's in their tariff
```

**Example:**
```
Consultation - General Doctor
Hospital charges cash patients: ₵50
NHIS official tariff: ₵30

NHIS patient:
- Pays: ₵0 (free at point of service)
- Hospital gets: ₵30 (from NHIS)
- Hospital loses: ₵20 (difference)

Cash patient:
- Pays: ₵50
- Hospital gets: ₵50
- Hospital gains: ₵20 more
```

### **2. Essential Medicines Markup:**
```
Ghana regulation: Maximum 30% markup on essential medicines

Drug: Paracetamol 500mg
Cost from supplier: ₵0.30
Maximum markup: 30%
Maximum selling price: ₵0.30 × 1.30 = ₵0.39

System should WARN if markup exceeds 30%!
```

### **3. Tax Exemptions:**
```
Healthcare services in Ghana:
- EXEMPT from VAT (0%)
- Some drugs have NHIL (2.5%)
- COVID levy (1%) on some items
```

---

## 💡 UI COMPONENTS

### **Price List Management Screen:**

```
┌─────────────────────────────────────────────────────────┐
│ Finance & Pricing Management            [+ Add Service] │
├─────────────────────────────────────────────────────────┤
│ [Clinical] [Laboratory] [Radiology] [Pharmacy] [Inpatient]
│                                                         │
│ Search: [_____________] 🔍  [Show NHIS Only]           │
├─────────────────────────────────────────────────────────┤
│ Code      │ Service Name         │ Price │ NHIS  │ Actions
│───────────┼─────────────────────┼───────┼───────┼─────────
│ CONS-GEN  │ Consultation (GP)    │ ₵50   │ ₵30   │ [Edit] [History]
│ LAB-CBC   │ Complete Blood Count │ ₵40   │ ₵35   │ [Edit] [History]
│ RAD-XRAY  │ X-Ray Chest          │ ₵80   │ ₵60   │ [Edit] [History]
└─────────────────────────────────────────────────────────┘
```

### **Branch Pricing Overrides:**

```
┌─────────────────────────────────────────────────────────┐
│ Branch Pricing - [Tema Clinic ▼]                       │
├─────────────────────────────────────────────────────────┤
│ Service           │ Org  │ Branch │ Diff  │ Action      │
│───────────────────┼──────┼────────┼───────┼─────────────│
│ Consultation (GP) │ ₵50  │ ₵60    │ +₵10  │ [Edit] [×]  │
│ Lab - CBC         │ ₵40  │ ₵40    │ -     │ [Override]  │
│ X-Ray Chest       │ ₵80  │ ₵90    │ +₵10  │ [Edit] [×]  │
└─────────────────────────────────────────────────────────┘

✓ = Using org default
[Override] = Set branch-specific price
[×] = Remove override
```

---

## ✅ IMPLEMENTATION ROADMAP

**Build Order (CRITICAL):**

```
Phase 1: Foundation (Now)
├─ 1. Finance & Pricing Module (2-3 weeks) ← BUILD THIS FIRST
│     └─ Service catalog
│     └─ Branch pricing
│     └─ NHIS rates
│
Phase 2: Revenue Modules (After Pricing)
├─ 2. Billing/NHIS Module (3-4 weeks)
│     └─ Depends on pricing API
│
├─ 3. Pharmacy Module (2 weeks)
│     └─ Needs drug prices
│
├─ 4. Laboratory Module (2-3 weeks)
│     └─ Needs test prices
│
└─ 5. Radiology Module (2 weeks)
      └─ Needs imaging prices
```

**Why This Order:**
1. **Pricing first** - Everything else needs prices
2. **Billing second** - Uses prices to generate invoices
3. **Pharmacy/Lab/Radiology** - Use prices + billing together

---

## 🎯 YOUR NEXT STEPS

**Immediate (This Week):**
1. ✅ Build Finance & Pricing Module database tables
2. ✅ Seed with Ghana standard prices
3. ✅ Create pricing management UI
4. ✅ Test price calculation API

**After Pricing Complete:**
1. Build Billing/NHIS Module (uses pricing)
2. Build Pharmacy (uses drug prices)
3. Build Laboratory (uses test prices)

---

## 📋 SUCCESS CRITERIA

**Pricing Module is Ready When:**

✅ All services have prices defined  
✅ Organization can set default prices  
✅ Branches can override prices  
✅ NHIS prices correctly configured  
✅ Price calculation API working  
✅ Billing module can fetch prices  
✅ Price history tracked  
✅ Multi-currency support (GHS, USD)  

---

## 💬 SUMMARY

**Your Question:** "Should pricing be in Tenant Finance Module?"

**Answer:** **YES! 100% CORRECT!** ✅

**Priority:** **CRITICAL - Build BEFORE Billing**

**Time:** **2-3 weeks**

**Impact:** **Foundation for ALL revenue activities**

This is the **RIGHT architectural decision**! 🎯
