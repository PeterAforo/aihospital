# AIHospital API Reference

Base URL: `http://localhost:5000/api`

## Authentication

All endpoints (except auth and webhooks) require `Authorization: Bearer <token>` header.

### Auth Endpoints
| Method | Path | Description | Rate Limit |
|--------|------|-------------|------------|
| POST | `/auth/register` | Register new user | - |
| POST | `/auth/login` | Login (returns JWT + refresh token) | 10/15min |
| POST | `/auth/refresh` | Refresh access token | - |
| GET | `/auth/me` | Get current user profile | - |
| POST | `/auth/logout` | Logout | - |
| POST | `/auth/forgot-password` | Initiate password reset | 5/hr |
| POST | `/auth/reset-password` | Reset password with token | 5/hr |
| POST | `/auth/change-password` | Change password (authenticated) | - |

### MFA Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/mfa/setup` | Generate TOTP secret + QR code |
| POST | `/auth/mfa/enable` | Verify TOTP and enable MFA |
| POST | `/auth/mfa/verify-login` | Complete MFA login step |
| POST | `/auth/mfa/disable` | Disable MFA |
| POST | `/auth/mfa/backup-codes` | Regenerate backup codes |
| GET | `/auth/mfa/status` | Get MFA status |

## Patients
| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/patients` | List patients | VIEW_PATIENT |
| GET | `/patients/:id` | Get patient details | VIEW_PATIENT |
| POST | `/patients` | Create patient | CREATE_PATIENT |
| PUT | `/patients/:id` | Update patient | EDIT_PATIENT |
| POST | `/patients/:id/photo` | Upload patient photo | EDIT_PATIENT |
| GET | `/patients/:id/documents` | List patient documents | VIEW_PATIENT |
| POST | `/patients/:id/documents` | Upload document | EDIT_PATIENT |

## EMR (Electronic Medical Records)
| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/emr/encounters` | List encounters | VIEW_ENCOUNTER |
| POST | `/emr/encounters` | Create encounter | CREATE_ENCOUNTER |
| GET | `/emr/encounters/:id` | Get encounter details | VIEW_ENCOUNTER |
| POST | `/emr/prescriptions/validate` | CDS prescription validation | PRESCRIBE |
| POST | `/emr/cds/validate-dispensing` | CDS dispensing validation | DISPENSE_MEDICATION |
| GET | `/emr/cds/alerts` | Get CDS alert history | VIEW_ENCOUNTER |

## Pharmacy
| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/pharmacy/prescriptions` | List prescriptions | VIEW_PRESCRIPTIONS |
| POST | `/pharmacy/dispense` | Dispense medication | DISPENSE_MEDICATION |
| GET | `/pharmacy/stock` | View stock levels | VIEW_STOCK |
| GET | `/pharmacy/expiry/summary` | Expiry alert summary | VIEW_STOCK |
| GET | `/pharmacy/expiry/fefo` | FEFO recommendations | VIEW_STOCK |
| POST | `/pharmacy/disposal` | Process disposal | MANAGE_STOCK |

## Laboratory
| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/lab/orders` | List lab orders | VIEW_LAB_ORDERS |
| POST | `/lab/orders` | Create lab order | CREATE_LAB_ORDER |
| POST | `/lab/results` | Enter result | ENTER_LAB_RESULT |
| POST | `/lab/results/:id/verify` | Verify result | VERIFY_LAB_RESULT |
| GET | `/lab/critical-alerts` | Get critical value alerts | VIEW_LAB_ORDERS |
| POST | `/lab/critical-alerts/:id/acknowledge` | Acknowledge alert | VIEW_LAB_ORDERS |

## Billing
| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/billing/invoices` | List invoices | VIEW_INVOICES |
| POST | `/billing/invoices` | Create invoice | CREATE_INVOICE |
| GET | `/billing/invoices/:id` | Get invoice | VIEW_INVOICES |
| POST | `/billing/payments` | Record payment | PROCESS_PAYMENT |
| GET | `/billing/receipts/:paymentId/pdf` | Download PDF receipt | VIEW_INVOICES |
| GET | `/billing/receipts/:paymentId` | Get receipt data (JSON) | VIEW_INVOICES |
| POST | `/billing/receipts/:paymentId/email` | Email receipt | PROCESS_PAYMENT |

### Paystack Payment Gateway
| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| POST | `/billing/paystack/initialize` | Initialize payment | PROCESS_PAYMENT |
| GET | `/billing/paystack/verify/:ref` | Verify transaction | PROCESS_PAYMENT |

### Paystack Webhook (no auth)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhooks/paystack` | Paystack webhook (HMAC verified) |

## Finance & General Ledger
| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| GET | `/finance/services` | List service catalog | - |
| GET | `/finance/gl/accounts` | List chart of accounts | VIEW_INVOICES |
| POST | `/finance/gl/accounts` | Create account | HOSPITAL_ADMIN |
| PUT | `/finance/gl/accounts/:id` | Update account | HOSPITAL_ADMIN |
| POST | `/finance/gl/accounts/seed` | Seed default accounts | HOSPITAL_ADMIN |
| GET | `/finance/gl/journal-entries` | List journal entries | VIEW_INVOICES |
| POST | `/finance/gl/journal-entries` | Create journal entry | HOSPITAL_ADMIN |
| POST | `/finance/gl/journal-entries/:id/reverse` | Reverse entry | HOSPITAL_ADMIN |
| GET | `/finance/gl/trial-balance` | Trial balance report | VIEW_INVOICES |
| GET | `/finance/gl/profit-and-loss` | P&L statement | VIEW_INVOICES |
| GET | `/finance/gl/balance-sheet` | Balance sheet | VIEW_INVOICES |
| GET | `/finance/gl/cash-flow` | Cash flow statement | VIEW_INVOICES |
| GET | `/finance/gl/budget-vs-actual` | Budget vs actual | VIEW_INVOICES |
| GET | `/finance/gl/fiscal-periods` | List fiscal periods | VIEW_INVOICES |
| POST | `/finance/gl/fiscal-periods` | Create fiscal period | HOSPITAL_ADMIN |
| POST | `/finance/gl/fiscal-periods/:id/close` | Close period | HOSPITAL_ADMIN |

## Inpatient
| Method | Path | Description |
|--------|------|-------------|
| GET | `/inpatient/wards` | List wards with occupancy |
| POST | `/inpatient/wards` | Create ward |
| GET | `/inpatient/admissions` | List admissions |
| POST | `/inpatient/admissions` | Admit patient |
| GET | `/inpatient/admissions/:id/nursing-notes` | List nursing notes |
| POST | `/inpatient/admissions/:id/nursing-notes` | Add nursing note |

## Emergency Department
| Method | Path | Description |
|--------|------|-------------|
| GET | `/emergency/visits` | List ER visits (real-time via WebSocket) |
| POST | `/emergency/visits` | Register ER visit |
| PATCH | `/emergency/visits/:id/triage` | Triage patient |
| PATCH | `/emergency/visits/:id/status` | Update visit status |

## Maternity
| Method | Path | Description |
|--------|------|-------------|
| GET | `/maternity/pregnancies` | List pregnancies |
| POST | `/maternity/pregnancies` | Register pregnancy |
| GET | `/maternity/deliveries/:id/partograph` | Get full partograph data |
| POST | `/maternity/deliveries/:id/partograph/entries` | Add partograph entry |
| GET | `/maternity/dashboard` | Maternity dashboard stats |

## WebSocket Endpoints
| Path | Description | Params |
|------|-------------|--------|
| `/ws/queue?doctorId=<id>` | Doctor queue updates | doctorId |
| `/ws/er-board?tenantId=<id>` | Real-time ER board | tenantId |

## Monitoring
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/metrics` | Server metrics (uptime, memory, DB, WebSocket) |

## Rate Limits
- **Global API**: 100 requests/minute per IP
- **Auth (login)**: 10 requests/15 minutes per IP
- **Password reset**: 5 requests/hour per IP
- **Webhooks**: 200 requests/minute per IP

## Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Pagination
Most list endpoints support `?page=1&limit=20` query parameters.

## Date Filters
Financial reports require `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`.
