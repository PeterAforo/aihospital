import { Router, type IRouter } from 'express';
import { RegistrationController } from './registration.controller.js';
import { validateBody } from '../../common/middleware/validate.js';
import {
  preQualifySchema,
  hospitalDetailsSchema,
  adminAccountSchema,
  planSelectionSchema,
  setupPreferencesSchema,
  verifyCodeSchema,
  resendCodeSchema,
  selectVerificationMethodSchema,
  checkEmailSchema,
  checkPhoneSchema,
} from './registration.schema.js';

const router: ReturnType<typeof Router> = Router();
const controller = new RegistrationController();

// Step 1: Pre-qualification
router.post('/pre-qualify', validateBody(preQualifySchema), controller.preQualify);

// Step 2: Hospital Details
router.post('/hospital-details', validateBody(hospitalDetailsSchema), controller.saveHospitalDetails);

// Step 3: Admin Account
router.post('/admin-account', validateBody(adminAccountSchema), controller.saveAdminAccount);

// Step 4: Plan Selection
router.post('/select-plan', validateBody(planSelectionSchema), controller.savePlanSelection);

// Step 5: Complete Registration
router.post('/complete', validateBody(setupPreferencesSchema), controller.completeRegistration);

// Step 6: Verification (supports email or phone)
router.post('/send-code', validateBody(selectVerificationMethodSchema), controller.sendVerificationCode);
router.post('/verify-code', validateBody(verifyCodeSchema), controller.verifyCode);
router.post('/resend-code', validateBody(resendCodeSchema), controller.resendCode);

// Availability checks
router.post('/check-email', validateBody(checkEmailSchema), controller.checkEmail);
router.post('/check-phone', validateBody(checkPhoneSchema), controller.checkPhone);

// Get registration progress
router.get('/progress/:registrationId', controller.getProgress);

export default router;
