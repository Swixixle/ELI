import { AppLayout } from "@/components/layout/AppLayout";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { INITIAL_MESSAGES, Message, SCENARIO_RESPONSES, CANONICAL_INTENTS, QUESTION_BANK } from "@/lib/types";
import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Briefcase, FileText, Settings2, Shield, CalendarClock, Play, HelpCircle, Ban, Calculator, Gavel, FolderOpen, CheckCircle, AlertCircle, AlertTriangle, ArrowRight, CheckSquare, Lock, FileSearch, CircleSlash, Wrench, Search, X, ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/shared/Badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { CaseSelector } from "@/components/cases/CaseSelector";
import { CaseTimeline, DocumentsConsidered } from "@/components/cases/CaseTimeline";
import { DecisionReadinessPanel } from "@/components/cases/DecisionReadiness";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
      conditions: [],
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

  const conditions = [
    {
      id: "decision_target",
      name: "Decision Target",
      status: hasDecisionTarget ? "satisfied" as const : "missing" as const,
      gapExpression: hasDecisionTarget ? undefined : "NEED(decision_target) = 1 statement",
      evidence: hasDecisionTarget ? [caseData.decisionTarget!.substring(0, 30) + "..."] : undefined,
      description: "What decision is this case trying to support?"
    },
    {
      id: "temporal",
      name: "Temporal Verification",
      status: hasMultipleDocuments ? "satisfied" as const : hasDocuments ? "partial" as const : "missing" as const,
      gapExpression: !hasDocuments ? "NEED(timestamp) = 2 time verifiers" : !hasMultipleDocuments ? "NEED(sequence) = 1 more timestamped document" : undefined,
      evidence: hasDocuments ? [`${documentCount} document(s) with dates`] : undefined,
      description: "When was this decision made? Can we verify the timeline?"
    },
    {
      id: "independent",
      name: "Independent Verification",
      status: "missing" as const,
      gapExpression: "NEED(corroboration) = 1 interview OR 1 independent document",
      description: "Is there third-party confirmation of claims?"
    },
    {
      id: "policy",
      name: "Policy Application",
      status: "missing" as const,
      gapExpression: "NEED(policy_record) = 1 policy application record",
      description: "What rule, policy, or standard governed this decision?"
    },
    {
      id: "contextual",
      name: "Contextual Constraints",
      status: hasDecisionTarget ? "satisfied" as const : "missing" as const,
      gapExpression: hasDecisionTarget ? undefined : "NEED(constraints) = 1 constraint artifact",
      evidence: hasDecisionTarget ? ["Decision context defined"] : undefined,
      description: "What constraints shaped the decision-maker's options?"
    }
  ];

  return {
    decisionTarget: caseData.decisionTarget || null,
    phase: currentPhase,
    permitted,
    categories,
    conditions,
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
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [questionSearch, setQuestionSearch] = useState("");
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

        {/* Two-Column Dashboard Layout */}
        {activeCase && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-0 min-h-0 overflow-hidden">
            {/* LEFT COLUMN - Question Bank + Ask Bar */}
            <div className="flex flex-col min-h-0 border-r">
              {/* Compact Status Summary */}
              <div className="px-6 py-3 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    decisionReadiness.permitted ? "bg-green-500" : "bg-amber-500"
                  )} />
                  <div>
                    <span className="text-sm font-medium">
                      {decisionReadiness.permitted ? "Decision Permitted" : "Review Blocked"}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({decisionReadiness.totalSatisfied}/{decisionReadiness.totalRequired} prerequisites)
                    </span>
                  </div>
                </div>
                <Sheet>
                  <SheetTrigger asChild>
                    <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                      <Info className="w-3 h-3" />
                      Learn more
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                    <SheetHeader>
                      <SheetTitle>What this means</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 space-y-4">
                      {decisionReadiness.permitted ? (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-green-600">Means:</span> There is enough structural information that a fair procedural evaluation can now occur.
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-slate-500">Does not mean:</span> The decision is valid, correct, or should proceed.
                          </p>
                          <p className="text-sm text-muted-foreground italic border-l-2 border-primary pl-3">
                            This is jurisdiction, not judgment. Like a court saying "we can hear this case" — not "we've ruled."
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            The record does not yet contain enough structural information to support a procedurally fair evaluation.
                          </p>
                          <p className="text-sm text-muted-foreground italic border-l-2 border-amber-500 pl-3">
                            This does not decide the case — it decides whether the case can be decided.
                          </p>
                        </div>
                      )}
                      <div className="pt-4 border-t">
                        <h4 className="font-medium text-sm mb-2">Threshold Policy</h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>0-2 prerequisites: Review unsafe — advisory only</li>
                          <li>3 prerequisites: Review permitted, high procedural risk</li>
                          <li>4 prerequisites: Review strong, defensible</li>
                          <li>5 prerequisites: Review robust, regulator-ready</li>
                        </ul>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Question Bank Container with Internal Scroll - Builder Mode */}
              {viewMode === "builder" && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="px-6 py-4 border-b bg-background">
                    <h3 className="text-sm font-semibold text-foreground mb-2">What do you want to know?</h3>
                    <input
                      type="text"
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                      placeholder="Search questions..."
                      className="w-full px-3 py-2 text-sm border rounded-lg bg-muted/30 focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      data-testid="input-question-search"
                    />
                  </div>
                  
                  <ScrollArea className="flex-1">
                    <div className="px-6 py-4 space-y-4 pb-4">
                      {QUESTION_BANK.filter(category => 
                        questionSearch === "" || 
                        category.label.toLowerCase().includes(questionSearch.toLowerCase()) ||
                        category.questions.some(q => q.label.toLowerCase().includes(questionSearch.toLowerCase()))
                      ).map((category) => (
                        <div key={category.id} className="bg-card border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                              {QUESTION_BANK_ICONS[category.icon]}
                            </div>
                            <h4 className="font-medium text-sm">{category.label}</h4>
                          </div>
                          <div className="space-y-1.5">
                            {category.questions.filter(q => 
                              questionSearch === "" || q.label.toLowerCase().includes(questionSearch.toLowerCase())
                            ).map((q) => (
                              <button
                                key={q.id}
                                onClick={() => setSelectedQuestion(selectedQuestion === q.query ? null : q.query)}
                                disabled={isTyping}
                                className={cn(
                                  "w-full text-left px-3 py-2 text-sm rounded-lg transition-all disabled:opacity-50",
                                  selectedQuestion === q.query
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted/30 hover:bg-muted border border-transparent hover:border-border"
                                )}
                                data-testid={`question-${q.id}`}
                              >
                                {q.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Audit Mode - Quick intents + free-form input */}
              {viewMode === "audit" && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="px-6 py-4 border-b bg-background">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Quick Review</h3>
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
                  
                  <ScrollArea className="flex-1">
                    <div className="px-6 py-4">
                      <p className="text-xs text-muted-foreground mb-4">
                        In Audit mode, you can ask any governance or procedural question. Use the quick intents above or type your own query below.
                      </p>
                      <div className="p-4 bg-muted/30 rounded-lg border border-dashed text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                          <Shield className="w-4 h-4" />
                          <span className="text-xs font-mono">CANON v4.0 • AUDIT MODE</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          All queries are evaluated against outcome-blind procedural boundaries
                        </p>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Pinned Ask Bar - Always Visible */}
              <div className="px-6 py-4 border-t bg-background shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]">
                {selectedQuestion && viewMode === "builder" && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs">
                      <span className="truncate">{selectedQuestion}</span>
                      <button 
                        onClick={() => setSelectedQuestion(null)}
                        className="shrink-0 hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={viewMode === "builder" && selectedQuestion ? "Add context or just click Ask..." : "Ask a governance question..."}
                    className="flex-1 px-4 py-2.5 text-sm border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                    data-testid="input-ask-question"
                  />
                  <button
                    onClick={() => {
                      if (viewMode === "builder" && selectedQuestion) {
                        const fullQuery = inputValue.trim() ? `${selectedQuestion} ${inputValue}` : selectedQuestion;
                        handleIntentClick(fullQuery);
                        setSelectedQuestion(null);
                      } else if (inputValue.trim()) {
                        handleSend();
                      }
                    }}
                    disabled={viewMode === "builder" ? (!selectedQuestion && !inputValue.trim()) : !inputValue.trim()}
                    className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    data-testid="button-ask"
                  >
                    Ask
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Decision Readiness, Timeline, Documents */}
            <ScrollArea className="bg-muted/20">
              <div className="p-4 space-y-4">
                <DecisionReadinessPanel 
                  readiness={decisionReadiness}
                  onSetDecisionTarget={() => setShowDecisionTargetDialog(true)}
                />
                <CaseTimeline caseData={activeCase} />
                <DocumentsConsidered caseData={activeCase} />
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Chat Area - Shows responses */}
        {activeCase && messages.length > 0 && (
          <div className="border-t bg-muted/10">
            <div className="px-8 py-4 border-b">
              <h3 className="text-sm font-medium text-muted-foreground">Recent Responses</h3>
            </div>
            <ScrollArea className="max-h-[300px]">
              <div className="px-8 py-4 space-y-4">
                {messages.map((msg) => (
                  <MessageBubble 
                    key={msg.id} 
                    message={msg}
                    isAuditExpanded={expandedAuditMessages.has(msg.id)}
                    onToggleAudit={() => toggleAuditExpanded(msg.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* No Case Loaded State */}
        <div className={cn("flex-1 overflow-y-auto px-8 py-6 space-y-6 scroll-smooth", activeCase && "hidden")}>
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


      </div>
    </AppLayout>
  );
}
