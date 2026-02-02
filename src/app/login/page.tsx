'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GrainGradient } from '@paper-design/shaders-react';
import { login, signup } from './actions';
import { useRouter } from 'next/navigation';

// --- Types ---
type OnboardingStep = 'identity' | 'purpose' | 'handover';

interface FormData {
  email: string;
  useCase: string;
  callVolume: string;
  teamSize: string;
  origin: string;
}

// --- Components ---

const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.4, delay, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);

export default function LoginPage() {
  const [step, setStep] = useState<OnboardingStep>('identity');
  const [formData, setFormData] = useState<FormData>({
    email: '',
    useCase: '',
    callVolume: '',
    teamSize: '',
    origin: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, we would authenticate here.
    // For this prototype, we just move to the next step.
    setStep('purpose');
  };

  const handlePurposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('handover');
    
    // Simulate AI configuration delay
    setTimeout(() => {
        router.push('/assistants');
    }, 2500);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans">
      {/* --- Left Panel: The Task (35% - 40%) --- */}
      <div className="w-full lg:w-[40%] h-full flex flex-col justify-center px-8 sm:px-12 lg:px-20 relative z-10 bg-background/95 backdrop-blur-sm lg:bg-background">
        
        {/* Logo / Header */}
        <div className="absolute top-8 left-8 sm:left-12 lg:left-20">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#facc15] rounded-sm" />
            <span className="font-semibold tracking-tight text-lg">Monade</span>
          </div>
        </div>

        <div className="max-w-md w-full mx-auto">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: IDENTITY */}
            {step === 'identity' && (
              <motion.div
                key="identity"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.5 }}
              >
                <FadeIn>
                  <h1 className="text-3xl font-medium tracking-tight mb-2 text-foreground">
                    Welcome to Monade.
                  </h1>
                  <p className="text-muted-foreground mb-8 text-sm">
                    Let's get to work.
                  </p>
                </FadeIn>

                <form className="space-y-4" onSubmit={handleIdentitySubmit}>
                  <FadeIn delay={0.1}>
                    <div className="space-y-1">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</label>
                      <input 
                        type="email" 
                        required 
                        className="w-full px-0 py-2 bg-transparent border-b border-border focus:border-[#facc15] focus:ring-0 transition-colors outline-none rounded-none"
                        placeholder="name@company.com"
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </FadeIn>
                  
                  <FadeIn delay={0.2}>
                    <div className="space-y-1">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password</label>
                      <input 
                        type="password" 
                        required 
                        className="w-full px-0 py-2 bg-transparent border-b border-border focus:border-[#facc15] focus:ring-0 transition-colors outline-none rounded-none"
                        placeholder="••••••••"
                      />
                    </div>
                  </FadeIn>

                  <FadeIn delay={0.3}>
                    <button 
                      type="submit"
                      className="mt-8 w-full bg-foreground text-background hover:bg-foreground/90 h-10 rounded-[4px] font-medium text-sm transition-all"
                    >
                      Continue
                    </button>
                    <div className="mt-4 flex gap-4 text-xs text-muted-foreground justify-center">
                        <button type="button" className="hover:text-foreground transition-colors">Forgot password?</button>
                        <span>|</span>
                        <button type="button" className="hover:text-foreground transition-colors">SSO Login</button>
                    </div>
                  </FadeIn>
                </form>
              </motion.div>
            )}

            {/* STEP 2: PURPOSE */}
            {step === 'purpose' && (
              <motion.div
                key="purpose"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.5 }}
              >
                <FadeIn>
                  <h1 className="text-2xl font-medium tracking-tight mb-2 text-foreground">
                    Help us tune your engine.
                  </h1>
                  <p className="text-muted-foreground mb-8 text-sm">
                    We'll pre-configure your assistant based on your needs.
                  </p>
                </FadeIn>

                <form className="space-y-6" onSubmit={handlePurposeSubmit}>
                  {/* Use Case */}
                  <FadeIn delay={0.1}>
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-3">Primary Use Case</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Inbound Support', 'Outbound Sales', 'Data Collection', 'Internal Routing'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setFormData({...formData, useCase: opt})}
                          className={`text-left px-3 py-2 rounded-[4px] text-sm border transition-all ${
                            formData.useCase === opt 
                              ? 'border-[#facc15] bg-[#facc15]/10 text-foreground' 
                              : 'border-border text-muted-foreground hover:border-foreground/30'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </FadeIn>

                  {/* Volume */}
                  <FadeIn delay={0.2}>
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-3">Monthly Volume</label>
                    <div className="flex gap-3">
                      {['< 1k', '1k - 10k', '10k+'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setFormData({...formData, callVolume: opt})}
                          className={`flex-1 px-3 py-2 rounded-[4px] text-sm border transition-all ${
                            formData.callVolume === opt 
                              ? 'border-[#facc15] bg-[#facc15]/10 text-foreground' 
                              : 'border-border text-muted-foreground hover:border-foreground/30'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </FadeIn>
                  
                  {/* Team Size */}
                   <FadeIn delay={0.3}>
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-3">Team Size</label>
                    <div className="flex gap-3">
                      {['Solo', 'Startup (2-10)', 'Enterprise'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setFormData({...formData, teamSize: opt})}
                          className={`flex-1 px-3 py-2 rounded-[4px] text-sm border transition-all ${
                            formData.teamSize === opt 
                              ? 'border-[#facc15] bg-[#facc15]/10 text-foreground' 
                              : 'border-border text-muted-foreground hover:border-foreground/30'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </FadeIn>

                  <FadeIn delay={0.4}>
                    <button 
                      type="submit"
                      className="mt-6 w-full bg-foreground text-background hover:bg-foreground/90 h-10 rounded-[4px] font-medium text-sm transition-all"
                    >
                      Initialize Workspace
                    </button>
                  </FadeIn>
                </form>
              </motion.div>
            )}

            {/* STEP 3: HANDOVER */}
            {step === 'handover' && (
              <motion.div
                key="handover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center text-center"
              >
                <div className="w-12 h-12 border-2 border-border border-t-[#facc15] rounded-full animate-spin mb-6" />
                <h2 className="text-xl font-medium mb-2">Configuring Workspace...</h2>
                <p className="text-sm text-muted-foreground">
                  Creating {formData.useCase || 'General'} Assistant<br/>
                  Optimizing for {formData.callVolume || 'Standard'} throughput...
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
        
        {/* Footer */}
        <div className="absolute bottom-8 left-8 sm:left-12 lg:left-20 text-xs text-muted-foreground">
          © 2026 Monade Inc.
        </div>
      </div>

      {/* --- Right Panel: The Emotion (60% - 65%) --- */}
      <div className="hidden lg:block lg:w-[60%] h-full relative overflow-hidden bg-[#0e0d16]">
        
        {/* Generative Shader */}
        <div className="absolute inset-0 w-full h-full opacity-90">
             <GrainGradient
              colors={["#facc15", "#a49c74", "#568b50"]}
              colorBack="#0e0d16"
              softness={0}
              intensity={0.15}
              noise={0.5}
              shape="blob"
              speed={0.8}
              scale={1.3}
            />
        </div>

        {/* Testimonial Overlay */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-12 left-12 max-w-lg z-10"
        >
          <div className="bg-black/40 backdrop-blur-md p-6 rounded-[4px] border border-white/10">
            <p className="text-lg text-white/90 font-light leading-relaxed mb-4">
              "We replaced our entire tier-1 support with Monade. It doesn't just answer; it understands."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
                TF
              </div>
              <div>
                <p className="text-sm font-medium text-white">Director of CX</p>
                <p className="text-xs text-white/50">TechFin Corp</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}