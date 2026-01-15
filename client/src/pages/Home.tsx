import { AppLayout } from "@/components/layout/AppLayout";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { INITIAL_MESSAGES, Message, SCENARIO_RESPONSES, CANONICAL_INTENTS, QUESTION_BANK } from "@/lib/types";
import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Briefcase, FileText, Settings2, Shield, CalendarClock, Play, HelpCircle, Ban, Calculator, Gavel, FolderOpen, CheckCircle, AlertCircle, AlertTriangle, ArrowRight, CheckSquare, Lock, FileSearch, CircleSlash, Wrench, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/shared/Badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { CaseSelector } from "@/components/cases/CaseSelector";
import { CaseTimeline, DocumentsConsidered } from "@/components/cases/CaseTimeline";
import { DecisionReadinessPanel } from "@/components/cases/DecisionReadiness";
import type { Case } from "@shared/schema";
import type { DecisionReadiness, CasePhase } from "@/lib/types";
import { normalizeQuestion, isMetaQuery, getMetaHelpResponse } from "@/lib/questionNormalizer";

function computeDecisionReadiness(caseData: Case | null, documentCount: number): DecisionReadiness {
  if (!caseData) {
    return {
      decisionTarget: null,
      phase: "intake",
      permitted: false,
      categories: [],
      totalSatisfied: 0,
      totalRequired: 0
    };
  }

  const hasDecisionTarget = !!caseData.decisionTarget;
  const hasDocuments = documentCount > 0;
  const hasMultipleDocuments = documentCount >= 2;

  const temporalCategory = {
    name: "Temporal Verification",
    requirements: [
      { 
        id: "temporal-1", 
        category: "temporal", 
        label: "Decision-time timestamp on evidence", 
        status: hasDocuments ? "satisfied" as const : "missing" as const,
        detail: "Upload documents with dated evidence"
      },
      { 
        id: "temporal-2", 
        category: "temporal", 
        label: "Sequence of events established", 
        status: hasMultipleDocuments ? "satisfied" as const : "missing" as const,
        detail: "Need at least 2 documents to establish sequence"
      }
    ],
    satisfied: (hasDocuments ? 1 : 0) + (hasMultipleDocuments ? 1 : 0),
    total: 2,
    hint: "Need: 2 time verifiers"
  };

  const independentCategory = {
    name: "Independent Verification",
    requirements: [
      { 
        id: "independent-1", 
        category: "independent", 
        label: "Third-party confirmation of claims", 
        status: "missing" as const,
        detail: "Upload corroborating document or interview"
      }
    ],
    satisfied: 0,
    total: 1,
    hint: "Need: 1 usable interview OR 1 independent document"
  };

  const policyCategory = {
    name: "Policy Application",
    requirements: [
      { 
        id: "policy-1", 
        category: "policy", 
        label: "Record showing how policy was applied at the time", 
        status: "missing" as const,
        detail: "Upload policy application record"
      }
    ],
    satisfied: 0,
    total: 1,
    hint: "Need: 1 policy application record"
  };

  const contextualCategory = {
    name: "Contextual Constraints",
    requirements: [
      { 
        id: "context-1", 
        category: "context", 
        label: "Resource / time constraints documented", 
        status: hasDecisionTarget ? "satisfied" as const : "missing" as const,
        detail: "Define decision target to establish context"
      }
    ],
    satisfied: hasDecisionTarget ? 1 : 0,
    total: 1
  };

  const categories = [temporalCategory, independentCategory, policyCategory, contextualCategory];
  const totalSatisfied = categories.reduce((sum, cat) => sum + cat.satisfied, 0);
  const totalRequired = categories.reduce((sum, cat) => sum + cat.total, 0);

  const currentPhase = (caseData.phase as CasePhase) || "intake";
  const permitted = totalSatisfied >= 3 && hasDecisionTarget;

  return {
    decisionTarget: caseData.decisionTarget || null,
    phase: currentPhase,
    permitted,
    categories,
    totalSatisfied,
    totalRequired,
    blockedReason: !hasDecisionTarget 
      ? "No decision target defined" 
      : totalSatisfied < 3 
        ? `Only ${totalSatisfied} of ${totalRequired} requirements met` 
        : undefined,
    nextPhaseUnlocks: !hasDecisionTarget
      ? "Set a decision target to proceed"
      : totalSatisfied < 3
        ? "Satisfy at least 3 requirements to unlock Review phase"
        : undefined
  };
}

const INTENT_ICONS: Record<string, React.ReactNode> = {
  "readiness": <CheckCircle className="w-3.5 h-3.5" />,
  "sufficiency": <FileText className="w-3.5 h-3.5" />,
  "gaps": <AlertCircle className="w-3.5 h-3.5" />,
  "limits": <Ban className="w-3.5 h-3.5" />,
  "risks": <AlertTriangle className="w-3.5 h-3.5" />,
  "next_action": <ArrowRight className="w-3.5 h-3.5" />,
  "closure": <CheckSquare className="w-3.5 h-3.5" />,
  "defensibility": <Shield className="w-3.5 h-3.5" />
};

const QUESTION_BANK_ICONS: Record<string, React.ReactNode> = {
  "Lock": <Lock className="w-4 h-4" />,
  "FileSearch": <FileSearch className="w-4 h-4" />,
  "CircleSlash": <CircleSlash className="w-4 h-4" />,
  "Shield": <Shield className="w-4 h-4" />
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState<"advisor" | "sales">("advisor");
  const [decisionTime, setDecisionTime] = useState<Date | undefined>(undefined);
  const [showDemo, setShowDemo] = useState(true);
  const [showTryPanel, setShowTryPanel] = useState(false);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [showCaseSelector, setShowCaseSelector] = useState(false);
  const [expandedAuditMessages, setExpandedAuditMessages] = useState<Set<string>>(new Set());
  const [documentCount, setDocumentCount] = useState(0);
  const [showDecisionTargetDialog, setShowDecisionTargetDialog] = useState(false);
  const [decisionTargetInput, setDecisionTargetInput] = useState("");
  const [viewMode, setViewMode] = useState<"builder" | "audit">("builder");
  const [showFreeText, setShowFreeText] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeCase) {
      fetch(`/api/cases/${activeCase.id}/documents`)
        .then(res => res.json())
        .then(docs => setDocumentCount(docs.length))
        .catch(() => setDocumentCount(0));
    } else {
      setDocumentCount(0);
    }
  }, [activeCase]);

  const decisionReadiness = computeDecisionReadiness(activeCase, documentCount);

  const handleSetDecisionTarget = async () => {
    if (!activeCase || !decisionTargetInput.trim()) return;
    
    try {
      const response = await fetch(`/api/cases/${activeCase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionTarget: decisionTargetInput.trim() })
      });
      
      if (response.ok) {
        const updated = await response.json();
        setActiveCase(updated);
        setShowDecisionTargetDialog(false);
        setDecisionTargetInput("");
      }
    } catch (error) {
      console.error("Failed to set decision target:", error);
    }
  };

  const toggleAuditExpanded = (messageId: string) => {
    setExpandedAuditMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const runDemo = () => {
    setShowDemo(false);
    setMessages([INITIAL_MESSAGES[0]]);
    setExpandedAuditMessages(new Set());
    setIsTyping(true);
    
    // Scripted Demo Sequence
    const demoSteps = [
      {
        delay: 1500,
        msg: {
          id: "demo-1",
          role: "assistant",
          content: "**What is ELI?**\n\nI am an epistemic governance engine. My purpose is to provide verifiable answers grounded strictly in your Canon and admissible public data.\n\nI do not guess. I do not invent. If the evidence is insufficient, I refuse to answer (Parrot Box).",
          timestamp: Date.now()
        } as Message
      },
      {
        delay: 3500,
        msg: {
          id: "demo-2",
          role: "assistant",
          content: "**How I Prove Claims**\n\nEvery factual claim I make carries a citation badge. Numeric outputs include a verifiable computation proof with sealed parameters.\n\n*Example:*",
          citations: [
             { id: "demo-c1", sourceType: "private_canon", title: "Global Governance Framework", version: "v4.0", date: "2024-01-01" },
             { id: "demo-c2", sourceType: "public_dataset", title: "U.S. Bureau of Labor Statistics", datasetId: "CPI-U", date: "2024-03-01", provenance: { institution: "U.S. Dept of Labor" } }
          ],
          calcProof: {
            inputs: [
              { label: "Base Revenue", value: "$10.0M", sourceRef: "demo-c1" },
              { label: "Growth Factor", value: "[SEALED]", sourceRef: "demo-c1" }
            ],
            steps: [
              { description: "Apply Growth Factor", operation: "$10.0M * [SEALED PARAMETER]", result: "$11.2M" }
            ],
            finalResult: "$11.2M",
            sensitivityNote: "Demonstration of IP-safe arithmetic."
          },
          timestamp: Date.now()
        } as Message
      },
      {
        delay: 6000,
        msg: {
           id: "demo-3",
           role: "assistant",
           content: "**Epistemic Boundaries**\n\nIf you ask me to predict the future or explain outcomes using hindsight (when a past decision-time is set), I will trigger a **Parrot Box Refusal**.\n\n*Try asking:* \"Why did we miss the Q3 target?\" (after setting a past decision date).",
           timestamp: Date.now()
        } as Message
      },
      {
        delay: 8000,
        msg: {
          id: "demo-4",
          role: "assistant",
          content: "I am ready. Ask me anything about financial performance, governance rules, or sales positioning.",
          timestamp: Date.now()
        } as Message
      }
    ];

    let currentDelay = 0;
    demoSteps.forEach(step => {
      currentDelay += step.delay;
      setTimeout(() => {
        setMessages(prev => [...prev, step.msg]);
        if (step === demoSteps[demoSteps.length - 1]) {
          setIsTyping(false);
          setShowTryPanel(true);
        }
      }, currentDelay);
    });
  };

  const triggerScenario = (scenario: string) => {
    setShowTryPanel(false);
    const userQueries: Record<string, string> = {
      "refusal": "Why did we miss the Q3 target?",
      "revenue": "What is the adjusted EBITDA for Q3?",
      "category_error": "Who is at fault for the compliance failure?"
    };
    
    const query = userQueries[scenario] || "Show me a demo";
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      timestamp: Date.now(),
      temporalContext: scenario === "refusal" ? "Decision Time: 2024-06-01" : "Decision Time: Now (Default)"
    };
    
    if (scenario === "refusal") {
      setDecisionTime(new Date("2024-06-01"));
    }
    
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    
    setTimeout(() => {
      const responseData = SCENARIO_RESPONSES[scenario];
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseData?.content || "Processing...",
        citations: responseData?.citations,
        calcProof: responseData?.calcProof,
        ipFlags: responseData?.ipFlags,
        visualSpec: responseData?.visualSpec,
        timestamp: Date.now(),
        temporalContext: userMsg.temporalContext
      };
      setMessages(prev => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 1200);
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    if (showDemo) setShowDemo(false);

    const normalized = normalizeQuestion(inputValue);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: Date.now(),
      temporalContext: decisionTime 
        ? `Decision Time: ${format(decisionTime, "yyyy-MM-dd")}` 
        : "Decision Time: Now (Default)",
      interpretation: normalized.interpretation,
      normalizedQuery: normalized.intent !== "passthrough" ? normalized.normalized : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");

    if (isMetaQuery(normalized)) {
      const helpMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getMetaHelpResponse(),
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, helpMsg]);
      return;
    }

    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: normalized.normalized, mode })
      });
      
      const data = await response.json();
      
      let responseData: Partial<Message> = {
        content: data.content || ""
      };
      
      if (data.citations && data.citations.length > 0) {
        responseData.citations = data.citations.map((c: any, idx: number) => ({
          id: `cite-${idx}`,
          sourceType: c.type === "canon" ? "private_canon" : "public_dataset",
          title: c.source,
          version: c.version,
          section: c.section,
          canonTier: c.canonTier
        }));
      }
      
      if (data.refusalType) {
        responseData.ipFlags = [{
          code: data.refusalType.toUpperCase(),
          message: data.refusalReason,
          type: data.refusalType
        }];
        responseData.content = `### Refusal: ${data.refusalType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}\n\n${data.refusalReason}`;
      }
      
      if (data.calcProof) {
        responseData.calcProof = {
          inputs: data.calcProof.steps?.map((s: string, i: number) => ({
            label: `Step ${i + 1}`,
            value: s,
            sourceRef: ""
          })) || [],
          steps: data.calcProof.steps?.map((s: string) => ({
            description: s,
            operation: s,
            result: ""
          })) || [],
          finalResult: "",
          sensitivityNote: data.calcProof.sealedParams?.length > 0 
            ? `Contains ${data.calcProof.sealedParams.length} sealed parameter(s)` 
            : undefined
        };
      }

      if (data.userSummary) {
        responseData.userSummary = data.userSummary;
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseData.content || "Processing...",
        citations: responseData.citations,
        calcProof: responseData.calcProof,
        ipFlags: responseData.ipFlags,
        timestamp: Date.now(),
        temporalContext: userMsg.temporalContext,
        userSummary: responseData.userSummary
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I encountered an error processing your request. Please try again.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleIntentClick = async (question: string) => {
    if (showDemo) setShowDemo(false);
    
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      timestamp: Date.now(),
      temporalContext: decisionTime 
        ? `Decision Time: ${format(decisionTime, "yyyy-MM-dd")}` 
        : "Decision Time: Now (Default)"
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, mode })
      });
      
      const data = await response.json();
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content || "",
        citations: data.citations?.map((c: any, idx: number) => ({
          id: `cite-${idx}`,
          sourceType: c.type === "canon" ? "private_canon" : "public_dataset",
          title: c.source,
          version: c.version,
          section: c.section,
          canonTier: c.canonTier
        })),
        timestamp: Date.now(),
        temporalContext: userMsg.temporalContext,
        userSummary: data.userSummary
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Intent error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-screen max-w-5xl mx-auto">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between px-8 py-4 border-b bg-background/95 backdrop-blur z-10 sticky top-0">
          <div>
            <h2 className="text-lg font-semibold font-display text-foreground flex items-center gap-2">
              {activeCase ? (
                <>
                  <button 
                    onClick={() => setShowCaseSelector(true)}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                    data-testid="button-change-case"
                  >
                    <FolderOpen className="w-4 h-4" />
                    {activeCase.name}
                  </button>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">Active</span>
                </>
              ) : (
                <span className="text-muted-foreground">No Case Loaded</span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              {!activeCase 
                ? "Select an option below to begin" 
                : mode === "advisor" 
                  ? "Outcome-Blind • Auditable • Canon-Cited" 
                  : "Canon-Bounded • Objection Handling"}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Decision Time Selector */}
             <div className="flex flex-col items-end">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Decision Context</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-xs font-mono border rounded-md transition-colors",
                      decisionTime 
                        ? "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/20 dark:text-amber-100 dark:border-amber-800" 
                        : "bg-background text-muted-foreground border-border hover:text-foreground"
                    )}>
                      <CalendarClock className="w-3 h-3" />
                      {decisionTime ? format(decisionTime, "yyyy-MM-dd") : "Now (Live)"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <div className="p-3 border-b text-xs text-muted-foreground bg-muted/30">
                      <strong>Temporal Lock:</strong> Setting a past date excludes all subsequent knowledge (hindsight).
                    </div>
                    <Calendar
                      mode="single"
                      selected={decisionTime}
                      onSelect={setDecisionTime}
                      initialFocus
                      className="p-2"
                    />
                    <div className="p-2 border-t">
                      <button 
                        onClick={() => setDecisionTime(undefined)}
                        className="w-full text-xs text-muted-foreground hover:text-primary py-1"
                      >
                        Reset to Now (Live)
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
             </div>

             <div className="h-8 w-px bg-border/50 mx-2" />

             <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                <button 
                  onClick={() => setViewMode("builder")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2",
                    viewMode === "builder" ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  data-testid="mode-builder"
                >
                  <Wrench className="w-3 h-3" />
                  Builder
                </button>
                <button 
                  onClick={() => setViewMode("audit")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2",
                    viewMode === "audit" ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  data-testid="mode-audit"
                >
                  <Search className="w-3 h-3" />
                  Audit
                </button>
             </div>
          </div>
        </div>

        {/* Case Selector Modal */}
        {showCaseSelector && (
          <CaseSelector
            open={showCaseSelector}
            onOpenChange={setShowCaseSelector}
            onSelectCase={(c) => {
              setActiveCase(c);
              setShowDemo(false);
              setMessages([]);
              setExpandedAuditMessages(new Set());
            }}
            currentCaseId={activeCase?.id}
          />
        )}

        {/* Decision Target Dialog */}
        {showDecisionTargetDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
              <h3 className="text-lg font-semibold mb-2">Define Decision Target</h3>
              <p className="text-sm text-muted-foreground mb-4">
                What decision is this case trying to support? This should be a specific, answerable question.
              </p>
              <textarea
                value={decisionTargetInput}
                onChange={(e) => setDecisionTargetInput(e.target.value)}
                placeholder="Example: Was disciplinary action against Unit A procedurally permissible?"
                className="w-full p-3 border rounded-lg text-sm resize-none h-24 mb-4"
                data-testid="input-decision-target"
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDecisionTargetDialog(false);
                    setDecisionTargetInput("");
                  }}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetDecisionTarget}
                  disabled={!decisionTargetInput.trim()}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                  data-testid="button-save-decision-target"
                >
                  Set Decision Target
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Decision Readiness & Documentation Panel - Shows when case is active */}
        {activeCase && (
          <div className="px-8 py-4 border-b bg-muted/20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <DecisionReadinessPanel 
                  readiness={decisionReadiness}
                  onSetDecisionTarget={() => setShowDecisionTargetDialog(true)}
                />
              </div>
              <div className="space-y-4">
                <CaseTimeline caseData={activeCase} />
                <DocumentsConsidered caseData={activeCase} />
              </div>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 scroll-smooth">
          {!activeCase && messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700">
               {/* No Case Loaded Banner */}
               <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 max-w-lg w-full">
                 <div className="flex items-start gap-4">
                   <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800 rounded-lg flex items-center justify-center shrink-0">
                     <FileText className="w-5 h-5 text-amber-700 dark:text-amber-200" />
                   </div>
                   <div>
                     <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">No Case Loaded</h3>
                     <p className="text-sm text-amber-800/80 dark:text-amber-200/80 leading-relaxed">
                       To begin analysis, you must open or upload source materials. This system works on files, not ad-hoc queries.
                     </p>
                   </div>
                 </div>
               </div>
               
               <div className="text-center space-y-2 max-w-md">
                 <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Start a Case</h1>
                 <p className="text-muted-foreground text-sm leading-relaxed">
                   Choose how you want to begin your governance analysis.
                 </p>
               </div>
               
               {/* Case-Centric CTAs */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
                 <a 
                   href="/canon"
                   className="flex flex-col items-center gap-3 p-6 bg-card border-2 border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all text-center group"
                   data-testid="cta-upload-documents"
                 >
                   <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                     <FileText className="w-6 h-6" />
                   </div>
                   <div>
                     <div className="font-semibold text-foreground">Upload Documents</div>
                     <div className="text-xs text-muted-foreground mt-1">Add source materials to Canon</div>
                   </div>
                 </a>
                 
                 <button 
                   onClick={runDemo}
                   className="flex flex-col items-center gap-3 p-6 bg-card border-2 border-primary rounded-xl hover:shadow-lg transition-all text-center group"
                   data-testid="cta-sample-case"
                 >
                   <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                     <Play className="w-6 h-6 fill-current" />
                   </div>
                   <div>
                     <div className="font-semibold text-foreground">Review Sample Case</div>
                     <div className="text-xs text-muted-foreground mt-1">Board-level governance dispute</div>
                   </div>
                 </button>
                 
                 <button
                   onClick={() => setShowCaseSelector(true)}
                   className="flex flex-col items-center gap-3 p-6 bg-card border-2 border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all text-center group"
                   data-testid="cta-open-case"
                 >
                   <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                     <Briefcase className="w-6 h-6" />
                   </div>
                   <div>
                     <div className="font-semibold text-foreground">Open Existing Case</div>
                     <div className="text-xs text-muted-foreground mt-1">Continue prior analysis</div>
                   </div>
                 </button>
               </div>

               <p className="text-xs text-muted-foreground max-w-md text-center">
                 This system enforces decision-time boundaries and requires all claims to cite Canon or verified data sources.
               </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble 
                  key={msg.id} 
                  message={msg}
                  isAuditExpanded={expandedAuditMessages.has(msg.id)}
                  onToggleAudit={() => toggleAuditExpanded(msg.id)}
                />
              ))}
            </>
          )}
          
          {isTyping && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs animate-pulse pl-2">
              <Sparkles className="w-3 h-3" />
              <span>Consulting Canon...</span>
            </div>
          )}
          
          {/* Try These Now Panel */}
          {showTryPanel && !isTyping && (
            <div className="bg-muted/30 border border-border rounded-xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Try These Now
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => triggerScenario("refusal")}
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-destructive/50 hover:bg-destructive/5 transition-all text-left group"
                  data-testid="button-try-refusal"
                >
                  <div className="w-8 h-8 rounded-md bg-destructive/10 text-destructive flex items-center justify-center shrink-0 group-hover:bg-destructive/20 transition-colors">
                    <Ban className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">See Refusal</div>
                    <div className="text-[10px] text-muted-foreground">Hindsight question</div>
                  </div>
                </button>
                
                <button
                  onClick={() => triggerScenario("revenue")}
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                  data-testid="button-try-proof"
                >
                  <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">See Proof</div>
                    <div className="text-[10px] text-muted-foreground">Numeric with audit trail</div>
                  </div>
                </button>
                
                <button
                  onClick={() => triggerScenario("category_error")}
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-purple-500/50 hover:bg-purple-50 transition-all text-left group"
                  data-testid="button-try-category"
                >
                  <div className="w-8 h-8 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:bg-purple-200 transition-colors">
                    <Gavel className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">See Category Error</div>
                    <div className="text-[10px] text-muted-foreground">Normative judgment refusal</div>
                  </div>
                </button>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-8 pb-8 pt-4 relative">
          
          {/* Suggestion Chip for Demo (if chat is empty but demo dismissed manually) */}
          {!showDemo && messages.length === 0 && !activeCase && (
             <button 
               onClick={runDemo} 
               className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary/10 hover:bg-primary/20 text-primary text-xs px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors"
             >
               <HelpCircle className="w-3 h-3" />
               Ask how to use me
             </button>
          )}

          {/* Question Bank - Builder Mode (default) */}
          {activeCase && viewMode === "builder" && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-sm font-semibold text-foreground mb-1">What do you want to know?</h3>
                <p className="text-xs text-muted-foreground">Select a question to evaluate your case</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {QUESTION_BANK.map((category) => (
                  <div key={category.id} className="bg-card border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                        {QUESTION_BANK_ICONS[category.icon]}
                      </div>
                      <h4 className="font-medium text-sm">{category.label}</h4>
                    </div>
                    <div className="space-y-2">
                      {category.questions.map((q) => (
                        <button
                          key={q.id}
                          onClick={() => handleIntentClick(q.query)}
                          disabled={isTyping}
                          className="w-full text-left px-3 py-2 text-sm bg-muted/30 hover:bg-muted border border-transparent hover:border-border rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid={`question-${q.id}`}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Collapsed Free Text Option */}
              <div className="text-center pt-2">
                <button
                  onClick={() => setShowFreeText(!showFreeText)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="toggle-free-text"
                >
                  {showFreeText ? "Hide custom question" : "Ask a custom question..."}
                </button>
              </div>

              {showFreeText && (
                <div className="relative shadow-lg rounded-xl overflow-hidden border border-border bg-background focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a governance question..."
                    className="w-full min-h-[60px] max-h-[120px] p-4 pr-12 resize-none outline-none text-sm bg-transparent placeholder:text-muted-foreground/50 font-medium"
                  />
                  <button 
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    className="absolute right-3 bottom-3 p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Audit Mode - Full free-form input with quick intents */}
          {activeCase && viewMode === "audit" && (
            <>
              <div className="mb-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Quick Review</div>
                <div className="flex flex-wrap gap-2">
                  {CANONICAL_INTENTS.slice(0, 6).map((intent) => (
                    <button
                      key={intent.id}
                      onClick={() => handleIntentClick(intent.question)}
                      disabled={isTyping}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted/50 hover:bg-muted border border-border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid={`intent-${intent.id}`}
                    >
                      {INTENT_ICONS[intent.id]}
                      {intent.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative shadow-lg rounded-xl overflow-hidden border border-border bg-background focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a governance or audit question..."
                  className="w-full min-h-[60px] max-h-[200px] p-4 pr-12 resize-none outline-none text-sm bg-transparent placeholder:text-muted-foreground/50 font-medium"
                />
                <button 
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="absolute right-3 bottom-3 p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
                
                <div className="absolute left-4 bottom-3 flex gap-4 text-[10px] font-mono text-muted-foreground/60 pointer-events-none">
                  <span className="flex items-center gap-1"><Settings2 className="w-3 h-3" /> CANON: v4.0</span>
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> AUDIT MODE</span>
                </div>
              </div>
            </>
          )}

          <p className="text-center text-[10px] text-muted-foreground mt-3">
             ELI shows exactly what evidence is required before a decision is allowed.
          </p>
        </div>

      </div>
    </AppLayout>
  );
}
