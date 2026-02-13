import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { User, Mail, Lock, Phone, Loader2 } from "lucide-react";
import { authService } from "@/services/auth.service";
import { useToast } from "@/hooks/use-toast";

const registerSchema = z.object({
  tenantId: z.string().min(1, "Hospital is required"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().regex(/^(\+233|0)[0-9]{9}$/, "Invalid phone format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 12px 12px 44px",
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

const iconStyle: React.CSSProperties = {
  position: "absolute",
  left: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  width: "18px",
  height: "18px",
  color: "#9ca3af",
  pointerEvents: "none",
};

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { tenantId: "ee69b2e7-5a6b-4240-b12e-135a069fa89e" },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      await authService.register({
        tenantId: data.tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });
      toast({ title: "Success", description: "Registration successful! Please login." });
      navigate("/login");
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Registration failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1f2937", marginBottom: "0.5rem" }}>
          Create account
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Enter your details to get started</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <input type="hidden" {...register("tenantId")} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <label style={labelStyle}>First Name</label>
            <div style={{ position: "relative" }}>
              <User style={iconStyle} />
              <input {...register("firstName")} style={inputStyle} />
            </div>
            {errors.firstName && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.firstName.message}</p>}
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <label style={labelStyle}>Last Name</label>
            <div style={{ position: "relative" }}>
              <User style={iconStyle} />
              <input {...register("lastName")} style={inputStyle} />
            </div>
            {errors.lastName && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.lastName.message}</p>}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <label style={labelStyle}>Email</label>
          <div style={{ position: "relative" }}>
            <Mail style={iconStyle} />
            <input type="email" {...register("email")} style={inputStyle} />
          </div>
          {errors.email && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.email.message}</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <label style={labelStyle}>Phone</label>
          <div style={{ position: "relative" }}>
            <Phone style={iconStyle} />
            <input placeholder="+233XXXXXXXXX" {...register("phone")} style={inputStyle} />
          </div>
          {errors.phone && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.phone.message}</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <label style={labelStyle}>Password</label>
          <div style={{ position: "relative" }}>
            <Lock style={iconStyle} />
            <input type="password" {...register("password")} style={inputStyle} />
          </div>
          {errors.password && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.password.message}</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <label style={labelStyle}>Confirm Password</label>
          <div style={{ position: "relative" }}>
            <Lock style={iconStyle} />
            <input type="password" {...register("confirmPassword")} style={inputStyle} />
          </div>
          {errors.confirmPassword && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.confirmPassword.message}</p>}
        </motion.div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: loading ? "#93c5fd" : "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginTop: "0.5rem",
          }}
        >
          {loading ? <><Loader2 style={{ width: "18px", height: "18px", animation: "spin 1s linear infinite" }} /> Creating...</> : "Create Account"}
        </button>
      </form>

      <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#6b7280" }}>
        Already have an account? <Link to="/login" style={{ color: "#2563eb", fontWeight: 500, textDecoration: "none" }}>Sign in</Link>
      </p>
    </div>
  );
}
