
'use client';

import * as React from 'react';
// import Image from 'next/image'; // No longer using Image
// import type { Frame } from '@/services/video-stream'; // No longer using Frame type
// import type { Detection } from '@/types/detection'; // No longer using Detection type
import { Card, CardContent } from '@/components/ui/card';
import { LoaderCircle, VideoOff, CameraOff } from 'lucide-react';

interface VideoStreamPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isLoading: boolean;
  hasPermission: boolean | undefined;
  // Detections are removed as they were tied to simulation
  // frame: Frame | null;
  // detections: Detection[];
  // error: string | null; // Error handling moved to parent page
}

export function VideoStreamPlayer({ videoRef, isLoading, hasPermission }: VideoStreamPlayerProps) {

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <LoaderCircle className="w-12 h-12 animate-spin mb-2 text-primary" />
          <p>Connecting to camera...</p>
        </div>
      );
    }

    if (hasPermission === false) {
        // Parent component shows detailed alert, this is just placeholder content
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <CameraOff className="w-12 h-12 mb-2" />
          <p>Camera access denied.</p>
        </div>
      );
    }

     if (hasPermission === undefined) {
       // Waiting for permission result, show loading or placeholder
        return (
         <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
           <LoaderCircle className="w-12 h-12 animate-spin mb-2 text-primary" />
           <p>Checking permissions...</p>
         </div>
       );
     }

    // If permission is granted, the video tag below will be used.
    // We don't return anything here explicitly, letting the video tag render.
    // Add a fallback message in case the stream fails silently after permission.
     if (hasPermission === true && videoRef.current && !videoRef.current.srcObject && !isLoading) {
        return (
             <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                 <VideoOff className="w-12 h-12 mb-2" />
                 <p>Video stream not available.</p>
             </div>
         );
     }

    return null; // Let the video tag handle rendering
  };

  return (
    <Card className="w-full h-full overflow-hidden shadow-lg border-none bg-transparent flex items-center justify-center">
      <CardContent className="p-0 w-full h-full flex items-center justify-center">
        {/* Render placeholder/loading/error content */}
        {renderContent()}
        {/* Always render the video tag to attach the ref, hide if no permission or loading */}
        <video
          ref={videoRef}
          className={`w-full h-full object-contain rounded-md ${hasPermission !== true || isLoading ? 'hidden' : ''}`} // Use object-contain, hide if no permission/loading
          autoPlay
          muted // Mute is often required for autoplay to work
          playsInline // Important for mobile browsers
        />
      </CardContent>
    </Card>
  );
}
