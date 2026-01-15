import { AppLayout } from "@/components/layout/AppLayout";
import { 
  Shield, 
  Scale, 
  FileCheck, 
  Calculator, 
  Ban, 
  Eye, 
  Database, 
  Lock, 
  CheckCircle,
  AlertTriangle,
  ArrowRight
} from "lucide-react";

export default function About() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-8 pb-16">
        
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Shield className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground tracking-tight mb-4">
            What This System Is
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A governance-grade assistant designed to provide verifiable, outcome-blind answers 
            grounded strictly in authoritative documentation and public data.
          </p>
        </div>

        {/* Core Identity */}
        <section className="mb-16">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-3">
            <Scale className="w-6 h-6 text-primary" />
            Core Identity
          </h2>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <p className="text-foreground leading-relaxed mb-4">
              This is not a general-purpose chatbot. It is an <strong>epistemic governance engine</strong> — 
              a system that knows what it is permitted to say and, more importantly, what it is <em>not</em> permitted to say.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Every answer produced by this system is constrained by admissibility rules. 
              It does not guess, speculate, or invent. If the evidence is insufficient, it refuses to answer.
            </p>
          </div>
        </section>

        {/* How It Works - Three Pillars */}
        <section className="mb-16">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-3">
            <FileCheck className="w-6 h-6 text-primary" />
            How It Works
          </h2>
          
          <div className="grid gap-6">
            {/* Pillar 1: Citation Enforcement */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center shrink-0">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                    1. Citation Enforcement
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Every material factual claim must cite either:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-500 rounded-full" />
                      <span><strong>Private Canon:</strong> Internal documents with version, section, and date</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span><strong>Public Source:</strong> Verified datasets, guidelines, or government pages</span>
                    </li>
                  </ul>
                  <div className="mt-4 p-3 bg-muted/50 rounded-md text-sm font-mono text-muted-foreground">
                    If no citation exists → <span className="text-destructive">"Not in canon / Not supported by sources."</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pillar 2: Outcome Blindness */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center shrink-0">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                    2. Outcome Blindness
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    The system enforces <strong>temporal admissibility boundaries</strong>. 
                    It cannot use knowledge of what happened <em>after</em> a decision to judge what 
                    "should have been known" at the time of that decision.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-purple-800 bg-purple-50 p-3 rounded-md">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Hindsight is inadmissible evidence.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pillar 3: Silence as Valid Output */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 text-red-700 rounded-lg flex items-center justify-center shrink-0">
                  <Ban className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                    3. Refusal Is a Valid Answer
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    The system is allowed — and expected — to refuse when:
                  </p>
                  <ul className="space-y-2 text-sm mb-4">
                    <li className="flex items-center gap-2">
                      <Ban className="w-4 h-4 text-destructive" />
                      <span>The question requires knowledge outside the canon</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Ban className="w-4 h-4 text-destructive" />
                      <span>The answer would rely on outcome knowledge (hindsight)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Ban className="w-4 h-4 text-destructive" />
                      <span>Epistemic entitlement cannot be established</span>
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground italic">
                    This constraint is called the "Parrot Box" — the system does not pretend to know what cannot be known.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Verifiable Computation */}
        <section className="mb-16">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-3">
            <Calculator className="w-6 h-6 text-primary" />
            Verifiable Computation
          </h2>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <p className="text-foreground leading-relaxed mb-4">
              When the system produces a numeric output, it must show its work:
            </p>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-muted/30 p-4 rounded-lg text-center">
                <Database className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="font-semibold text-sm">Inputs</div>
                <div className="text-xs text-muted-foreground">With source references</div>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg text-center">
                <ArrowRight className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="font-semibold text-sm">Arithmetic Steps</div>
                <div className="text-xs text-muted-foreground">Line by line</div>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg text-center">
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="font-semibold text-sm">Final Result</div>
                <div className="text-xs text-muted-foreground">With sensitivity note</div>
              </div>
            </div>
            
            <div className="border-l-4 border-amber-400 bg-amber-50 p-4 rounded-r-lg">
              <div className="flex items-center gap-2 text-amber-800 font-semibold mb-2">
                <Lock className="w-4 h-4" />
                IP-Safe Abstraction
              </div>
              <p className="text-sm text-amber-900/80">
                When internal logic influences a calculation, it appears as a <code className="bg-amber-200/50 px-1 rounded">[SEALED PARAMETER]</code>. 
                The system proves the arithmetic is correct without revealing proprietary decision mechanics.
              </p>
            </div>
          </div>
        </section>

        {/* Operating Modes */}
        <section className="mb-16">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            Operating Modes
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center mb-4">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">Advisor Mode</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Neutral, governance-first analysis. Heavy on citations. 
                No sales language. Refuses to generate positioning statements.
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center mb-4">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">Sales Mode</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Benefit-led, concise, objection handling. 
                Still strictly bounded by canon — cannot invent claims beyond what is documented.
              </p>
            </div>
          </div>
        </section>

        {/* What This Is NOT */}
        <section className="mb-16">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-3">
            <Ban className="w-6 h-6 text-destructive" />
            What This Is NOT
          </h2>
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Ban className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <span className="text-foreground">Not a general-purpose AI that will answer any question</span>
              </li>
              <li className="flex items-start gap-3">
                <Ban className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <span className="text-foreground">Not a system that invents numbers, projections, or claims</span>
              </li>
              <li className="flex items-start gap-3">
                <Ban className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <span className="text-foreground">Not a tool that uses hindsight to justify past decisions</span>
              </li>
              <li className="flex items-start gap-3">
                <Ban className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <span className="text-foreground">Not a black box — every output is auditable and reproducible</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Footer CTA */}
        <div className="text-center pt-8 border-t border-border">
          <p className="text-muted-foreground mb-4">
            This system exists to prevent illegitimate certainty — 
            infrastructure for decisions that must withstand scrutiny.
          </p>
          <a 
            href="/" 
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg"
          >
            <Shield className="w-4 h-4" />
            Return to Advisor
          </a>
        </div>

      </div>
    </AppLayout>
  );
}
