'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { LoaderCircle, Lightbulb, Filter, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ObjectDetectionControlsProps {
  availableClasses: string[];
  selectedClasses: string[];
  onFilterChange: (selected: string[]) => void;
  summary: string | null;
  suggestedFilters: string[];
  isSummaryLoading: boolean;
  isSuggestionLoading: boolean;
  aiError: string | null;
}

export function ObjectDetectionControls({
  availableClasses,
  selectedClasses,
  onFilterChange,
  summary,
  suggestedFilters,
  isSummaryLoading,
  isSuggestionLoading,
  aiError,
}: ObjectDetectionControlsProps) {
  const handleCheckboxChange = (className: string, checked: boolean) => {
    const newSelectedClasses = checked
      ? [...selectedClasses, className]
      : selectedClasses.filter((c) => c !== className);
    onFilterChange(newSelectedClasses);
  };

  const handleSelectAll = () => {
    onFilterChange(availableClasses);
  };

  const handleDeselectAll = () => {
    onFilterChange([]);
  };

   const applySuggestion = (filter: string) => {
    if (!selectedClasses.includes(filter)) {
      onFilterChange([...selectedClasses, filter]);
    }
  };


  return (
    <div className="space-y-4 p-2 group-data-[collapsible=icon]:hidden">
      <Card className="bg-sidebar-accent/10 border-sidebar-border">
        <CardHeader className="p-3">
          <CardTitle className="text-base flex items-center gap-2 text-sidebar-foreground">
            <Filter className="w-4 h-4" />
            Filter Detected Objects
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {availableClasses.length === 0 ? (
            <p className="text-xs text-sidebar-foreground/70">Waiting for detections...</p>
          ) : (
            <>
            <div className="flex justify-between items-center mb-2">
                <Button variant="link" size="sm" className="p-0 h-auto text-xs text-sidebar-accent-foreground hover:text-sidebar-accent" onClick={handleSelectAll}>Select All</Button>
                <Button variant="link" size="sm" className="p-0 h-auto text-xs text-sidebar-foreground/70 hover:text-sidebar-accent" onClick={handleDeselectAll}>Deselect All</Button>
            </div>
              <ScrollArea className="h-40 pr-3">
                <div className="space-y-2">
                  {availableClasses.sort().map((className) => (
                    <div key={className} className="flex items-center space-x-2">
                      <Checkbox
                        id={className}
                        checked={selectedClasses.includes(className)}
                        onCheckedChange={(checked) => handleCheckboxChange(className, !!checked)}
                        className="border-sidebar-foreground data-[state=checked]:bg-sidebar-primary data-[state=checked]:text-sidebar-primary-foreground"
                      />
                      <Label
                        htmlFor={className}
                        className="text-sm font-normal text-sidebar-foreground cursor-pointer"
                      >
                        {className}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </CardContent>
      </Card>

      <Separator className="bg-sidebar-border" />

      <Card className="bg-sidebar-accent/10 border-sidebar-border">
        <CardHeader className="p-3">
          <CardTitle className="text-base flex items-center gap-2 text-sidebar-foreground">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles"><path d="m12 3-1.9 5.8-5.8 1.9 5.8 1.9 1.9 5.8 1.9-5.8 5.8-1.9-5.8-1.9Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
            AI Insights
          </CardTitle>
          {aiError && (
            <CardDescription className="text-destructive text-xs flex items-center gap-1 pt-1">
              <AlertCircle className="w-3 h-3" /> {aiError}
            </CardDescription>
           )}
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
           <div>
             <h4 className="text-sm font-medium text-sidebar-foreground mb-1 flex items-center gap-1">
                Summary
                 {isSummaryLoading && <LoaderCircle className="w-3 h-3 animate-spin text-sidebar-accent" />}
            </h4>
             <p className="text-xs text-sidebar-foreground/80">
                {isSummaryLoading ? "Generating..." : summary || "No summary available yet."}
             </p>
           </div>
           <div>
             <h4 className="text-sm font-medium text-sidebar-foreground mb-1 flex items-center gap-1">
                <Lightbulb className="w-3 h-3"/> Suggested Filters
                {isSuggestionLoading && <LoaderCircle className="w-3 h-3 animate-spin text-sidebar-accent" />}
             </h4>
              {isSuggestionLoading ? (
                 <p className="text-xs text-sidebar-foreground/80">Generating suggestions...</p>
              ) : suggestedFilters.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {suggestedFilters.map((filter) => (
                     <Badge
                        key={filter}
                        variant="secondary"
                        className="cursor-pointer bg-sidebar-accent/20 text-sidebar-accent-foreground/80 hover:bg-sidebar-accent/40 text-xs"
                        onClick={() => applySuggestion(filter)}
                        title={`Click to add '${filter}' to filters`}
                     >
                        {filter}
                    </Badge>
                  ))}
                </div>
              ) : (
                 <p className="text-xs text-sidebar-foreground/80">No suggestions available.</p>
              )}
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
