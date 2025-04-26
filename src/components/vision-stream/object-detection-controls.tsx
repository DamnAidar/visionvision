
'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { Separator } from '@/components/ui/separator'; // Separator removed as AI section is gone
// import { LoaderCircle, Lightbulb, AlertCircle } from 'lucide-react'; // Icons for AI section removed
import { Filter, Info } from 'lucide-react';
// import { Badge } from '@/components/ui/badge'; // Badge removed as suggestions are gone

interface ObjectDetectionControlsProps {
  availableClasses: string[];
  selectedClasses: string[];
  onFilterChange: (selected: string[]) => void;
  // Removed AI props
  // summary: string | null;
  // suggestedFilters: string[];
  // isSummaryLoading: boolean;
  // isSuggestionLoading: boolean;
  // aiError: string | null;
}

export function ObjectDetectionControls({
  availableClasses,
  selectedClasses,
  onFilterChange,
  // AI props removed
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

   // applySuggestion removed as AI suggestions are gone
  // const applySuggestion = (filter: string) => {
  //   if (!selectedClasses.includes(filter)) {
  //     onFilterChange([...selectedClasses, filter]);
  //   }
  // };


  return (
    <div className="space-y-4 p-2 group-data-[collapsible=icon]:hidden">
      <Card className="bg-sidebar-accent/10 border-sidebar-border">
        <CardHeader className="p-3">
          <CardTitle className="text-base flex items-center gap-2 text-sidebar-foreground">
            <Filter className="w-4 h-4" />
            Filter Detected Objects
          </CardTitle>
           <CardDescription className="text-xs text-sidebar-foreground/70 pt-1 flex items-center gap-1">
             <Info className="w-3 h-3 shrink-0" /> Note: Object detection is not yet implemented. These are example classes.
           </CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {availableClasses.length === 0 ? (
            <p className="text-xs text-sidebar-foreground/70">No classes defined.</p> // Updated message
          ) : (
            <>
            <div className="flex justify-between items-center mb-2">
                <Button variant="link" size="sm" className="p-0 h-auto text-xs text-sidebar-accent hover:text-sidebar-accent/80" onClick={handleSelectAll}>Select All</Button>
                <Button variant="link" size="sm" className="p-0 h-auto text-xs text-sidebar-foreground/70 hover:text-sidebar-accent/80" onClick={handleDeselectAll}>Deselect All</Button>
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

      {/* AI Insights Card Removed */}
      {/* <Separator className="bg-sidebar-border" /> */}
      {/* <Card className="bg-sidebar-accent/10 border-sidebar-border"> ... </Card> */}
    </div>
  );
}
