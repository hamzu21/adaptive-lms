import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, BarChart3, Users, BookOpen, GraduationCap, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import heroImage from "@/assets/hero-illustration.jpg";

const features = [
  { icon: Brain, title: "AI-Powered Adaptation", desc: "Content difficulty adjusts in real-time based on student performance and learning patterns." },
  { icon: BarChart3, title: "Smart Analytics", desc: "Comprehensive dashboards for teachers, parents, and admins with actionable insights." },
  { icon: GraduationCap, title: "Personalized Paths", desc: "Each student gets a unique learning journey tailored to their strengths and weaknesses." },
  { icon: Users, title: "Multi-Role Access", desc: "Dedicated interfaces for students, teachers, parents, and administrators." },
  { icon: Sparkles, title: "Adaptive Assessments", desc: "Quizzes that adjust difficulty dynamically to challenge and support every learner." },
  { icon: BookOpen, title: "Rich Content Library", desc: "Structured courses, lessons, videos, and practice materials across subjects." },
];

const steps = [
  { num: "01", title: "Sign Up & Choose Role", desc: "Create your account as a student, teacher, parent, or administrator." },
  { num: "02", title: "Personalized Dashboard", desc: "Access your tailored dashboard with relevant tools and insights." },
  { num: "03", title: "Learn & Adapt", desc: "The AI analyzes performance and adjusts content in real-time." },
  { num: "04", title: "Track & Improve", desc: "Monitor progress, get recommendations, and achieve your goals." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 pb-20 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                AI-Powered Adaptive Learning
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                Learn Smarter,{" "}
                <span className="text-gradient">Not Harder</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                An intelligent education platform that adapts to every student's unique learning pace, 
                style, and needs — powered by AI.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link to="/register">Get Started Free <ArrowRight className="w-4 h-4 ml-2" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
              </div>
              <div className="flex items-center gap-6 mt-8 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Free to start</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Multi-role support</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Real-time analytics</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img src={heroImage} alt="AI-Powered Adaptive Learning System" className="w-full" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
              <div className="absolute -top-4 -right-4 w-32 h-32 bg-accent/10 rounded-full blur-2xl" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-14">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Features for Everyone
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-2xl mx-auto">
              Built for students, teachers, parents, and administrators with tailored tools and insights.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="bg-card rounded-xl p-6 border border-border hover:shadow-lg transition-shadow group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Four simple steps to transform your learning experience.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="text-5xl font-extrabold text-primary/15 mb-3">{s.num}</div>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-primary rounded-2xl p-10 md:p-16 text-center text-primary-foreground">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Learning?</h2>
            <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
              Join the AI-powered adaptive learning platform trusted by students, teachers, and parents.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/register">Get Started Now <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 font-bold">
            <BookOpen className="w-5 h-5 text-primary" />
            <span>AdaptLearn</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 AI-Powered Adaptive Learning System. Khwaja Fareed University.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
