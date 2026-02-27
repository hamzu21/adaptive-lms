import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, GraduationCap, Users, ShieldCheck, User } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const roles = [
  { id: "student", label: "Student", icon: GraduationCap, desc: "Learn at your own pace" },
  { id: "teacher", label: "Teacher", icon: Users, desc: "Manage your classroom" },
  { id: "parent", label: "Parent", icon: User, desc: "Track your child's progress" },
  { id: "admin", label: "Admin", icon: ShieldCheck, desc: "System administration" },
];

const Register = () => {
  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: role,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    toast.success("Account created! Please check your email to verify your account.");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
          <div className="flex justify-center mb-6">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <span>AdaptLearn</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-center mb-1">Create Your Account</h1>
          <p className="text-muted-foreground text-center text-sm mb-6">
            Join the adaptive learning experience
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-sm ${
                  role === r.id
                    ? "border-primary bg-secondary text-secondary-foreground"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <r.icon className={`w-5 h-5 ${role === r.id ? "text-primary" : "text-muted-foreground"}`} />
                <span className="font-medium">{r.label}</span>
                <span className="text-xs text-muted-foreground">{r.desc}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
