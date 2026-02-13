import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, Check, AlertTriangle, User, Phone, MapPin, CreditCard, Heart, Shield } from "lucide-react";
import { patientService, CreatePatientRequest, DuplicateCheckResult } from "@/services/patient.service";
import { useToast } from "@/hooks/use-toast";

const GHANA_REGIONS = [
  'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern',
  'Greater Accra', 'North East', 'Northern', 'Oti', 'Savannah',
  'Upper East', 'Upper West', 'Volta', 'Western', 'Western North',
];

const patientSchema = z.object({
  title: z.string().optional(),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  otherNames: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  ghanaCardNumber: z.string().optional(),
  phone: z.string().min(9, "Phone number is required"),
  phoneSecondary: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(1, "City is required"),
  region: z.string().min(1, "Region is required"),
  bloodGroup: z.string().optional(),
  maritalStatus: z.string().optional(),
  occupation: z.string().optional(),
  religion: z.string().optional(),
  nhisNumber: z.string().optional(),
  nhisExpiry: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

const steps = [
  { id: 1, title: "Personal Info", icon: User },
  { id: 2, title: "Contact & Address", icon: MapPin },
  { id: 3, title: "Medical & NHIS", icon: Heart },
  { id: 4, title: "Emergency Contact", icon: Phone },
  { id: 5, title: "Review", icon: Check },
];

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  overflow: "hidden",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "0.875rem",
  outline: "none",
  boxSizing: "border-box",
  backgroundColor: "white",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#374151",
  marginBottom: "0.5rem",
};

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 20px",
  backgroundColor: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
};

const outlineButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: "white",
  color: "#374151",
  border: "1px solid #d1d5db",
};

export default function PatientCreatePage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateCheckResult | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: { gender: "MALE", region: "Greater Accra" },
  });

  const formData = watch();
  const firstName = watch('firstName');
  const lastName = watch('lastName');
  const dateOfBirth = watch('dateOfBirth');
  const phone = watch('phone');
  const ghanaCardNumber = watch('ghanaCardNumber');

  // Debounced duplicate check - only run once when user stops typing
  const checkDuplicatesRef = useCallback(
    async (data: { firstName: string; lastName: string; dateOfBirth: string; phone: string; ghanaCardNumber?: string }) => {
      if (!data.firstName || !data.lastName || !data.phone || data.phone.length < 9) return;
      
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
    },
    []
  );

  // Check for duplicates when key fields change - with proper debouncing
  useEffect(() => {
    if (!firstName || !lastName || !phone || phone.length < 9) return;
    
    const timeoutId = setTimeout(() => {
      checkDuplicatesRef({ firstName, lastName, dateOfBirth, phone, ghanaCardNumber });
    }, 800);
    
    return () => clearTimeout(timeoutId);
  }, [firstName, lastName, dateOfBirth, phone, ghanaCardNumber, checkDuplicatesRef]);

  const mutation = useMutation({
    mutationFn: (data: CreatePatientRequest) => patientService.create(data),
    onSuccess: (response: any) => {
      toast({ title: "Success", description: `Patient registered successfully. MRN: ${response.data?.mrn || 'Generated'}` });
      navigate(`/patients/${response.data?.patient?.id || response.data?.id}`);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to create patient", variant: "destructive" });
    },
  });

  const onSubmit = (data: PatientFormData) => {
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
      bloodGroup: data.bloodGroup as any,
      maritalStatus: data.maritalStatus as any,
      occupation: data.occupation,
      religion: data.religion,
      registrationSource: 'walk-in',
      ...(data.nhisNumber && {
        nhisInfo: {
          nhisNumber: data.nhisNumber,
          expiryDate: data.nhisExpiry,
        },
      }),
      ...(data.emergencyContactName && {
        emergencyContact: {
          name: data.emergencyContactName,
          phone: data.emergencyContactPhone || '',
          relationship: data.emergencyContactRelationship || '',
        },
      }),
    };
    mutation.mutate(patientData);
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof PatientFormData)[] = [];
    switch (currentStep) {
      case 0:
        fieldsToValidate = ["firstName", "lastName", "dateOfBirth", "gender"];
        break;
      case 1:
        fieldsToValidate = ["phone", "address", "city", "region"];
        break;
      case 2:
      case 3:
        // Optional steps
        break;
    }
    const isValid = fieldsToValidate.length === 0 || await trigger(fieldsToValidate);
    if (isValid) setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  // Auto-capitalize names
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'firstName' | 'lastName' | 'otherNames') => {
    const value = e.target.value
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    setValue(field, value);
  };

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#1f2937", marginBottom: "0.25rem" }}>Register New Patient</h1>
        <p style={{ color: "#6b7280" }}>Fill in the patient information</p>
      </div>

      {/* Steps Indicator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
        {steps.map((step, index) => (
          <div key={step.id} style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "2px solid",
              borderColor: index <= currentStep ? "#2563eb" : "#d1d5db",
              backgroundColor: index < currentStep ? "#2563eb" : "white",
              color: index < currentStep ? "white" : index === currentStep ? "#2563eb" : "#9ca3af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}>
              {index < currentStep ? <Check style={{ width: "20px", height: "20px" }} /> : step.id}
            </div>
            <span style={{ marginLeft: "0.5rem", fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>{step.title}</span>
            {index < steps.length - 1 && (
              <div style={{ width: "60px", height: "2px", margin: "0 0.75rem", backgroundColor: index < currentStep ? "#2563eb" : "#e5e7eb" }} />
            )}
          </div>
        ))}
      </div>

      {/* Duplicate Warning */}
      {duplicateWarning && (
        <div style={{ padding: "1rem", backgroundColor: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "8px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
            <AlertTriangle style={{ width: "20px", height: "20px", color: "#f59e0b", flexShrink: 0, marginTop: "2px" }} />
            <div>
              <p style={{ fontWeight: 600, color: "#92400e" }}>Potential Duplicate Found</p>
              <p style={{ fontSize: "0.875rem", color: "#a16207", marginTop: "0.25rem" }}>{duplicateWarning.message}</p>
              {duplicateWarning.potentialDuplicates.length > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  {duplicateWarning.potentialDuplicates.slice(0, 2).map((dup) => (
                    <div key={dup.patientId} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", backgroundColor: "white", borderRadius: "4px", marginTop: "0.5rem", border: "1px solid #e5e7eb" }}>
                      <User style={{ width: "16px", height: "16px", color: "#6b7280" }} />
                      <span style={{ fontSize: "0.875rem" }}>{dup.firstName} {dup.lastName}</span>
                      <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>MRN: {dup.mrn}</span>
                      <span style={{ fontSize: "0.75rem", padding: "2px 6px", backgroundColor: "#fef3c7", color: "#92400e", borderRadius: "4px", marginLeft: "auto" }}>{dup.score}% match</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isCheckingDuplicate && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
          <Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} />
          Checking for duplicates...
        </div>
      )}

      <div style={cardStyle}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1f2937" }}>{steps[currentStep].title}</h2>
        </div>
        <div style={{ padding: "1.5rem" }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">
              {/* Step 1: Personal Info */}
              {currentStep === 0 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={labelStyle}>Title</label>
                      <select {...register("title")} style={inputStyle}>
                        <option value="">-</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Dr.">Dr.</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>First Name *</label>
                      <input {...register("firstName")} onChange={(e) => handleNameChange(e, 'firstName')} style={inputStyle} />
                      {errors.firstName && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.firstName.message}</p>}
                    </div>
                    <div>
                      <label style={labelStyle}>Last Name *</label>
                      <input {...register("lastName")} onChange={(e) => handleNameChange(e, 'lastName')} style={inputStyle} />
                      {errors.lastName && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.lastName.message}</p>}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Other Names</label>
                    <input {...register("otherNames")} onChange={(e) => handleNameChange(e, 'otherNames')} style={inputStyle} placeholder="Middle names or aliases" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={labelStyle}>Date of Birth *</label>
                      <input type="date" {...register("dateOfBirth")} max={new Date().toISOString().split('T')[0]} style={inputStyle} />
                      {errors.dateOfBirth && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.dateOfBirth.message}</p>}
                    </div>
                    <div>
                      <label style={labelStyle}>Gender *</label>
                      <select {...register("gender")} style={inputStyle}>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={labelStyle}>Ghana Card Number</label>
                      <input placeholder="GHA-XXXXXXXXX-X" {...register("ghanaCardNumber")} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Marital Status</label>
                      <select {...register("maritalStatus")} style={inputStyle}>
                        <option value="">Select</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={labelStyle}>Occupation</label>
                      <input {...register("occupation")} style={inputStyle} placeholder="e.g. Teacher, Trader" />
                    </div>
                    <div>
                      <label style={labelStyle}>Religion</label>
                      <select {...register("religion")} style={inputStyle}>
                        <option value="">Select</option>
                        <option value="Christianity">Christianity</option>
                        <option value="Islam">Islam</option>
                        <option value="Traditional">Traditional</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Contact & Address */}
              {currentStep === 1 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={labelStyle}>Phone Number *</label>
                      <input placeholder="0XX XXX XXXX" {...register("phone")} style={inputStyle} />
                      {errors.phone && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.phone.message}</p>}
                    </div>
                    <div>
                      <label style={labelStyle}>Secondary Phone</label>
                      <input placeholder="0XX XXX XXXX" {...register("phoneSecondary")} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Email Address</label>
                    <input type="email" {...register("email")} style={inputStyle} placeholder="patient@example.com" />
                  </div>
                  <div>
                    <label style={labelStyle}>Street Address *</label>
                    <input {...register("address")} style={inputStyle} placeholder="House number, street name, area" />
                    {errors.address && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.address.message}</p>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={labelStyle}>City *</label>
                      <input {...register("city")} style={inputStyle} placeholder="City or town" />
                      {errors.city && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.city.message}</p>}
                    </div>
                    <div>
                      <label style={labelStyle}>Region *</label>
                      <select {...register("region")} style={inputStyle}>
                        {GHANA_REGIONS.map((region) => (
                          <option key={region} value={region}>{region}</option>
                        ))}
                      </select>
                      {errors.region && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.region.message}</p>}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Medical & NHIS */}
              {currentStep === 2 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={labelStyle}>Blood Group</label>
                      <select {...register("bloodGroup")} style={inputStyle}>
                        <option value="">Unknown</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ padding: "1rem", backgroundColor: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                      <Shield style={{ width: "20px", height: "20px", color: "#16a34a" }} />
                      <span style={{ fontWeight: 600, color: "#166534" }}>NHIS Information</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label style={labelStyle}>NHIS Number</label>
                        <input {...register("nhisNumber")} style={inputStyle} placeholder="NHIS membership number" />
                      </div>
                      <div>
                        <label style={labelStyle}>Expiry Date</label>
                        <input type="date" {...register("nhisExpiry")} style={inputStyle} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Emergency Contact */}
              {currentStep === 3 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Provide details of someone we can contact in case of emergency.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={labelStyle}>Contact Name</label>
                      <input {...register("emergencyContactName")} style={inputStyle} placeholder="Full name" />
                    </div>
                    <div>
                      <label style={labelStyle}>Relationship</label>
                      <select {...register("emergencyContactRelationship")} style={inputStyle}>
                        <option value="">Select</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Parent">Parent</option>
                        <option value="Child">Child</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Friend">Friend</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Contact Phone</label>
                    <input {...register("emergencyContactPhone")} style={inputStyle} placeholder="0XX XXX XXXX" />
                  </div>
                </motion.div>
              )}

              {/* Step 5: Review */}
              {currentStep === 4 && (
                <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div style={{ backgroundColor: "#f9fafb", borderRadius: "8px", padding: "1.5rem" }}>
                    <h3 style={{ fontWeight: 600, color: "#1f2937", marginBottom: "1rem" }}>Review Patient Information</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.875rem" }}>
                      <div>
                        <p style={{ color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>Full Name</p>
                        <p style={{ fontWeight: 500 }}>{formData.title} {formData.firstName} {formData.otherNames} {formData.lastName}</p>
                      </div>
                      <div>
                        <p style={{ color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>Gender</p>
                        <p style={{ fontWeight: 500 }}>{formData.gender}</p>
                      </div>
                      <div>
                        <p style={{ color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>Date of Birth</p>
                        <p style={{ fontWeight: 500 }}>{formData.dateOfBirth}</p>
                      </div>
                      <div>
                        <p style={{ color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>Phone</p>
                        <p style={{ fontWeight: 500 }}>{formData.phone}</p>
                      </div>
                      <div>
                        <p style={{ color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>Address</p>
                        <p style={{ fontWeight: 500 }}>{formData.address}, {formData.city}, {formData.region}</p>
                      </div>
                      <div>
                        <p style={{ color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>Ghana Card</p>
                        <p style={{ fontWeight: 500 }}>{formData.ghanaCardNumber || "Not provided"}</p>
                      </div>
                      <div>
                        <p style={{ color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>NHIS Number</p>
                        <p style={{ fontWeight: 500 }}>{formData.nhisNumber || "Not provided"}</p>
                      </div>
                      <div>
                        <p style={{ color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>Blood Group</p>
                        <p style={{ fontWeight: 500 }}>{formData.bloodGroup || "Unknown"}</p>
                      </div>
                      {formData.emergencyContactName && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <p style={{ color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>Emergency Contact</p>
                          <p style={{ fontWeight: 500 }}>{formData.emergencyContactName} ({formData.emergencyContactRelationship}) - {formData.emergencyContactPhone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem" }}>
              <button type="button" onClick={prevStep} disabled={currentStep === 0} style={{ ...outlineButtonStyle, opacity: currentStep === 0 ? 0.5 : 1, cursor: currentStep === 0 ? "not-allowed" : "pointer" }}>
                <ChevronLeft style={{ width: "16px", height: "16px" }} /> Previous
              </button>
              {currentStep < steps.length - 1 ? (
                <button type="button" onClick={nextStep} style={buttonStyle}>
                  Next <ChevronRight style={{ width: "16px", height: "16px" }} />
                </button>
              ) : (
                <button type="submit" disabled={mutation.isPending} style={{ ...buttonStyle, opacity: mutation.isPending ? 0.7 : 1 }}>
                  {mutation.isPending ? <><Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} /> Registering...</> : "Register Patient"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
