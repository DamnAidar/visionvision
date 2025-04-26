'use server';
/**
 * @fileOverview Suggests relevant object detection filters based on detected objects in a video frame.
 *
 * - suggestDetectionFilters - A function that suggests object detection filters.
 * - SuggestDetectionFiltersInput - The input type for the suggestDetectionFilters function.
 * - SuggestDetectionFiltersOutput - The return type for the suggestDetectionFilters function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SuggestDetectionFiltersInputSchema = z.object({
  detectedObjects: z
    .array(z.string())
    .describe('List of detected objects in the video frame.'),
});
export type SuggestDetectionFiltersInput = z.infer<typeof SuggestDetectionFiltersInputSchema>;

const SuggestDetectionFiltersOutputSchema = z.object({
  suggestedFilters: z
    .array(z.string())
    .describe('Suggested object detection filters based on detected objects.'),
});
export type SuggestDetectionFiltersOutput = z.infer<typeof SuggestDetectionFiltersOutputSchema>;

export async function suggestDetectionFilters(
  input: SuggestDetectionFiltersInput
): Promise<SuggestDetectionFiltersOutput> {
  return suggestDetectionFiltersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDetectionFiltersPrompt',
  input: {
    schema: z.object({
      detectedObjects: z
        .array(z.string())
        .describe('List of detected objects in the video frame.'),
    }),
  },
  output: {
    schema: z.object({
      suggestedFilters: z
        .array(z.string())
        .describe('Suggested object detection filters based on detected objects.'),
    }),
  },
  prompt: `You are an expert in video analytics and object detection.

  Based on the detected objects in the video frame, suggest relevant object detection filters to focus on the most important objects.

  Detected Objects: {{detectedObjects}}

  Consider the context of a typical video surveillance system. Prioritize filters that would be most useful for security or monitoring purposes.

  Return a JSON array of strings representing the suggested filters.
  `,
});

const suggestDetectionFiltersFlow = ai.defineFlow<
  typeof SuggestDetectionFiltersInputSchema,
  typeof SuggestDetectionFiltersOutputSchema
>(
  {
    name: 'suggestDetectionFiltersFlow',
    inputSchema: SuggestDetectionFiltersInputSchema,
    outputSchema: SuggestDetectionFiltersOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

