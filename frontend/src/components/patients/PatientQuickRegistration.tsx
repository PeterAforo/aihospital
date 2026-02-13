import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, User, MapPin, CreditCard, AlertTriangle, Check, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { patientService, CreatePatientRequest, DuplicateCheckResult } from '@/services/patient.service';
import { debounce } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const GHANA_REGIONS = [
  'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern',
  'Greater Accra', 'North East', 'Northern', 'Oti', 'Savannah',
  'Upper East', 'Upper West', 'Volta', 'Western', 'Western North',
];

const patientSchema = z.object({
  title: z.string().optional(),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  otherNames: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  phone: z.string().min(9, 'Phone number is required'),
  phoneSecondary: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  region: z.string().min(1, 'Region is required'),
  ghanaCardNumber: z.string().optional(),
  nhisNumber: z.string().optional(),
  nhisExpiry: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface PatientQuickRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (patient: any, mrn: string) => void;
}

export default function PatientQuickRegistration({ isOpen, onClose, onSuccess }: PatientQuickRegistrationProps) {
  const queryClient = useQueryClient();
  const [showOptional, setShowOptional] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateCheckResult | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      gender: 'MALE',
      region: 'Greater Accra',
    },
  });

  const watchedValues = watch(['firstName', 'lastName', 'dateOfBirth', 'phone', 'ghanaCardNumber']);

  // Debounced duplicate check
  const checkDuplicates = useCallback(
    debounce(async (data: { firstName: string; lastName: string; dateOfBirth: string; phone: string; ghanaCardNumber?: string }) => {
      if (!data.firstName || !data.lastName || !data.phone) return;
      
      setIsCheckingDuplicate(true);
      try {
        const result = await patientService.checkDuplicate({
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth || new Date().toISOString(),
          phone: data.phone,
          ghanaCardNumber: data.ghanaCardNumber,
        });
        
        if (result.verdict !== 'unique') {
          setDuplicateWarning(result);
        } else {
          setDuplicateWarning(null);
        }
      } catch (error) {
        console.error('Duplicate check failed:', error);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 500),
    []
  );

  // Check for duplicates when key fields change
  useEffect(() => {
    const [firstName, lastName, dateOfBirth, phone, ghanaCardNumber] = watchedValues;
    if (firstName && lastName && phone) {
      checkDuplicates({ firstName, lastName, dateOfBirth, phone, ghanaCardNumber });
    }
  }, [watchedValues, checkDuplicates]);

  // Create patient mutation
  const createMutation = useMutation({
    mutationFn: (data: CreatePatientRequest) => patientService.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      reset();
      setDuplicateWarning(null);
      if (onSuccess) {
        onSuccess(response.data.patient, response.data.mrn);
      }
      onClose();
    },
  });

  const onSubmit = async (data: PatientFormData) => {
    const patientData: CreatePatientRequest = {
      title: data.title,
      firstName: data.firstName,
      lastName: data.lastName,
      otherNames: data.otherNames,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      phone: data.phone,
      phoneSecondary: data.phoneSecondary,
      email: data.email || undefined,
      address: data.address,
      city: data.city,
      region: data.region,
      ghanaCardNumber: data.ghanaCardNumber,
      registrationSource: 'walk-in',
      ...(data.nhisNumber && {
        nhisInfo: {
          nhisNumber: data.nhisNumber,
          expiryDate: data.nhisExpiry,
        },
      }),
    };

    createMutation.mutate(patientData);
  };

  // Auto-format phone number
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'phone' | 'phoneSecondary') => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 10) value = value.slice(0, 10);
    setValue(field, value);
  };

  // Auto-capitalize names
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'firstName' | 'lastName' | 'otherNames') => {
    const value = e.target.value
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    setValue(field, value);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
            <div>
              <h2 className="text-xl font-semibold text-white">Quick Patient Registration</h2>
              <p className="text-blue-100 text-sm">Register a new walk-in patient</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Duplicate Warning */}
          {duplicateWarning && (
            <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800">Potential Duplicate Found</p>
                  <p className="text-sm text-amber-700 mt-1">{duplicateWarning.message}</p>
                  {duplicateWarning.potentialDuplicates.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {duplicateWarning.potentialDuplicates.slice(0, 2).map((dup) => (
                        <div key={dup.patientId} className="flex items-center gap-3 p-2 bg-white rounded border">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{dup.firstName} {dup.lastName}</p>
                            <p className="text-xs text-gray-500">MRN: {dup.mrn} • {dup.phone}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                            {dup.score}% match
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Personal Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-700 font-medium">
                <User className="w-4 h-4" />
                Personal Details
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Select onValueChange={(v: string) => setValue('title', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Title" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mr.">Mr.</SelectItem>
                      <SelectItem value="Mrs.">Mrs.</SelectItem>
                      <SelectItem value="Ms.">Ms.</SelectItem>
                      <SelectItem value="Dr.">Dr.</SelectItem>
                      <SelectItem value="Prof.">Prof.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-1">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    {...register('firstName')}
                    onChange={(e) => handleNameChange(e, 'firstName')}
                    placeholder="First name"
                    className={errors.firstName ? 'border-red-500' : ''}
                  />
                  {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
                </div>

                <div className="col-span-1">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    {...register('lastName')}
                    onChange={(e) => handleNameChange(e, 'lastName')}
                    placeholder="Last name"
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
                </div>

                <div>
                  <Label htmlFor="otherNames">Other Names</Label>
                  <Input
                    {...register('otherNames')}
                    onChange={(e) => handleNameChange(e, 'otherNames')}
                    placeholder="Other names"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    type="date"
                    {...register('dateOfBirth')}
                    max={new Date().toISOString().split('T')[0]}
                    className={errors.dateOfBirth ? 'border-red-500' : ''}
                  />
                  {errors.dateOfBirth && <p className="text-xs text-red-500 mt-1">{errors.dateOfBirth.message}</p>}
                </div>

                <div>
                  <Label htmlFor="gender">Gender *</Label>
                  <Select defaultValue="MALE" onValueChange={(v: string) => setValue('gender', v as 'MALE' | 'FEMALE' | 'OTHER')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    {...register('phone')}
                    onChange={(e) => handlePhoneChange(e, 'phone')}
                    placeholder="0XX XXX XXXX"
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-gray-700 font-medium">
                <MapPin className="w-4 h-4" />
                Address
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    {...register('address')}
                    placeholder="House number, street name, area"
                    className={errors.address ? 'border-red-500' : ''}
                  />
                  {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    {...register('city')}
                    placeholder="City or town"
                    className={errors.city ? 'border-red-500' : ''}
                  />
                  {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
                </div>

                <div>
                  <Label htmlFor="region">Region *</Label>
                  <Select defaultValue="Greater Accra" onValueChange={(v: string) => setValue('region', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GHANA_REGIONS.map((region) => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Optional Fields Toggle */}
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="mt-6 flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showOptional ? 'Hide' : 'Show'} Optional Fields (Ghana Card, NHIS, Email)
            </button>

            {/* Optional Fields */}
            <AnimatePresence>
              {showOptional && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-gray-700 font-medium">
                      <CreditCard className="w-4 h-4" />
                      Identifiers & Contact
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ghanaCardNumber">Ghana Card Number</Label>
                        <Input
                          {...register('ghanaCardNumber')}
                          placeholder="GHA-XXXXXXXXX-X"
                        />
                      </div>

                      <div>
                        <Label htmlFor="phoneSecondary">Secondary Phone</Label>
                        <Input
                          {...register('phoneSecondary')}
                          onChange={(e) => handlePhoneChange(e, 'phoneSecondary')}
                          placeholder="0XX XXX XXXX"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="nhisNumber">NHIS Number</Label>
                        <Input
                          {...register('nhisNumber')}
                          placeholder="NHIS membership number"
                        />
                      </div>

                      <div>
                        <Label htmlFor="nhisExpiry">NHIS Expiry Date</Label>
                        <Input
                          type="date"
                          {...register('nhisExpiry')}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        type="email"
                        {...register('email')}
                        placeholder="patient@example.com"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {isCheckingDuplicate && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking for duplicates...
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting || createMutation.isPending}
              >
                {(isSubmitting || createMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Register Patient
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {createMutation.isError && (
            <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {(createMutation.error as any)?.response?.data?.message || 'Failed to register patient. Please try again.'}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
