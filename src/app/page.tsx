
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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { VideoStreamPlayer } from '@/components/vision-stream/video-stream-player';
import { ObjectDetectionControls } from '@/components/vision-stream/object-detection-controls';
// import { useSimulatedStream } from '@/hooks/use-simulated-stream'; // Removed simulation
// import { summarizeObjects } from '@/ai/flows/summarize-objects'; // Removed AI features
// import { suggestDetectionFilters } from '@/ai/flows/suggest-detection-filters'; // Removed AI features
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Camera, AlertTriangle, Video } from 'lucide-react';

export default function VisionStreamPage() {
  // const { frame, detections, isLoading, error, availableClasses } = useSimulatedStream(); // Removed simulation
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | undefined>(undefined);
  const [isStreamLoading, setIsStreamLoading] = React.useState(true);
  const { toast } = useToast();

  // State for controls - keep simple for now
  const [filteredClasses, setFilteredClasses] = React.useState<string[]>([]);
  const availableClasses = ["person", "car", "bicycle", "dog", "cat", "traffic light", "backpack", "handbag"]; // Example classes, detection not implemented yet

  React.useEffect(() => {
    const getCameraPermission = async () => {
      setIsStreamLoading(true);
      setHasCameraPermission(undefined); // Reset while checking
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
             setIsStreamLoading(false); // Stop loading once video metadata is loaded
             videoRef.current?.play().catch(playError => {
                console.error("Error trying to play video:", playError);
                // Attempt to play might fail due to autoplay policies, user interaction might be needed
                 toast({
                  variant: 'destructive',
                  title: 'Playback Error',
                  description: 'Could not automatically play the video stream.',
                });
             });
          };
        } else {
            // If videoRef is not ready yet, stop the stream to avoid leaks
            stream.getTracks().forEach(track => track.stop());
            throw new Error("Video element not ready.");
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        setIsStreamLoading(false); // Stop loading on error
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
      }
    };

    getCameraPermission();

    // Cleanup function to stop the stream when component unmounts
    return () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    }
  }, [toast]);


  const handleFilterChange = (selected: string[]) => {
    // Filtering logic will need to be adapted when real detection is added
    setFilteredClasses(selected);
    console.log("Filters changed (detection not implemented yet):", selected);
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                 <Camera className="text-sidebar-foreground" />
                 <h1 className="text-xl font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                    VisionStream
                 </h1>
            </div>
           <div className="text-sm text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden pl-8">
             Live Camera Feed
           </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
             <SidebarGroupLabel>Controls</SidebarGroupLabel>
             <SidebarGroupContent>
               <ObjectDetectionControls
                 availableClasses={availableClasses} // Using example classes for now
                 selectedClasses={filteredClasses}
                 onFilterChange={handleFilterChange}
                 // Removed AI props
                 // summary={null}
                 // suggestedFilters={[]}
                 // isSummaryLoading={false}
                 // isSuggestionLoading={false}
                 // aiError={null}
               />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4 text-sidebar-foreground/70 text-xs group-data-[collapsible=icon]:hidden">
          Using Live Camera Input
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col p-4">
        <header className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2">
             <SidebarTrigger className="md:hidden" />
             <h2 className="text-2xl font-semibold">Live Feed</h2>
           </div>
            {hasCameraPermission === false && <AlertTriangle className="text-destructive" />}
        </header>

         {/* Always render video container to attach ref */}
        <div className="flex-grow flex flex-col items-center justify-center bg-secondary rounded-lg shadow-inner overflow-hidden p-1">
            <VideoStreamPlayer videoRef={videoRef} isLoading={isStreamLoading} hasPermission={hasCameraPermission} />
            {hasCameraPermission === false && (
                 <Alert variant="destructive" className="mt-4 w-full max-w-md">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Camera Access Required</AlertTitle>
                  <AlertDescription>
                    Camera access was denied or is unavailable. Please check your browser settings and ensure a camera is connected.
                  </AlertDescription>
                </Alert>
            )}
             {hasCameraPermission === undefined && !isStreamLoading && ( // Case where permission check might be stuck/pending without loading state
                 <Alert className="mt-4 w-full max-w-md">
                   <Video className="h-4 w-4" />
                  <AlertTitle>Checking Camera Access</AlertTitle>
                  <AlertDescription>
                    Attempting to access your camera...
                  </AlertDescription>
                </Alert>
            )}
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
