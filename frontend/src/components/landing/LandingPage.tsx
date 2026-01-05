import { ReactNode } from 'react';
import { Sparkles, Bot, Braces, ShieldCheck, Rocket, Clock3, Wand2, FileCode, Cpu, ArrowRight, Play } from 'lucide-react';

type AuthView = 'login' | 'signup' | 'forgot-password' | 'reset-password';

type LandingPageProps = {
  view: AuthView;
  setView: (view: AuthView) => void;
};

const Pill = ({ children }: { children: ReactNode }) => (
  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-medium backdrop-blur-md">
    {children}
  </span>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="card-elevated glass border-white/10 bg-white/5 text-white p-4 rounded-xl">
    <div className="text-sm text-white/70">{label}</div>
    <div className="text-2xl font-semibold mt-1">{value}</div>
  </div>
);

const FeatureCard = ({ icon: Icon, title, description }: { icon: typeof Sparkles; title: string; description: string }) => (
  <div className="card-elevated border-white/10 bg-gradient-to-b from-white/10 to-white/5 text-white rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 shadow-xl shadow-primary/20">
    <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-white" />
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-white/70 text-sm leading-relaxed">{description}</p>
  </div>
);

export function LandingPage({ view, setView }: LandingPageProps) {
  console.log('LandingPage rendered');
  const renderForm = () => {
    return <div className="bg-white rounded-xl p-5 text-slate-900">Static auth form - click buttons to test</div>;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden dark">
      {/* Simplified background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 opacity-50" />

      <div className="relative">
        {/* Navbar */}
        <header className="flex items-center justify-between px-6 lg:px-14 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center backdrop-blur-xl">
              <img src="/logo.svg" alt="Intelekt" className="w-8 h-8" />
            </div>
            <div>
              <div className="text-sm text-white/70 uppercase tracking-[0.2em]">Intelekt</div>
              <div className="text-lg font-semibold">AI Web App Builder</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Pill>Claude 3.5 Sonnet</Pill>
            <Pill>Grok Beta</Pill>
            <Pill>FastAPI · React · Tailwind</Pill>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('login')}
              className="px-4 py-2 rounded-lg border border-white/20 text-sm font-medium hover:bg-white/10 transition"
            >
              Sign In
            </button>
            <button
              onClick={() => setView('signup')}
              className="btn-gradient bg-gradient-to-r from-violet-500 to-indigo-500 shadow-lg shadow-indigo-500/30 flex items-center gap-2"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="px-6 lg:px-14 pb-12 pt-6">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-sm text-white/80">
                <Sparkles className="w-4 h-4 text-amber-300" />
                Ship complete web apps in minutes with AI co-builders
              </div>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
                From idea to production-grade web apps — <span className="gradient-text">with one conversation</span>.
              </h1>
              <p className="text-lg text-white/80 leading-relaxed max-w-2xl">
                Intelekt blends Claude and Grok with a modern React + FastAPI stack to design, generate, and preview full-stack applications. Chat your requirements, iterate instantly, and export ready-to-run projects.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setView('signup')}
                  className="btn-gradient bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 shadow-xl shadow-purple-500/30 flex items-center gap-2 text-base px-5 py-3"
                >
                  Start with Claude <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView('signup')}
                  className="px-5 py-3 rounded-lg border border-white/15 bg-white/5 text-white/90 flex items-center gap-2 hover:bg-white/10 transition"
                >
                  Try Grok for variations <Wand2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView('login')}
                  className="px-5 py-3 rounded-lg border border-white/10 bg-white/5 text-white/80 flex items-center gap-2 hover:bg-white/10 transition"
                >
                  Watch build demo <Play className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-4">
                <Stat label="Stacks supported" value="Mojo · Python · JS" />
                <Stat label="Frameworks" value="FastAPI · React · Vite" />
                <Stat label="AI Providers" value="Claude · Grok" />
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative">
                <div className="floating-orb orb-1" />
                <div className="floating-orb orb-2" />
                <div className="floating-orb orb-3" />
                <div className="card-elevated glass border-white/15 bg-white/10 backdrop-blur-2xl p-6 rounded-2xl shadow-2xl shadow-indigo-500/25">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm text-white/70">AI Providers</div>
                        <div className="text-lg font-semibold">Claude · Grok</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-300 text-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FeatureCard icon={Braces} title="Full-stack blueprints" description="Generate APIs, UI, and data models with one prompt." />
                    <FeatureCard icon={Cpu} title="Context aware" description="ChromaDB keeps conversations and code snippets in sync." />
                    <FeatureCard icon={Rocket} title="Export ready" description="Download runnable projects with dependencies tracked." />
                    <FeatureCard icon={ShieldCheck} title="Safe & governed" description="Guardrails, previews, and undo/redo keep control in your hands." />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Highlights */}
        <section className="px-6 lg:px-14 pb-16">
          <div className="grid lg:grid-cols-3 gap-6">
            {[
              { icon: Clock3, title: 'Move from idea to prototype in one sitting', desc: 'Chat your specs, get live previews, fix errors automatically, and iterate without context switching.' },
              { icon: FileCode, title: 'Multi-language, multi-framework', desc: 'Target Mojo, Python, or JavaScript stacks; ship FastAPI backends, React frontends, and more.' },
              { icon: Wand2, title: 'Claude + Grok side-by-side', desc: 'Choose the AI that fits the task; compare, retry, and blend outputs for the best result.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-elevated bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/30 transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{title}</h3>
                <p className="text-white/70 leading-relaxed">{desc} 33333</p>
              </div>
            ))}
          </div>
        </section>

        {/* Auth Hub */}
        <section id="auth" className="px-6 lg:px-14 pb-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="text-sm uppercase tracking-[0.2em] text-white/70">Build with confidence</div>
              <h2 className="text-3xl lg:text-4xl font-bold leading-tight">Sign in to start generating production-ready apps.</h2>
              <p className="text-white/70 text-lg leading-relaxed max-w-xl">
                Secure authentication, team-ready collaboration, version history, dependency insights, and exportable projects — all inside a polished React + FastAPI experience.
              </p>
              <div className="flex flex-wrap gap-3">
                <Pill>Live Preview</Pill>
                <Pill>ChromaDB Memory</Pill>
                <Pill>Undo / Redo</Pill>
                <Pill>Git-style history</Pill>
              </div>
            </div>

            <div className="card-elevated glass border-white/15 bg-white/10 backdrop-blur-2xl p-6 rounded-2xl shadow-2xl shadow-indigo-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-white/70">Access Intelekt</div>
                  <div className="text-xl font-semibold">Sign in or create an account</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setView('login')}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${view === 'login' ? 'border-white bg-white/10' : 'border-white/20 bg-white/5'} transition`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setView('signup')}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${view === 'signup' ? 'border-white bg-white/10' : 'border-white/20 bg-white/5'} transition`}
                  >
                    Sign Up
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 text-slate-900">
                {renderForm()}
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/70">
                <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Email verification</div>
                <div className="flex items-center gap-2"><Bot className="w-4 h-4" /> AI error auto-fix</div>
                <div className="flex items-center gap-2"><Rocket className="w-4 h-4" /> Export to ZIP</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
