'use client';

import * as React from 'react';
import type { Frame } from '@/services/video-stream';
import type { Detection } from '@/types/detection';
import { useToast } from '@/hooks/use-toast';

// Simulated data
const availableObjectClasses = ["person", "car", "bicycle", "dog", "cat", "traffic light", "backpack", "handbag"];
const imageWidth = 640;
const imageHeight = 480;

function generateRandomDetections(count: number): Detection[] {
  const detections: Detection[] = [];
  const timestamp = Date.now();
  const usedClasses = new Set<string>();

  for (let i = 0; i < count; i++) {
    let label = availableObjectClasses[Math.floor(Math.random() * availableObjectClasses.length)];
    // Ensure some variety, avoid too many duplicates in one frame if possible
    let attempts = 0;
    while (usedClasses.has(label) && attempts < 5 && usedClasses.size < availableObjectClasses.length) {
        label = availableObjectClasses[Math.floor(Math.random() * availableObjectClasses.length)];
        attempts++;
    }
    usedClasses.add(label);

    const confidence = Math.random() * 0.5 + 0.4; // Confidence between 0.4 and 0.9
    const w = Math.random() * (imageWidth / 4) + (imageWidth / 10); // Width between 10% and 25% of image width
    const h = Math.random() * (imageHeight / 4) + (imageHeight / 10); // Height between 10% and 25% of image height
    const xmin = Math.random() * (imageWidth - w);
    const ymin = Math.random() * (imageHeight - h);
    const xmax = xmin + w;
    const ymax = ymin + h;

    detections.push({
      bbox: { xmin, ymin, xmax, ymax, confidence, label },
      timestamp,
    });
  }
  return detections;
}

// Simple buffer representing a placeholder image (e.g., a gray square)
// In a real app, this would come from the video stream service.
function generatePlaceholderFrameData(): Buffer {
    // Create a very simple representation. A real frame would be more complex.
    // This is just to satisfy the type requirement.
    const pixelData = new Uint8Array([128, 128, 128, 255]); // R, G, B, A (Gray)
    return Buffer.from(pixelData);
}


export function useSimulatedStream(intervalMs = 1000) { // Update every second
  const [frame, setFrame] = React.useState<Frame | null>(null);
  const [detections, setDetections] = React.useState<Detection[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [availableClasses, setAvailableClasses] = React.useState<string[]>([]);
  const previousDetectionCount = React.useRef<number>(0);
  const { toast } = useToast();

  React.useEffect(() => {
    setIsLoading(true); // Start in loading state
    setError(null);

    // Simulate initial delay or connection time
    const initialTimeout = setTimeout(() => {
        setIsLoading(false);
        const initialFrame: Frame = { data: generatePlaceholderFrameData(), timestamp: Date.now() };
        const initialDetections = generateRandomDetections(Math.floor(Math.random() * 4) + 1); // 1 to 4 objects initially
        setFrame(initialFrame);
        setDetections(initialDetections);
        previousDetectionCount.current = initialDetections.length;

        // Update available classes based on initial detections
        const uniqueClasses = Array.from(new Set(initialDetections.map(d => d.label)));
        setAvailableClasses(prev => Array.from(new Set([...prev, ...uniqueClasses])));


    }, 1500); // Simulate 1.5 second connection time


    const intervalId = setInterval(() => {
      // Simulate potential errors
      if (Math.random() < 0.02) { // 2% chance of error
        setError("Simulated stream connection lost.");
        clearInterval(intervalId); // Stop simulation on error
         toast({
          title: "Stream Error",
          description: "Simulated stream connection lost.",
          variant: "destructive",
        });
        return;
      }

      const newFrame: Frame = { data: generatePlaceholderFrameData(), timestamp: Date.now() };
      // Randomly change the number of detections slightly
      let newDetectionCount = previousDetectionCount.current + Math.floor(Math.random() * 3) - 1; // Change by -1, 0, or 1
      newDetectionCount = Math.max(0, Math.min(newDetectionCount, availableObjectClasses.length, 7)); // Clamp between 0 and 7 (or available classes)

      const newDetections = generateRandomDetections(newDetectionCount);

      setFrame(newFrame);
      setDetections(newDetections);

       // Update available classes based on new detections
      const uniqueClasses = Array.from(new Set(newDetections.map(d => d.label)));
      setAvailableClasses(prev => Array.from(new Set([...prev, ...uniqueClasses])));

      // Trigger toast if object count changes (Simulating frame saving trigger)
      if (newDetectionCount !== previousDetectionCount.current) {
        console.log(`Object count changed from ${previousDetectionCount.current} to ${newDetectionCount}. Frame 'saved'.`);
        toast({
          title: "Object Count Changed",
          description: `Detected objects changed from ${previousDetectionCount.current} to ${newDetectionCount}. Frame saved (simulated).`,
        });
        previousDetectionCount.current = newDetectionCount;
      }


    }, intervalMs);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
      // Clean up frame buffer if necessary (though createObjectURL handles this)
    };
  }, [intervalMs, toast]);

  return { frame, detections, isLoading, error, availableClasses };
}

