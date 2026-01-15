import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Copy, 
  CheckCircle2,
  Users,
  BookOpen,
  ClipboardCheck
} from "lucide-react";
import { useState } from "react";

interface TemplateProps {
  title: string;
  description: string;
  prerequisite: string;
  content: string;
  icon: React.ReactNode;
}

const TEMPLATES: TemplateProps[] = [
  {
    title: "Independent Verification Statement",
    description: "A statement from someone other than the decision-maker confirming key facts",
    prerequisite: "Independent Verification",
    icon: <Users className="h-5 w-5" />,
    content: `INDEPENDENT VERIFICATION STATEMENT

Case Reference: [CASE ID]
Date of Statement: [DATE]
Statement Author: [NAME], [TITLE/ROLE]

---

I, [NAME], confirm that I was present / had direct knowledge of the events described below. I am providing this statement independently and was not the primary decision-maker in this matter.

VERIFIED FACTS:

1. On [DATE] at approximately [TIME], I observed/confirmed:
   [Description of what was directly witnessed or verified]

2. At the time of the decision, the following information was available:
   [List of information confirmed to be present]

3. The following constraints were apparent:
   [Any resource, time, or situational constraints observed]

CONTEMPORANEOUS EVIDENCE:
- [Reference to any notes, logs, or records created at the time]
- [Reference to any communications witnessed]

DECLARATION:
This statement is based on my direct observation and contemporaneous knowledge. I have not been coached or directed in preparing this statement.

Signed: ______________________
Date: ________________________
Title: _______________________
Contact: _____________________`
  },
  {
    title: "Policy Application Record",
    description: "Documentation showing how a specific policy was applied to this decision",
    prerequisite: "Policy Application",
    icon: <BookOpen className="h-5 w-5" />,
    content: `POLICY APPLICATION RECORD

Case Reference: [CASE ID]
Decision Date: [DATE]
Decision Maker: [NAME/ROLE]
Policy Applied: [POLICY NAME AND VERSION]

---

POLICY REQUIREMENTS CHECKLIST:

[ ] Requirement 1: [Description from policy]
    Status: MET / NOT MET / NOT APPLICABLE
    Evidence: [How this was satisfied or why deviation occurred]

[ ] Requirement 2: [Description from policy]
    Status: MET / NOT MET / NOT APPLICABLE
    Evidence: [How this was satisfied or why deviation occurred]

[ ] Requirement 3: [Description from policy]
    Status: MET / NOT MET / NOT APPLICABLE
    Evidence: [How this was satisfied or why deviation occurred]

---

DEVIATION JUSTIFICATION (if applicable):

If any requirement was not fully met, explain why:

Requirement(s) not met: [List]

Reason for deviation:
[Explain the circumstances that prevented full compliance]

Was deviation:
[ ] Pre-approved by [Authority]
[ ] Documented at the time
[ ] Reviewed afterward

---

POLICY OUTCOME:

Based on the policy requirements and the information available at decision time:

[ ] Decision was within policy parameters
[ ] Decision deviated from policy with justification
[ ] Decision deviated from policy without justification

---

Completed by: _________________
Date: ________________________
Review by: ___________________`
  },
  {
    title: "Contextual Constraints Log",
    description: "Documentation of resource, time, or situational constraints at decision time",
    prerequisite: "Contextual Constraints",
    icon: <ClipboardCheck className="h-5 w-5" />,
    content: `CONTEXTUAL CONSTRAINTS LOG

Case Reference: [CASE ID]
Date/Time of Decision: [DATE] [TIME]
Location: [LOCATION]

---

RESOURCE CONSTRAINTS:

Staffing:
- Expected staffing level: [NUMBER/DESCRIPTION]
- Actual staffing level: [NUMBER/DESCRIPTION]
- Key absences/limitations: [DETAILS]

Equipment/Resources:
- Required resources: [LIST]
- Available resources: [LIST]
- Unavailable/limited: [LIST]

---

TIME CONSTRAINTS:

- Time available for decision: [DURATION]
- Urgency factors: [DESCRIPTION]
- Deadline/trigger: [WHAT REQUIRED IMMEDIATE ACTION]

---

SITUATIONAL FACTORS:

- Concurrent demands: [OTHER PRIORITIES]
- Environmental conditions: [RELEVANT CONDITIONS]
- Communication limitations: [IF ANY]

---

INFORMATION AVAILABLE AT DECISION TIME:

What was known:
- [FACT 1]
- [FACT 2]
- [FACT 3]

What was NOT yet known:
- [INFORMATION LEARNED LATER]
- [INFORMATION NOT AVAILABLE]

---

DECISION OPTIONS AVAILABLE:

Given the above constraints, the decision-maker had the following options:

Option A: [Description]
Option B: [Description]
Option C: [Description]

Option selected: [WHICH]
Rationale: [WHY THIS OPTION GIVEN CONSTRAINTS]

---

Documented by: _________________
Date: ________________________
Role: ________________________`
  }
];

function TemplateCard({ template }: { template: TemplateProps }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(template.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([template.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.title.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {template.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm">{template.title}</CardTitle>
              <Badge variant="outline" className="text-xs">
                {template.prerequisite}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {template.description}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="bg-muted/30 rounded-lg border p-3 max-h-32 overflow-y-auto mb-3">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
            {template.content.slice(0, 300)}...
          </pre>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopy}
            className="flex-1"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy Template
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownload}
            className="flex-1"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DocumentTemplates() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Document Templates</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Use these templates to create documents that satisfy procedural prerequisites. 
        Fill in the bracketed fields with your case-specific information.
      </p>
      <div className="grid gap-4">
        {TEMPLATES.map((template) => (
          <TemplateCard key={template.title} template={template} />
        ))}
      </div>
    </div>
  );
}
