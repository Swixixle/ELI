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
  ArrowRight,
  Clock,
  Gavel
} from "lucide-react";
import { ProceduralEquation } from "@/components/cases/ProceduralEquation";

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
                    This constraint ensures the system does not pretend to know what cannot be known.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Glossary Section */}
        <section id="glossary" className="mb-16">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-3">
            <FileCheck className="w-6 h-6 text-primary" />
            Governance Terms Explained
          </h2>
          
          <div className="space-y-6">
            {/* Outcome-Blindness */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h3 className="font-display font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-600" />
                Outcome-Blindness Rule
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full ml-2">internal: Parrot Box</span>
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-foreground mb-1">What It Is</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    A governance constraint that prevents the system from using knowledge of outcomes to evaluate decisions that were made before those outcomes occurred. This is the difference between "what should have been done" (hindsight) and "what was knowable at the time" (decision-time analysis).
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground mb-1">Why It Exists</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    In governance, litigation, and audits, using hindsight to judge past decisions is unfair and inadmissible. A decision-maker cannot be blamed for not knowing what was unknowable. This system enforces that boundary automatically.
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-destructive mb-2 flex items-center gap-2">
                      <Ban className="w-4 h-4" />
                      Not Admissible
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• "Why did the project fail?"</li>
                      <li>• "What went wrong with the launch?"</li>
                      <li>• "Why did we miss the target?"</li>
                      <li>• "Should they have known this would happen?"</li>
                    </ul>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Admissible
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• "Were standard procedures followed?"</li>
                      <li>• "What information was available at the time?"</li>
                      <li>• "Were there documented constraints?"</li>
                      <li>• "Was the escalation pathway used?"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Decision-Time Boundary */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h3 className="font-display font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Decision-Time Boundary
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                The specific moment or period when a decision was made. Analysis is restricted to information, constraints, and options that existed at that boundary—not what became known later.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-400 p-3 rounded-r-md">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Key principle:</strong> "What was knowable then?" not "What do we know now?"
                </p>
              </div>
            </div>

            {/* Category Error */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h3 className="font-display font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                <Gavel className="w-5 h-5 text-purple-600" />
                Category Error
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                A question that requires a type of judgment outside this system's scope. Moral judgments, legal liability, and normative assessments require human expertise (counsel, ethics boards, etc.) rather than governance analytics.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Example:</strong> "Was this negligent?" → Requires legal counsel, not governance AI.
              </p>
            </div>

            {/* Sealed Parameter */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h3 className="font-display font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-600" />
                Sealed Parameter
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                When the system performs calculations, proprietary decision factors are marked as <code className="bg-muted px-1 py-0.5 rounded text-xs">[SEALED]</code>. The arithmetic is shown and verifiable, but the specific internal values are protected for IP safety.
              </p>
              <p className="text-sm text-muted-foreground">
                You can verify the math is correct without seeing the confidential inputs.
              </p>
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

        {/* Procedural Equation */}
        <section className="mb-16">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-3">
            <Scale className="w-6 h-6 text-primary" />
            The Procedural Equation
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Before any case can be evaluated, it must satisfy the minimum structural basis for procedural review.
            This equation determines <strong>jurisdiction</strong> — not judgment.
          </p>
          <ProceduralEquation satisfied={0} />
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
