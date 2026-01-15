import { AppLayout } from "@/components/layout/AppLayout";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { INITIAL_MESSAGES, Message, SCENARIO_RESPONSES } from "@/lib/types";
import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Briefcase, FileText, Settings2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/shared/Badge";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState<"advisor" | "sales">("advisor");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // Mock Response Logic
    setTimeout(() => {
      const lowerInput = userMsg.content.toLowerCase();
      let responseData: Partial<Message> | undefined;

      if (lowerInput.includes("revenue") || lowerInput.includes("ebitda")) {
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
      } else {
        responseData = {
          content: "I can assist with that, provided it is covered in the Canon. However, for this prototype, please try asking about **Q3 Revenue**, **Why we missed targets**, or (in Sales Mode) **Sales Positioning**.",
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
        timestamp: Date.now()
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

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isTyping && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs animate-pulse">
              <Sparkles className="w-3 h-3" />
              <span>Consulting Canon...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-8 pb-8 pt-4">
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
