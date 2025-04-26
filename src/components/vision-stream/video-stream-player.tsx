'use client';

import * as React from 'react';
import Image from 'next/image';
import type { Frame } from '@/services/video-stream';
import type { Detection } from '@/types/detection';
import { Card, CardContent } from '@/components/ui/card';
import { LoaderCircle, VideoOff, AlertTriangle } from 'lucide-react';

interface VideoStreamPlayerProps {
  frame: Frame | null;
  detections: Detection[];
  isLoading: boolean;
  error: string | null;
}

export function VideoStreamPlayer({ frame, detections, isLoading, error }: VideoStreamPlayerProps) {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = React.useState<{ width: number; height: number } | null>(null);

  React.useEffect(() => {
    if (frame?.data) {
      const blob = new Blob([frame.data], { type: 'image/jpeg' }); // Assuming JPEG frames
      const url = URL.createObjectURL(blob);
      setImageUrl(url);

      // Clean up the previous object URL when a new frame arrives
      return () => {
        if (imageUrl) {
          URL.revokeObjectURL(imageUrl);
        }
      };
    } else {
      // Clear image if frame is null
       if (imageUrl) {
          URL.revokeObjectURL(imageUrl);
        }
      setImageUrl(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]); // Only re-run when the frame data changes

  // Update container size for scaling bounding boxes
    React.useEffect(() => {
        const resizeObserver = new ResizeObserver(entries => {
        if (entries[0]) {
            const { width, height } = entries[0].contentRect;
            setContainerSize({ width, height });
        }
        });

        if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
        }

        return () => {
        if (containerRef.current) {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            resizeObserver.unobserve(containerRef.current);
        }
        };
    }, []);


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <LoaderCircle className="w-12 h-12 animate-spin mb-2 text-primary" />
          <p>Loading video stream...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-destructive">
          <AlertTriangle className="w-12 h-12 mb-2" />
          <p>Error loading stream:</p>
           <p className="text-sm">{error}</p>
        </div>
      );
    }

    if (!imageUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <VideoOff className="w-12 h-12 mb-2" />
          <p>Video stream unavailable or paused.</p>
        </div>
      );
    }

    // Get natural dimensions of the image for scaling
    let naturalWidth = 640; // Default/fallback width
    let naturalHeight = 480; // Default/fallback height
    // In a real scenario, you'd get these from the image element once loaded.
    // For simulation, we'll use common webcam dimensions.

    const scaleX = containerSize ? containerSize.width / naturalWidth : 1;
    const scaleY = containerSize ? containerSize.height / naturalHeight : 1;


    return (
       <div ref={containerRef} className="relative w-full h-full">
        <Image
            src={imageUrl}
            alt="Live video stream"
            layout="fill"
            objectFit="contain" // Use contain to preserve aspect ratio
            priority // Load faster as it's the main content
        />
        {/* Render bounding boxes */}
        {detections.map((detection, index) => {
            const { xmin, ymin, xmax, ymax, confidence, label } = detection.bbox;
            const scaledXMin = xmin * scaleX;
            const scaledYMin = ymin * scaleY;
            const scaledWidth = (xmax - xmin) * scaleX;
            const scaledHeight = (ymax - ymin) * scaleY;

            return (
            <div
                key={index}
                className="absolute border-2 border-accent rounded shadow"
                style={{
                left: `${scaledXMin}px`,
                top: `${scaledYMin}px`,
                width: `${scaledWidth}px`,
                height: `${scaledHeight}px`,
                }}
            >
                <span className="absolute -top-5 left-0 bg-accent text-accent-foreground text-xs px-1 py-0.5 rounded-sm whitespace-nowrap">
                {label} ({Math.round(confidence * 100)}%)
                </span>
            </div>
            );
        })}
       </div>
    );
  };

  return (
    <Card className="w-full h-full overflow-hidden shadow-lg border-none bg-transparent">
      <CardContent className="p-0 h-full flex items-center justify-center">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
