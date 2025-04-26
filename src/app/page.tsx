
'use client';

import * as React from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import type { DetectedObject } from '@tensorflow-models/coco-ssd';
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Camera, AlertTriangle, Video, BrainCircuit, LoaderCircle } from 'lucide-react';
import type { CocoSSDClassLabel } from '@/types/detection'; // Import the type

// Define the list of classes COCO-SSD can detect
const COCO_SSD_CLASSES: CocoSSDClassLabel[] = [
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
  "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
  "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
  "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
  "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
  "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
  "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair",
  "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
  "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
  "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
];


export default function VisionStreamPage() {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null); // Ref for drawing canvas
  const detectionIntervalRef = React.useRef<NodeJS.Timeout | null>(null); // Ref for detection interval
  const requestRef = React.useRef<number>(); // Ref for animation frame

  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | undefined>(undefined);
  const [isStreamLoading, setIsStreamLoading] = React.useState(true);
  const [model, setModel] = React.useState<cocoSsd.ObjectDetection | null>(null);
  const [isModelLoading, setIsModelLoading] = React.useState(true);
  const [detections, setDetections] = React.useState<DetectedObject[]>([]);
  const [filteredClasses, setFilteredClasses] = React.useState<string[]>(COCO_SSD_CLASSES); // Default to all classes initially
  const { toast } = useToast();

  // Load TensorFlow.js model
  React.useEffect(() => {
    const loadModel = async () => {
      setIsModelLoading(true);
      try {
        // Set TF backend and flags
        await tf.setBackend('webgl'); // Or 'wasm' or 'cpu'
        await tf.ready();
        const loadedModel = await cocoSsd.load();
        setModel(loadedModel);
        setIsModelLoading(false);
        console.log('COCO-SSD model loaded successfully.');
        toast({
            title: "Object Detection Ready",
            description: "The COCO-SSD model has loaded.",
        });
      } catch (error) {
        console.error('Error loading COCO-SSD model:', error);
        setIsModelLoading(false);
        toast({
          variant: 'destructive',
          title: 'Model Load Failed',
          description: 'Could not load the object detection model.',
        });
      }
    };
    loadModel();
  }, [toast]);

  // Get camera permission and setup stream
  React.useEffect(() => {
    const getCameraPermission = async () => {
      setIsStreamLoading(true);
      setHasCameraPermission(undefined);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsStreamLoading(false);
            videoRef.current?.play().catch(playError => {
              console.error("Error trying to play video:", playError);
              toast({
                variant: 'destructive',
                title: 'Playback Error',
                description: 'Could not automatically play the video stream.',
              });
            });
          };
        } else {
          stream.getTracks().forEach(track => track.stop());
          throw new Error("Video element not ready.");
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        setIsStreamLoading(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
      }
    };

    getCameraPermission();

    return () => {
        stopDetectionLoop(); // Stop detection loop on unmount
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        if (requestRef.current) {
             cancelAnimationFrame(requestRef.current);
        }
    }
  }, [toast]);


  // Object Detection Loop
  const runDetection = async () => {
    if (
      model &&
      videoRef.current &&
      videoRef.current.readyState === 4 // Ensure video is ready
    ) {
      try {
        const newDetections = await model.detect(videoRef.current);
        setDetections(newDetections);
        // console.log('Detections:', newDetections); // Log detections - can be noisy
      } catch (error) {
        console.error("Error during detection:", error);
        // Optional: Show a toast or error message for detection failures
      }
    }
    // Request next frame immediately for smooth animation, detection runs within this loop
    requestRef.current = requestAnimationFrame(runDetection);
  };


  // Start/Stop detection loop based on dependencies
  React.useEffect(() => {
    if (model && !isModelLoading && hasCameraPermission && !isStreamLoading && videoRef.current) {
        startDetectionLoop();
    } else {
        stopDetectionLoop();
    }

    // Cleanup function for when dependencies change
    return () => {
        stopDetectionLoop();
    };
  }, [model, isModelLoading, hasCameraPermission, isStreamLoading]);

  const startDetectionLoop = () => {
      stopDetectionLoop(); // Ensure no duplicate loops
      console.log("Starting detection loop...");
      requestRef.current = requestAnimationFrame(runDetection);
  };

  const stopDetectionLoop = () => {
      if (requestRef.current) {
          console.log("Stopping detection loop...");
          cancelAnimationFrame(requestRef.current);
          requestRef.current = undefined; // Reset ref
          setDetections([]); // Clear detections when stopping
      }
  };

  const handleFilterChange = (selected: string[]) => {
    setFilteredClasses(selected);
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
             Live Object Detection
           </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
             <SidebarGroupLabel>Controls</SidebarGroupLabel>
             <SidebarGroupContent>
               <ObjectDetectionControls
                 availableClasses={COCO_SSD_CLASSES} // Use actual classes from model
                 selectedClasses={filteredClasses}
                 onFilterChange={handleFilterChange}
                 isModelLoading={isModelLoading}
               />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4 text-sidebar-foreground/70 text-xs group-data-[collapsible=icon]:hidden">
          Using TensorFlow.js (COCO-SSD)
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col p-4">
        <header className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2">
             <SidebarTrigger className="md:hidden" />
             <h2 className="text-2xl font-semibold">Live Feed & Detection</h2>
           </div>
            {hasCameraPermission === false && <AlertTriangle className="text-destructive" />}
             {isModelLoading && <LoaderCircle className="w-5 h-5 animate-spin text-primary" />}
             {!isModelLoading && model && <BrainCircuit className="w-5 h-5 text-accent" />}
        </header>

        <div className="flex-grow flex flex-col items-center justify-center bg-secondary rounded-lg shadow-inner overflow-hidden p-1 relative">
            {/* Video Stream Player handles video display and loading/permission states */}
            <VideoStreamPlayer
              videoRef={videoRef}
              canvasRef={canvasRef} // Pass canvas ref
              isLoading={isStreamLoading || isModelLoading} // Consider model loading too
              hasPermission={hasCameraPermission}
              detections={detections} // Pass detections
              filteredClasses={filteredClasses} // Pass filters
             />
            {/* Error/Status Alerts */}
            {hasCameraPermission === false && (
                 <Alert variant="destructive" className="mt-4 w-full max-w-md absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Camera Access Required</AlertTitle>
                  <AlertDescription>
                    Camera access was denied or is unavailable. Please check browser settings.
                  </AlertDescription>
                </Alert>
            )}
             {hasCameraPermission === undefined && !isStreamLoading && (
                 <Alert className="mt-4 w-full max-w-md absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                   <Video className="h-4 w-4" />
                  <AlertTitle>Checking Camera Access</AlertTitle>
                  <AlertDescription>
                    Attempting to access your camera...
                  </AlertDescription>
                </Alert>
            )}
             {isModelLoading && hasCameraPermission === true && (
                 <Alert className="mt-4 w-full max-w-md absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                   <LoaderCircle className="h-4 w-4 animate-spin" />
                   <AlertTitle>Loading Model</AlertTitle>
                   <AlertDescription>
                     The object detection model is loading...
                   </AlertDescription>
                 </Alert>
             )}
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
