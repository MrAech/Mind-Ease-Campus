import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import {
  Brain,
  Heart,
  MessageCircle,
  Shield,
  Users,
  Calendar,
  BookOpen,
  BarChart3,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { useNavigate } from "react-router";
import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Landing() {
  const { isLoading, isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();

  const ensureRoles = useMutation(api.users.ensureInitialRoles);
  React.useEffect(() => {
    if (isAuthenticated) {
      ensureRoles({}).catch(() => {
        // silently ignore - non-blocking role ensure
      });
    }
  }, [isAuthenticated, ensureRoles]);

  const roleRoute =
    user?.role === "admin"
      ? "/admin"
      : user?.role === "counsellor"
        ? "/counsellor"
        : "/dashboard";

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate(roleRoute);
    } else {
      navigate("/auth");
    }
  };

  const features = [
    {
      icon: MessageCircle,
      title: "AI-Guided Support",
      description:
        "24/7 chatbot providing immediate coping strategies and crisis intervention",
    },
    {
      icon: Calendar,
      title: "Confidential Booking",
      description: "Secure appointment system with complete privacy protection",
    },
    {
      icon: BookOpen,
      title: "Resource Library",
      description:
        "Multilingual wellness guides, videos, and educational content",
    },
    {
      icon: Users,
      title: "Peer Support Forum",
      description:
        "Moderated community discussions with anonymous participation",
    },
    {
      icon: BarChart3,
      title: "Mental Health Screening",
      description:
        "PHQ-9, GAD-7, and GHQ assessments with personalized recommendations",
    },
    {
      icon: Shield,
      title: "Privacy First",
      description: "Complete anonymity options and stigma-free environment",
    },
  ];

  const stats = [
    { number: "24/7", label: "Support Available" },
    { number: "100%", label: "Confidential" },
    { number: "Multi", label: "Language Support" },
    { number: "Evidence", label: "Based Tools" },
  ];

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => navigate("/")}
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">MindCare</span>
            </motion.div>

            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-muted-foreground">
                    Welcome, {user?.name || "User"}
                  </span>
                  <Button
                    onClick={() => navigate(roleRoute)}
                    className="w-full sm:w-auto"
                  >
                    {user?.role === "admin"
                      ? "Admin Dashboard"
                      : user?.role === "counsellor"
                        ? "Counsellor Dashboard"
                        : "Dashboard"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={async () => {
                      try {
                        await signOut();
                        navigate("/");
                      } catch (e) {
                        // silent
                      }
                    }}
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/auth")}
                    className="w-full sm:w-auto"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => navigate("/auth")}
                    className="w-full sm:w-auto"
                  >
                    Get Started
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
                Mental Health Support
                <br />
                <span className="text-primary">For Every Student</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                A comprehensive digital platform providing confidential mental
                health resources, AI-guided support, and professional counseling
                for college students.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  className="text-lg px-8 py-6 w-full sm:w-auto"
                >
                  {isAuthenticated ? "Go to Dashboard" : "Start Your Journey"}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6 w-full sm:w-auto"
                  onClick={() =>
                    document
                      .getElementById("features")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Learn More
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-primary mb-2">
                  {stat.number}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Comprehensive Mental Health Support
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Everything you need for mental wellness in one secure,
                confidential platform
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-8">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-muted/50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
                Why Choose MindCare?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Designed specifically for college students in rural and
                semi-urban institutions, addressing unique challenges with
                culturally sensitive, evidence-based solutions.
              </p>

              <div className="space-y-4">
                {[
                  "Complete anonymity and privacy protection",
                  "24/7 AI-powered crisis intervention",
                  "Multilingual support for regional languages",
                  "Evidence-based screening tools (PHQ-9, GAD-7, GHQ)",
                  "Professional counselor network",
                  "Peer support community",
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="flex items-center space-x-3"
                  >
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-background rounded-lg p-6 text-center">
                    <Heart className="w-8 h-8 text-primary mx-auto mb-3" />
                    <div className="text-2xl font-bold">Safe</div>
                    <div className="text-sm text-muted-foreground">
                      Environment
                    </div>
                  </div>
                  <div className="bg-background rounded-lg p-6 text-center">
                    <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
                    <div className="text-2xl font-bold">Private</div>
                    <div className="text-sm text-muted-foreground">
                      & Secure
                    </div>
                  </div>
                  <div className="bg-background rounded-lg p-6 text-center">
                    <Users className="w-8 h-8 text-primary mx-auto mb-3" />
                    <div className="text-2xl font-bold">Community</div>
                    <div className="text-sm text-muted-foreground">Support</div>
                  </div>
                  <div className="bg-background rounded-lg p-6 text-center">
                    <Brain className="w-8 h-8 text-primary mx-auto mb-3" />
                    <div className="text-2xl font-bold">AI</div>
                    <div className="text-sm text-muted-foreground">Powered</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
              Ready to Start Your Mental Health Journey?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of students who have found support, community, and
              healing through MindCare.
            </p>
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="text-lg px-8 py-6 w-full sm:w-auto"
            >
              {isAuthenticated ? "Access Dashboard" : "Get Started Today"}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold tracking-tight">
                  MindCare
                </span>
              </div>
              <p className="text-muted-foreground mb-4">
                Empowering college students with comprehensive, confidential
                mental health support through technology and human connection.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>Care Helpline: 1800 1212 88800</div>
                <div>Emergency: 911</div>
                <div>Campus Counseling</div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>Mental Health Screening</div>
                <div>Wellness Library</div>
                <div>Peer Support</div>
              </div>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>
              &copy; 2024 MindCare. Built with care for student mental health.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
