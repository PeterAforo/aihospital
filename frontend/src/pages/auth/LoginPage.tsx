import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Mail, Lock, Loader2 } from "lucide-react";
import { authService } from "@/services/auth.service";
import { setCredentials } from "@/store/slices/authSlice";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    console.log("Login form submitted with:", data);
    setLoading(true);
    try {
      console.log("Calling authService.login...");
      const response = await authService.login(data);
      console.log("Login response:", response);
      console.log("Response data:", response.data);
      console.log("Response data.data:", response.data?.data);
      
      if (response.data?.data) {
        dispatch(setCredentials(response.data.data));
        toast({
          title: "Welcome back!",
          description: "Login successful",
          variant: "default",
        });
        navigate("/dashboard");
      } else {
        console.error("Unexpected response structure:", response);
        toast({
          title: "Login failed",
          description: "Unexpected response from server",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Login error:", error);
      console.error("Error response:", error.response);
      toast({
        title: "Login failed",
        description: error.response?.data?.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1f2937", marginBottom: "0.5rem" }}>
          Welcome back
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          Enter your credentials to access your account
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.5rem" }}>
            Email
          </label>
          <div style={{ position: "relative" }}>
            <Mail style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: "#9ca3af", pointerEvents: "none" }} />
            <input
              type="email"
              placeholder="name@example.com"
              {...register("email")}
              style={inputStyle}
            />
          </div>
          {errors.email && (
            <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.email.message}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.5rem" }}>
            Password
          </label>
          <div style={{ position: "relative" }}>
            <Lock style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: "#9ca3af", pointerEvents: "none" }} />
            <input
              type="password"
              placeholder="••••••••"
              {...register("password")}
              style={inputStyle}
            />
          </div>
          {errors.password && (
            <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.25rem" }}>{errors.password.message}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
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
            }}
          >
            {loading ? (
              <>
                <Loader2 style={{ width: "18px", height: "18px", animation: "spin 1s linear infinite" }} />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </motion.div>
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ flex: 1, height: "1px", backgroundColor: "#e5e7eb" }} />
        <span style={{ fontSize: "0.75rem", color: "#9ca3af", textTransform: "uppercase" }}>or</span>
        <div style={{ flex: 1, height: "1px", backgroundColor: "#e5e7eb" }} />
      </div>

      <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#6b7280" }}>
        Don't have an account?{" "}
        <Link to="/register" style={{ color: "#2563eb", fontWeight: 500, textDecoration: "none" }}>
          Create account
        </Link>
      </p>
    </div>
  );
}
