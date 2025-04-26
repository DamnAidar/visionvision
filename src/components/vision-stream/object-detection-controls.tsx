
'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Filter, Info, LoaderCircle } from 'lucide-react';
import type { CocoSSDClassLabel } from '@/types/detection'; // Use the specific type

interface ObjectDetectionControlsProps {
  availableClasses: CocoSSDClassLabel[]; // Use the specific type
  selectedClasses: string[];
  onFilterChange: (selected: string[]) => void;
  isModelLoading: boolean; // Add prop to indicate model loading state
}

export function ObjectDetectionControls({
  availableClasses,
  selectedClasses,
  onFilterChange,
  isModelLoading, // Use the prop
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


  return (
    <div className="space-y-4 p-2 group-data-[collapsible=icon]:hidden">
      <Card className="bg-sidebar-accent/10 border-sidebar-border">
        <CardHeader className="p-3">
          <CardTitle className="text-base flex items-center gap-2 text-sidebar-foreground">
            <Filter className="w-4 h-4" />
            Filter Detected Objects
          </CardTitle>
           <CardDescription className="text-xs text-sidebar-foreground/70 pt-1 flex items-center gap-1">
             <Info className="w-3 h-3 shrink-0" /> Select classes to display overlays for.
           </CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {isModelLoading ? (
             <div className="flex items-center justify-center h-40 text-sidebar-foreground/70">
                <LoaderCircle className="w-5 h-5 animate-spin mr-2"/> Loading classes...
             </div>
          ) : availableClasses.length === 0 ? (
            <p className="text-xs text-sidebar-foreground/70">No classes available from model.</p>
          ) : (
            <>
            <div className="flex justify-between items-center mb-2">
                <Button variant="link" size="sm" className="p-0 h-auto text-xs text-sidebar-accent hover:text-sidebar-accent/80" onClick={handleSelectAll}>Select All</Button>
                <Button variant="link" size="sm" className="p-0 h-auto text-xs text-sidebar-foreground/70 hover:text-sidebar-accent/80" onClick={handleDeselectAll}>Deselect All</Button>
            </div>
              <ScrollArea className="h-48 pr-3"> {/* Increased height slightly */}
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
                        className="text-sm font-normal text-sidebar-foreground cursor-pointer capitalize" // Capitalize class names for display
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
    </div>
  );
}
