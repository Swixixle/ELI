import { AppLayout } from "@/components/layout/AppLayout";
import { 
  TrendingUp, 
  Shield, 
  Calculator, 
  AlertTriangle,
  CheckCircle,
  Info,
  Lock,
  Eye
} from "lucide-react";
import { Badge } from "@/components/shared/Badge";

export default function ValueImaging() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-8 pb-16">
        
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <TrendingUp className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight mb-3">
            Value Imaging (CFO)
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Models the governance value surface revealed by procedural imaging. 
            Conservative, audit-safe, non-causal.
          </p>
        </div>

        <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 text-center mb-8">
          <p className="text-sm text-muted-foreground">
            This model explains what the imaging scan is worth — not what decisions should be made. 
            All value is attributed to procedural visibility, not outcome improvement.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Value Model Structure
          </h2>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-start gap-4 pb-4 border-b border-border">
                <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">1</div>
                <div>
                  <h3 className="font-semibold text-foreground">Gross Risk Surface</h3>
                  <p className="text-sm text-muted-foreground">Total procedural uncertainty exposure before imaging. This is measurement, not intervention.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 pb-4 border-b border-border">
                <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">2</div>
                <div>
                  <h3 className="font-semibold text-foreground">Likely Realized Value</h3>
                  <p className="text-sm text-muted-foreground">Uncertainty made visible through imaging scans. Value = visibility, not outcomes changed.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 pb-4 border-b border-border">
                <div className="w-8 h-8 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">3</div>
                <div>
                  <h3 className="font-semibold text-foreground">Credibility Caps</h3>
                  <p className="text-sm text-muted-foreground">Mandatory governance protection. Caps limit bookable value to defensible ranges.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 pb-4 border-b border-border">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">4</div>
                <div>
                  <h3 className="font-semibold text-foreground">CFO-Recognized Benefit</h3>
                  <p className="text-sm text-muted-foreground">The conservative, audit-safe value that can be attributed to imaging.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">5</div>
                <div>
                  <h3 className="font-semibold text-foreground">Net / Decision Logic</h3>
                  <p className="text-sm text-muted-foreground">Break-even analysis and pricing optionality. Pilot pricing remains below break-even.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Credibility Caps (Imaging-Adjusted)
          </h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Cap</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-foreground">Range</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">Escalation Avoidance</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Opacity resolved before authority escalation</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="secondary" className="font-mono">15–20%</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    Imaging produces audit-verifiable procedural checkpoints
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">Duration Savings</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Ambiguity window reduction</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="secondary" className="font-mono">10–15%</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    Duration reduction is traceable to imaging events
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Procedural Resolution Yield (PRY)
          </h2>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="bg-muted/50 rounded-lg p-4 mb-4 font-mono text-sm text-center">
              PRY = (Adjusted Avoided + Adjusted Duration) / Gross Risk Surface
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              PRY is <strong>not ROI</strong>. It is an imaging yield ratio that expresses what fraction of gross procedural uncertainty becomes visible through imaging.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-red-700 dark:text-red-300">&lt; 15%</div>
                <div className="text-xs text-red-600 dark:text-red-400">Low yield</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-amber-700 dark:text-amber-300">15–25%</div>
                <div className="text-xs text-amber-600 dark:text-amber-400">Moderate</div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">25–35%</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">Strong</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-purple-700 dark:text-purple-300">&gt; 35%</div>
                <div className="text-xs text-purple-600 dark:text-purple-400">Review for bias</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center italic">
              For executive interpretation only. Not for pricing or contractual claims.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Governance Constraints
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5">
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                What This Model Does
              </h3>
              <ul className="space-y-2 text-sm text-emerald-700 dark:text-emerald-300">
                <li>• Attributes value to procedural visibility</li>
                <li>• Maintains credibility caps</li>
                <li>• Preserves break-even anchoring</li>
                <li>• Uses imaging terminology throughout</li>
              </ul>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5">
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                What This Model Does NOT Do
              </h3>
              <ul className="space-y-2 text-sm text-red-700 dark:text-red-300">
                <li>• Claim prevented errors or outcomes</li>
                <li>• Make causal attributions</li>
                <li>• Eliminate credibility caps</li>
                <li>• Promise guaranteed returns</li>
              </ul>
            </div>
          </div>
        </section>

        <div className="bg-muted/30 border border-border rounded-xl p-6 text-center">
          <Info className="w-6 h-6 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            This is a <strong>secondary imaging view</strong>. It explains what the procedural imaging scan is worth — 
            not what decisions should be made. The core system function remains procedural admissibility determination.
          </p>
        </div>

      </div>
    </AppLayout>
  );
}
