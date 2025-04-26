export interface Detection {
  bbox: {
    xmin: number; // Top-left x coordinate (normalized 0-1 or pixel value)
    ymin: number; // Top-left y coordinate (normalized 0-1 or pixel value)
    xmax: number; // Bottom-right x coordinate (normalized 0-1 or pixel value)
    ymax: number; // Bottom-right y coordinate (normalized 0-1 or pixel value)
    confidence: number; // Detection confidence score (0-1)
    label: string; // Detected object class name
  };
  timestamp: number; // Timestamp of the frame when detection occurred
}
