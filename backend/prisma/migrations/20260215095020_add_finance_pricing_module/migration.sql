-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('CLINICAL_SERVICES', 'LABORATORY', 'RADIOLOGY', 'PHARMACY', 'INPATIENT', 'PACKAGES');

-- CreateTable
CREATE TABLE "service_catalog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "subcategory" TEXT,
    "description" TEXT,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'per_visit',
    "isNhisCovered" BOOLEAN NOT NULL DEFAULT false,
    "nhisPrice" DOUBLE PRECISION,
    "nhisCode" TEXT,
    "requiresNhisPreauth" BOOLEAN NOT NULL DEFAULT false,
    "isTaxable" BOOLEAN NOT NULL DEFAULT false,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_pricing" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "branchPrice" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_pricing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "insuranceCompanyId" TEXT,
    "insuranceCompanyName" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "insurancePrice" DOUBLE PRECISION NOT NULL,
    "discountPercentage" DOUBLE PRECISION,
    "contractStartDate" TIMESTAMP(3) NOT NULL,
    "contractEndDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurance_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_schemes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schemeName" TEXT NOT NULL,
    "discountType" TEXT NOT NULL DEFAULT 'percentage',
    "discountValue" DOUBLE PRECISION NOT NULL,
    "appliesTo" TEXT NOT NULL DEFAULT 'all_services',
    "eligibilityCriteria" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "oldPrice" DOUBLE PRECISION NOT NULL,
    "newPrice" DOUBLE PRECISION NOT NULL,
    "changeReason" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_catalog_tenantId_category_idx" ON "service_catalog"("tenantId", "category");

-- CreateIndex
CREATE INDEX "service_catalog_tenantId_isActive_idx" ON "service_catalog"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "service_catalog_tenantId_serviceCode_key" ON "service_catalog"("tenantId", "serviceCode");

-- CreateIndex
CREATE INDEX "branch_pricing_branchId_idx" ON "branch_pricing"("branchId");

-- CreateIndex
CREATE INDEX "branch_pricing_serviceId_idx" ON "branch_pricing"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "branch_pricing_branchId_serviceId_effectiveFrom_key" ON "branch_pricing"("branchId", "serviceId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "insurance_pricing_tenantId_insuranceCompanyName_idx" ON "insurance_pricing"("tenantId", "insuranceCompanyName");

-- CreateIndex
CREATE INDEX "insurance_pricing_serviceId_idx" ON "insurance_pricing"("serviceId");

-- CreateIndex
CREATE INDEX "discount_schemes_tenantId_isActive_idx" ON "discount_schemes"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "price_history_serviceId_effectiveDate_idx" ON "price_history"("serviceId", "effectiveDate");

-- AddForeignKey
ALTER TABLE "service_catalog" ADD CONSTRAINT "service_catalog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_pricing" ADD CONSTRAINT "branch_pricing_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_pricing" ADD CONSTRAINT "branch_pricing_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_pricing" ADD CONSTRAINT "insurance_pricing_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_schemes" ADD CONSTRAINT "discount_schemes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
