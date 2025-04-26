
import type { DetectedObject as CocoDetectedObject } from '@tensorflow-models/coco-ssd';

// Define the specific class labels that COCO-SSD can detect
export type CocoSSDClassLabel =
  | "person" | "bicycle" | "car" | "motorcycle" | "airplane" | "bus" | "train" | "truck" | "boat"
  | "traffic light" | "fire hydrant" | "stop sign" | "parking meter" | "bench" | "bird" | "cat"
  | "dog" | "horse" | "sheep" | "cow" | "elephant" | "bear" | "zebra" | "giraffe" | "backpack"
  | "umbrella" | "handbag" | "tie" | "suitcase" | "frisbee" | "skis" | "snowboard" | "sports ball"
  | "kite" | "baseball bat" | "baseball glove" | "skateboard" | "surfboard" | "tennis racket"
  | "bottle" | "wine glass" | "cup" | "fork" | "knife" | "spoon" | "bowl" | "banana" | "apple"
  | "sandwich" | "orange" | "broccoli" | "carrot" | "hot dog" | "pizza" | "donut" | "cake" | "chair"
  | "couch" | "potted plant" | "bed" | "dining table" | "toilet" | "tv" | "laptop" | "mouse"
  | "remote" | "keyboard" | "cell phone" | "microwave" | "oven" | "toaster" | "sink"
  | "refrigerator" | "book" | "clock" | "vase" | "scissors" | "teddy bear" | "hair drier"
  | "toothbrush";


// You can keep the original Detection interface if needed for other purposes,
// or rely on the imported DetectedObject type directly from @tensorflow-models/coco-ssd.
// Using the imported type directly is often simpler.

// Example of using the imported type:
// import type { DetectedObject } from '@tensorflow-models/coco-ssd';
// const myDetection: DetectedObject = { ... };

// If you need a custom structure, you can redefine it:
export interface Detection {
  bbox: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
    confidence: number;
    label: CocoSSDClassLabel; // Use the specific type here
  };
  timestamp: number;
}

// Re-exporting the type from the model library for convenience
export type { CocoDetectedObject };
