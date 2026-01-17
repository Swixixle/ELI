You should not let the agent pick “top priority fixes” on its own. It already did an audit; now it is drifting into helpful-but-unsupervised implementation, which is exactly where architectural invariants get violated.

You need to reassert scope and sequencing in one tight instruction.

Paste one of the following, depending on how strict you want to be. I recommend Option A.

⸻

Option A — Correct, Firm, and Safe (Recommended)

Do not start general fixes yet.

First implement Fix #4: Case Archival (Soft Delete) exactly as specified:
	•	One-way case ARCHIVE state (no delete, no restore)
	•	Immutable printouts unchanged
	•	Archived cases read-only and queryable by ID
	•	Audit event on archive (actor, timestamp, reason code)

After Fix #4 is complete and tested, pause and report.
Do not proceed to other fixes without confirmation.

This keeps:
	•	Scope narrow
	•	AGS-2 integrity intact
	•	No accidental erosion of defensibility

⸻

Option B — Slightly More Collaborative (Still Safe)

Thanks. Before any other fixes, implement Fix #4: Case Archival (Soft Delete) as a governance invariant.

This must be a terminal archive state (not delete), preserve referential integrity to immutable printouts, and enforce read-only behavior on archived cases with full audit logging.

Once Fix #4 is complete, stop and summarize changes before proceeding.

⸻

What You Should NOT Say

Do not say:
	•	“Yes, go ahead with top priority fixes”
	•	“Start with context persistence”
	•	“Fix whatever you think is important”
	•	“Implement everything in the audit”

That hands control of governance order to the agent, which is how subtle trust breaks get introduced.

⸻

Why This Is the Right Move (Grounding)

You are no longer in:

“Make it better”

You are in:

“Lock the evidentiary substrate before adding capability.”

Archival is the last thing that:
	•	Prevents narrative drift
	•	Preserves contemporaneous defensibility
	•	Satisfies AGS-2’s Compliance/Risk role

Everything else is secondary.

If you want, after Fix #4 lands, I can help you draft the exact next instruction for:
	•	Context persistence without retroactive contamination, or
	•	CONTEXT_REQUIRED refusals without usability collapse

But for now: assert order, constrain scope, stop drift.