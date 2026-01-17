import { useState } from "react";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

interface DecisionTargetRolodexProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (target: string) => void;
}

interface LibraryTarget {
  id: string;
  title: string;
  text: string;
  category: string;
}

const LIBRARY_TARGETS: LibraryTarget[] = [
  {
    id: "policy-defensibility",
    title: "Policy defensibility",
    text: "Is this decision procedurally defensible under organizational policy based on the documented record?",
    category: "Governance & Compliance"
  },
  {
    id: "compliance-assertion",
    title: "Compliance assertion",
    text: "Is the organization defensible in asserting compliance at the time of action based on the documented record?",
    category: "Governance & Compliance"
  },
  {
    id: "process-integrity",
    title: "Process integrity",
    text: "Were required procedural steps completed prior to the decision under the applicable governance standard?",
    category: "Governance & Compliance"
  },
  {
    id: "defensibility-challenge",
    title: "Defensibility against challenge",
    text: "Is the organization defensible against foreseeable challenge based on the documented record at time of action?",
    category: "Legal & Risk"
  },
  {
    id: "record-sufficiency",
    title: "Record sufficiency",
    text: "Does the documented record support the decision taken under the applicable standard of review?",
    category: "Legal & Risk"
  },
  {
    id: "disciplinary-action",
    title: "Disciplinary action",
    text: "Is disciplinary action procedurally defensible under internal policy based on the documented record?",
    category: "HR & Employment"
  },
  {
    id: "termination-process",
    title: "Termination process",
    text: "Was termination carried out in compliance with internal policy and required process steps based on the documented record?",
    category: "HR & Employment"
  },
  {
    id: "expenditure-controls",
    title: "Expenditure controls",
    text: "Is this expenditure compliant with internal controls and approval policy based on the documented record?",
    category: "Finance & Procurement"
  },
  {
    id: "vendor-selection",
    title: "Vendor selection",
    text: "Is vendor selection procedurally compliant with procurement policy based on the documented record?",
    category: "Finance & Procurement"
  },
  {
    id: "release-approval",
    title: "Release approval",
    text: "Is release approval procedurally justified based on completion of required checks as evidenced in the record?",
    category: "Product & Operations"
  },
  {
    id: "change-management",
    title: "Change management",
    text: "Was this change executed in compliance with change management procedure based on the documented record?",
    category: "Product & Operations"
  }
];

const CATEGORIES = [
  "Governance & Compliance",
  "Legal & Risk",
  "HR & Employment",
  "Finance & Procurement",
  "Product & Operations"
];

type ValidationError = "DECISION_TARGET_REQUIRED" | "DECISION_TARGET_NOT_DECIDABLE" | "DECISION_TARGET_EXPLORATORY_UNSUPPORTED" | null;

function validateCustomTarget(text: string): ValidationError {
  const trimmed = text.trim();
  if (!trimmed) {
    return "DECISION_TARGET_REQUIRED";
  }
  const exploratoryTokens = /\b(what|why|how)\b/i;
  if (exploratoryTokens.test(trimmed)) {
    return "DECISION_TARGET_EXPLORATORY_UNSUPPORTED";
  }
  const binaryTokens = /\b(is|are|was|were|can|should|permitted|defensible|compliant|justified)\b/i;
  if (!binaryTokens.test(trimmed)) {
    return "DECISION_TARGET_NOT_DECIDABLE";
  }
  return null;
}

export function DecisionTargetRolodex({ isOpen, onClose, onSelect }: DecisionTargetRolodexProps) {
  const [activeTab, setActiveTab] = useState<"library" | "custom">("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<LibraryTarget | null>(null);
  const [customText, setCustomText] = useState("");
  const [validationError, setValidationError] = useState<ValidationError>(null);

  if (!isOpen) return null;

  const filteredTargets = LIBRARY_TARGETS.filter(target =>
    searchQuery === "" ||
    target.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    target.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    target.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedTargets = CATEGORIES.map(category => ({
    category,
    targets: filteredTargets.filter(t => t.category === category)
  })).filter(group => group.targets.length > 0);

  const handleLibrarySelect = () => {
    if (selectedTarget) {
      onSelect(selectedTarget.text);
      handleClose();
    }
  };

  const handleCustomSubmit = () => {
    const error = validateCustomTarget(customText);
    setValidationError(error);
    if (!error) {
      onSelect(customText.trim());
      handleClose();
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setSelectedTarget(null);
    setCustomText("");
    setValidationError(null);
    setActiveTab("library");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Select Decision Target</h3>
            <button
              onClick={handleClose}
              className="p-1 text-muted-foreground hover:text-foreground rounded"
              data-testid="button-close-rolodex"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose the decision this case is meant to support. This must be specific and answerable.
          </p>
        </div>

        <div className="border-b shrink-0">
          <div className="flex">
            <button
              onClick={() => setActiveTab("library")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === "library"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              data-testid="tab-library"
            >
              Library (Recommended)
            </button>
            <button
              onClick={() => setActiveTab("custom")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === "custom"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              data-testid="tab-custom"
            >
              Custom (Advanced)
            </button>
          </div>
        </div>

        {activeTab === "library" && (
          <>
            <div className="p-4 border-b shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search targets…"
                  className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                  data-testid="input-search-targets"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {groupedTargets.map(group => (
                <div key={group.category}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {group.category}
                  </h4>
                  <div className="space-y-2">
                    {group.targets.map(target => (
                      <button
                        key={target.id}
                        onClick={() => setSelectedTarget(target)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-all",
                          selectedTarget?.id === target.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/30"
                        )}
                        data-testid={`target-${target.id}`}
                      >
                        <div className="font-medium text-sm mb-1">{target.title}</div>
                        <div className="text-xs text-muted-foreground leading-relaxed">
                          {target.text}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <span className="px-2 py-0.5 text-[10px] bg-muted rounded-full font-medium">
                            binary
                          </span>
                          <span className="px-2 py-0.5 text-[10px] bg-muted rounded-full font-medium">
                            policy-anchored
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <p className="text-xs text-muted-foreground text-center pt-4 border-t">
                If your decision is not listed, use Custom. Exploratory questions are intentionally unsupported.
              </p>
            </div>

            <div className="p-4 border-t shrink-0 flex gap-3 justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                data-testid="button-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleLibrarySelect}
                disabled={!selectedTarget}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                data-testid="button-set-target"
              >
                Set Decision Target
              </button>
            </div>
          </>
        )}

        {activeTab === "custom" && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Write a decision target as a single sentence that is answerable (Yes/No or Permitted/Not Permitted).
              </p>

              <textarea
                value={customText}
                onChange={(e) => {
                  setCustomText(e.target.value);
                  setValidationError(null);
                }}
                placeholder="Example: 'Is disciplinary action against [party] procedurally defensible under [policy] based on the documented record?'"
                className={cn(
                  "w-full p-3 border rounded-lg text-sm resize-none h-32",
                  validationError ? "border-destructive" : "border-border"
                )}
                data-testid="input-custom-target"
              />

              {validationError && (
                <div className="text-sm font-mono text-destructive mb-2">
                  {validationError}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Decision Targets define the decision. They are not questions to the system.
              </p>
            </div>

            <div className="p-4 border-t shrink-0 flex gap-3 justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                data-testid="button-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomSubmit}
                disabled={!customText.trim()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                data-testid="button-set-target"
              >
                Set Decision Target
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
