import { Request, Response, NextFunction } from 'express';
import { RegistrationService } from './registration.service.js';
import { sendSuccess } from '../../common/utils/api-response.js';

const registrationService = new RegistrationService();

export class RegistrationController {
  async preQualify(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await registrationService.preQualify(
        req.body,
        req.ip,
        req.headers['user-agent']
      );
      sendSuccess(res, result, 'Pre-qualification successful', 201);
    } catch (error) {
      next(error);
    }
  }

  async saveHospitalDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await registrationService.saveHospitalDetails(req.body);
      sendSuccess(res, result, 'Hospital details saved');
    } catch (error) {
      next(error);
    }
  }

  async saveAdminAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await registrationService.saveAdminAccount(req.body);
      sendSuccess(res, result, 'Admin account saved');
    } catch (error) {
      next(error);
    }
  }

  async savePlanSelection(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await registrationService.savePlanSelection(req.body);
      sendSuccess(res, result, 'Plan selected');
    } catch (error) {
      next(error);
    }
  }

  async completeRegistration(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await registrationService.completeRegistration(req.body);
      sendSuccess(res, result, 'Registration completed. Please verify your account.');
    } catch (error) {
      next(error);
    }
  }

  async verifyCode(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await registrationService.verifyCode(req.body);
      sendSuccess(res, result, 'Verification successful');
    } catch (error) {
      next(error);
    }
  }

  async sendVerificationCode(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await registrationService.sendVerificationCode(req.body);
      sendSuccess(res, result, 'Verification code sent');
    } catch (error) {
      next(error);
    }
  }

  async resendCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { registrationId, method } = req.body;
      const result = await registrationService.resendCode(registrationId, method);
      sendSuccess(res, result, 'Verification code sent');
    } catch (error) {
      next(error);
    }
  }

  async checkEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await registrationService.checkEmailAvailability(req.body.email);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async checkPhone(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await registrationService.checkPhoneAvailability(req.body.phone);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await registrationService.getProgress(req.params.registrationId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}
