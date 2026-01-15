import { AppLayout } from "@/components/layout/AppLayout";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { INITIAL_MESSAGES, Message, SCENARIO_RESPONSES } from "@/lib/types";
import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Briefcase, FileText, Settings2, Shield, CalendarClock, Play, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/shared/Badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"; // Assuming shadcn Calendar exists or use standard input
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState<"advisor" | "sales">("advisor");
  const [decisionTime, setDecisionTime] = useState<Date | undefined>(undefined);
  const [showDemo, setShowDemo] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const runDemo = () => {
    setShowDemo(false);
    setMessages([INITIAL_MESSAGES[0]]);
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
        }
      }, currentDelay);
    });
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    if (showDemo) setShowDemo(false);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: Date.now(),
      temporalContext: decisionTime 
        ? `Decision Time: ${format(decisionTime, "yyyy-MM-dd")}` 
        : "Decision Time: Now (Default)"
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // Mock Response Logic
    setTimeout(() => {
      const lowerInput = userMsg.content.toLowerCase();
      let responseData: Partial<Message> | undefined;

      // Epistemic Guardrail: Check for Temporal Contradiction
      // If user sets a past decision time but asks for outcomes (hindsight)
      if (decisionTime && (lowerInput.includes("why did we miss") || lowerInput.includes("outcome") || lowerInput.includes("result"))) {
         responseData = {
           content: "### Refusal: Temporal Admissibility Violation\n\nYou have set the Decision Time to **" + format(decisionTime, "yyyy-MM-dd") + "**.\n\nAsking about outcomes that occurred *after* this date relies on future knowledge (hindsight), which is inadmissible in this context. I can only assess data available as of the decision date.",
           ipFlags: [
             { code: "PARROT_BOX", message: "Outcome knowledge inadmissible at set decision time.", type: "parrot_box" }
           ]
         };
      }
      else if (lowerInput.includes("revenue") || lowerInput.includes("ebitda")) {
        responseData = SCENARIO_RESPONSES["revenue"];
      } else if (lowerInput.includes("miss") || lowerInput.includes("why") || lowerInput.includes("target")) {
        responseData = SCENARIO_RESPONSES["refusal"];
      } else if (lowerInput.includes("sales") || lowerInput.includes("pitch")) {
        if (mode === "sales") {
           responseData = SCENARIO_RESPONSES["sales"];
        } else {
           responseData = {
             content: "Please switch to **Sales Mode** to generate positioning statements. Advisor Mode is restricted to neutral governance analysis.",
             ipFlags: []
           };
        }
      } else if (lowerInput.includes("inflation") || lowerInput.includes("cpi") || lowerInput.includes("bls")) {
         responseData = SCENARIO_RESPONSES["cpi_query"];
      } else if (lowerInput.includes("help") || lowerInput.includes("demo") || lowerInput.includes("use")) {
          runDemo();
          return; 
      } else {
        responseData = {
          content: "I can assist with that, provided it is covered in the Canon. However, for this prototype, please try asking about **Q3 Revenue**, **Why we missed targets**, **CPI Inflation Data**, or (in Sales Mode) **Sales Positioning**.",
          citations: []
        };
      }

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
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-screen max-w-5xl mx-auto">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between px-8 py-4 border-b bg-background/95 backdrop-blur z-10 sticky top-0">
          <div>
            <h2 className="text-lg font-semibold font-display text-foreground">
              {mode === "advisor" ? "Strategic Advisor" : "Sales Enablement"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {mode === "advisor" ? "Neutral • Outcome-Blind • Governance-First" : "Persuasive • Canon-Bounded • Objection Handling"}
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
                  onClick={() => setMode("advisor")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2",
                    mode === "advisor" ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className="w-3 h-3" />
                  Advisor
                </button>
                <button 
                  onClick={() => setMode("sales")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2",
                    mode === "sales" ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Briefcase className="w-3 h-3" />
                  Sales
                </button>
             </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 scroll-smooth">
          {showDemo && messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700">
               <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl">
                 <Shield className="w-8 h-8 text-primary-foreground" />
               </div>
               <div className="text-center space-y-2 max-w-md">
                 <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">ELI Expert</h1>
                 <p className="text-muted-foreground text-sm leading-relaxed">
                   A governance-grade assistant that enforces epistemic boundaries. 
                   Outcome-blind. Auditable. Citation-based.
                 </p>
               </div>
               
               <div className="flex flex-col gap-3 w-full max-w-xs">
                 <button 
                   onClick={runDemo}
                   className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                 >
                   <Play className="w-4 h-4 fill-current" />
                   Run Guided Demo
                 </button>
                 <div className="text-center">
                    <span className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-widest">or just start typing below</span>
                 </div>
               </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </>
          )}
          
          {isTyping && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs animate-pulse pl-2">
              <Sparkles className="w-3 h-3" />
              <span>Consulting Canon...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-8 pb-8 pt-4 relative">
          
          {/* Suggestion Chip for Demo (if chat is empty but demo dismissed manually) */}
          {!showDemo && messages.length === 0 && (
             <button 
               onClick={runDemo} 
               className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary/10 hover:bg-primary/20 text-primary text-xs px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors"
             >
               <HelpCircle className="w-3 h-3" />
               Ask how to use me
             </button>
          )}

          <div className="relative shadow-lg rounded-xl overflow-hidden border border-border bg-background focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a governance or financial question..."
              className="w-full min-h-[60px] max-h-[200px] p-4 pr-12 resize-none outline-none text-sm bg-transparent placeholder:text-muted-foreground/50 font-medium"
            />
            <button 
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="absolute right-3 bottom-3 p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
            
            {/* Input Footer */}
            <div className="absolute left-4 bottom-3 flex gap-4 text-[10px] font-mono text-muted-foreground/60 pointer-events-none">
              <span className="flex items-center gap-1"><Settings2 className="w-3 h-3" /> CANON: v4.0 (LOCKED)</span>
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> AUDIT: ON</span>
            </div>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-3">
             ELI Expert produces outcome-blind, verifiable outputs. All numeric claims are cited.
          </p>
        </div>

      </div>
    </AppLayout>
  );
}
