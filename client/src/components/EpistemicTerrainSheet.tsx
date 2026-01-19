import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  EpistemicTerrainSheet as EpistemicTerrainSheetData,
  SanitizedSummary,
  SanitizedSummaryReason,
} from "../../../shared/visualSpec";

interface EpistemicTerrainSheetProps {
  data: EpistemicTerrainSheetData;
  sanitizedSummary: SanitizedSummary;
}

export function EpistemicTerrainSheet({ data, sanitizedSummary }: EpistemicTerrainSheetProps) {
  const { header, terrain, exclusions } = data;

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto" data-testid="epistemic-terrain-sheet">
      <Card data-testid="envelope-header">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Envelope Header</span>
            <Badge variant="outline" className="font-mono text-xs">
              {header.rulesetVersion}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Measurement ID</span>
              <p className="font-mono text-xs truncate" data-testid="header-measurement-id">
                {header.measurementId}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Decision Time Anchor</span>
              <p className="font-mono text-xs" data-testid="header-dta">
                {new Date(header.decisionTimeAnchor.timestamp).toISOString()}
              </p>
              <Badge variant="secondary" className="mt-1 text-xs">
                source: {header.decisionTimeAnchor.source}
              </Badge>
            </div>
          </div>

          <Separator />

          <div>
            <span className="text-muted-foreground text-sm">Locked Strata Referenced</span>
            <div className="flex gap-2 mt-2" data-testid="strata-lock-status">
              {header.lockedStrataReferenced.map((stratum) => (
                <Badge key={stratum} variant="default" className="font-mono">
                  {stratum}: LOCKED
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <span className="text-muted-foreground text-sm">Admissible Record Hash</span>
            <p className="font-mono text-xs mt-1 truncate" data-testid="admissible-hash">
              {header.admissibleRecordHash}
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground text-sm">Authorized Uses</span>
              <div className="flex flex-wrap gap-1 mt-2" data-testid="authorized-uses">
                {header.authorizedUses.map((use) => (
                  <Badge key={use} variant="secondary" className="text-xs">
                    {use.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Prohibited Uses</span>
              <div className="flex flex-wrap gap-1 mt-2" data-testid="prohibited-uses">
                {header.prohibitedUses.map((use) => (
                  <Badge key={use} variant="destructive" className="text-xs">
                    {use.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="epistemic-terrain-plot">
        <CardHeader>
          <CardTitle>Epistemic Terrain</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-square max-w-md mx-auto relative border rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-muted-foreground pb-2">
              {terrain.axes.x.label}: {(terrain.axes.x.value * 100).toFixed(0)}%
            </div>
            <div className="absolute top-1/2 left-2 -rotate-90 origin-left text-xs text-muted-foreground whitespace-nowrap">
              {terrain.axes.y.label}: {(terrain.axes.y.value * 100).toFixed(0)}%
            </div>
            
            <div className="absolute inset-8 flex items-center justify-center">
              <div 
                className="rounded-full bg-primary/20 flex items-center justify-center relative"
                style={{
                  width: `${Math.max(20, terrain.constraintDensity * 100)}%`,
                  height: `${Math.max(20, terrain.constraintDensity * 100)}%`,
                }}
                data-testid="constraint-density-indicator"
              >
                <div 
                  className="absolute w-3 h-3 bg-primary rounded-full border-2 border-background"
                  style={{
                    left: `${terrain.axes.x.value * 100}%`,
                    bottom: `${terrain.axes.y.value * 100}%`,
                    transform: 'translate(-50%, 50%)',
                  }}
                  data-testid="terrain-position-marker"
                />
                <div className="text-center">
                  <div className="text-2xl font-bold" data-testid="decision-space-compression">
                    {(terrain.decisionSpaceCompression * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Decision Space
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <span className="text-muted-foreground text-sm">Dominant Limiting Axes</span>
            <div className="flex justify-center gap-2 mt-2" data-testid="dominant-axes">
              {terrain.dominantLimitingAxes.map((axis) => (
                <Badge key={axis} variant="outline" className="font-mono text-xs">
                  {axis}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Badge 
              variant={sanitizedSummary.status === "Decision Permitted" ? "default" : "secondary"}
              className="mb-2"
              data-testid="summary-status"
            >
              {sanitizedSummary.status}
            </Badge>
            <Badge 
              variant="outline"
              className="ml-2 text-xs font-mono"
              data-testid="summary-reason"
            >
              {sanitizedSummary.reason}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="refusal-exclusion-ledger">
        <CardHeader>
          <CardTitle>Refusal & Exclusion Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Excluded Class</TableHead>
                <TableHead>Governing Axiom</TableHead>
                <TableHead>Refusal Code</TableHead>
                <TableHead className="text-right">Substitution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exclusions.entries.map((entry, idx) => (
                <TableRow key={idx} data-testid={`exclusion-entry-${idx}`}>
                  <TableCell className="font-medium">
                    {entry.excludedClass.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {entry.governingAxiom}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {entry.refusalCode}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="destructive" className="text-xs">
                      NO AUTHORIZED SUBSTITUTION
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
