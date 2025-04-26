'use client';

import * as React from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { VideoStreamPlayer } from '@/components/vision-stream/video-stream-player';
import { ObjectDetectionControls } from '@/components/vision-stream/object-detection-controls';
import { useSimulatedStream } from '@/hooks/use-simulated-stream';
import { summarizeObjects } from '@/ai/flows/summarize-objects';
import { suggestDetectionFilters } from '@/ai/flows/suggest-detection-filters';
import type { Detection } from '@/types/detection';
import { LoaderCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function VisionStreamPage() {
  const { frame, detections, isLoading, error, availableClasses } = useSimulatedStream();
  const [filteredClasses, setFilteredClasses] = React.useState<string[]>([]);
  const [summary, setSummary] = React.useState<string | null>(null);
  const [suggestedFilters, setSuggestedFilters] = React.useState<string[]>([]);
  const [isSummaryLoading, setIsSummaryLoading] = React.useState(false);
  const [isSuggestionLoading, setIsSuggestionLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);

  // Filter detections based on selected classes
  const filteredDetections = React.useMemo(() => {
    if (filteredClasses.length === 0) {
      return detections; // Show all if no filter applied
    }
    return detections.filter(d => filteredClasses.includes(d.label));
  }, [detections, filteredClasses]);

  // Effect to generate summary when detections change
  React.useEffect(() => {
    if (detections.length > 0) {
      const fetchSummary = async () => {
        setIsSummaryLoading(true);
        setAiError(null);
        try {
          const result = await summarizeObjects({
            objectList: detections.map(d => d.label),
            timestamp: Date.now(),
          });
          setSummary(result.summary);
        } catch (err) {
          console.error("Error fetching summary:", err);
          setSummary("Could not generate summary.");
          setAiError("Failed to generate summary. Please check the AI service.");
        } finally {
          setIsSummaryLoading(false);
        }
      };
      fetchSummary();
    } else {
      setSummary(null); // Clear summary if no detections
    }
  }, [detections]);

  // Effect to generate filter suggestions when detections change
  React.useEffect(() => {
    if (detections.length > 0) {
      const fetchSuggestions = async () => {
        setIsSuggestionLoading(true);
        setAiError(null);
        try {
          const result = await suggestDetectionFilters({
            detectedObjects: detections.map(d => d.label),
          });
          setSuggestedFilters(result.suggestedFilters);
        } catch (err) {
          console.error("Error fetching suggestions:", err);
          setSuggestedFilters([]);
           setAiError("Failed to generate suggestions. Please check the AI service.");
        } finally {
          setIsSuggestionLoading(false);
        }
      };
      fetchSuggestions();
    } else {
      setSuggestedFilters([]); // Clear suggestions if no detections
    }
  }, [detections]);


  const handleFilterChange = (selected: string[]) => {
    setFilteredClasses(selected);
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4">
          <h1 className="text-xl font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            VisionStream
          </h1>
           <div className="text-sm text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden">
             Real-time Object Detection
           </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
             <SidebarGroupLabel>Controls</SidebarGroupLabel>
             <SidebarGroupContent>
               <ObjectDetectionControls
                 availableClasses={availableClasses}
                 selectedClasses={filteredClasses}
                 onFilterChange={handleFilterChange}
                 summary={summary}
                 suggestedFilters={suggestedFilters}
                 isSummaryLoading={isSummaryLoading}
                 isSuggestionLoading={isSuggestionLoading}
                 aiError={aiError}
               />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4 text-sidebar-foreground/70 text-xs group-data-[collapsible=icon]:hidden">
          Powered by Next.js & Genkit
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col p-4">
        <header className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2">
             <SidebarTrigger className="md:hidden" />
             <h2 className="text-2xl font-semibold">Live Feed</h2>
           </div>
           {isLoading && <LoaderCircle className="animate-spin text-primary" />}
           {error && <AlertTriangle className="text-destructive" />}
        </header>
        <div className="flex-grow flex items-center justify-center bg-secondary rounded-lg shadow-inner overflow-hidden">
          <VideoStreamPlayer frame={frame} detections={filteredDetections} isLoading={isLoading} error={error} />
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
