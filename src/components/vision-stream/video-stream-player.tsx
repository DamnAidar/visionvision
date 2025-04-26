
'use client';

import * as React from 'react';
import type { DetectedObject } from '@tensorflow-models/coco-ssd';
import { Card, CardContent } from '@/components/ui/card';
import { LoaderCircle, VideoOff, CameraOff } from 'lucide-react';

interface VideoStreamPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>; // Add canvas ref
  isLoading: boolean;
  hasPermission: boolean | undefined;
  detections: DetectedObject[]; // Receive detections
  filteredClasses: string[]; // Receive filtered classes
}

export function VideoStreamPlayer({
  videoRef,
  canvasRef, // Use canvas ref
  isLoading,
  hasPermission,
  detections, // Use detections
  filteredClasses, // Use filtered classes
}: VideoStreamPlayerProps) {

  // Draw detections on canvas
  React.useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && detections.length > 0 && hasPermission === true && !isLoading) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas dimensions to match video display size
      // Important: use video's intrinsic dimensions scaled to fit container if needed,
      // or match the video element's clientWidth/clientHeight for simplicity if it fills the container.
      canvas.width = video.clientWidth; // Use clientWidth for displayed size
      canvas.height = video.clientHeight;

      // Clear previous drawings
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Filter detections based on selected classes
      const filteredDetections = detections.filter(detection =>
        filteredClasses.includes(detection.class)
      );

      // Draw new detections
      filteredDetections.forEach(detection => {
        const [x, y, width, height] = detection.bbox;
        const score = Math.round(detection.score * 100);
        const label = detection.class;

        // Scale bounding box coordinates based on video vs canvas size difference
        // (if video's natural size differs from displayed size)
        const scaleX = canvas.width / video.videoWidth;
        const scaleY = canvas.height / video.videoHeight;

        const scaledX = x * scaleX;
        const scaledY = y * scaleY;
        const scaledWidth = width * scaleX;
        const scaledHeight = height * scaleY;

        // Draw the bounding box
        ctx.strokeStyle = '#0D47A1'; // Use primary color (Dark Blue)
        ctx.lineWidth = 2;
        ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

        // Draw the label background
        ctx.fillStyle = '#0D47A1';
        const textWidth = ctx.measureText(`${label} (${score}%)`).width;
        const textHeight = 16; // Approx height based on font size
        ctx.fillRect(scaledX, scaledY > textHeight ? scaledY - textHeight : scaledY, textWidth + 4, textHeight); // Adjust y position to stay within bounds

        // Draw the label text
        ctx.fillStyle = '#FFFFFF'; // White text
        ctx.font = '12px Arial';
        ctx.fillText(`${label} (${score}%)`, scaledX + 2, scaledY > textHeight ? scaledY - 4 : scaledY + 10); // Adjust y position
      });
    } else if (canvas) {
        // Clear canvas if no detections or video not ready
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
  }, [detections, filteredClasses, videoRef, canvasRef, hasPermission, isLoading]); // Add dependencies

  const renderPlaceholderContent = () => {
    if (isLoading) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center h-full text-muted-foreground bg-secondary/80 z-10">
          <LoaderCircle className="w-12 h-12 animate-spin mb-2 text-primary" />
          <p>Loading camera and model...</p>
        </div>
      );
    }

    if (hasPermission === false) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center h-full text-muted-foreground bg-secondary/80 z-10">
          <CameraOff className="w-12 h-12 mb-2" />
          <p>Camera access denied.</p>
        </div>
      );
    }

    if (hasPermission === undefined) {
       return (
         <div className="absolute inset-0 flex flex-col items-center justify-center h-full text-muted-foreground bg-secondary/80 z-10">
           <LoaderCircle className="w-12 h-12 animate-spin mb-2 text-primary" />
           <p>Checking permissions...</p>
         </div>
       );
     }

     if (hasPermission === true && videoRef.current && !videoRef.current.srcObject && !isLoading) {
        return (
             <div className="absolute inset-0 flex flex-col items-center justify-center h-full text-muted-foreground bg-secondary/80 z-10">
                 <VideoOff className="w-12 h-12 mb-2" />
                 <p>Video stream not available.</p>
             </div>
         );
     }

    return null; // No placeholder needed if video is ready
  };

  return (
    // Use relative positioning for the container Card
    <Card className="relative w-full h-full overflow-hidden shadow-lg border-none bg-transparent flex items-center justify-center">
      <CardContent className="p-0 w-full h-full flex items-center justify-center">
        {/* Render placeholder/loading/error content on top */}
        {renderPlaceholderContent()}

        {/* Video Element */}
        <video
          ref={videoRef}
          className={`block w-full h-full object-contain ${hasPermission !== true || isLoading ? 'invisible' : ''}`} // Use invisible to keep layout stable
          autoPlay
          muted
          playsInline
        />

        {/* Canvas Element - Positioned absolutely on top of the video */}
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-none z-5" // Position canvas over the video
            // Width and height are set dynamically in useEffect
        />
      </CardContent>
    </Card>
  );
}
