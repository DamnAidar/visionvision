'use server';
/**
 * @fileOverview Summarizes the objects detected in a video stream at regular intervals.
 *
 * - summarizeObjects - A function that takes detected object data and returns a summary of the scene.
 * - SummarizeObjectsInput - The input type for the summarizeObjects function.
 * - SummarizeObjectsOutput - The return type for the summarizeObjects function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SummarizeObjectsInputSchema = z.object({
  objectList: z
    .array(z.string())
    .describe('A list of objects detected in the video frame.'),
  timestamp: z.number().describe('The timestamp of the video frame.'),
});
export type SummarizeObjectsInput = z.infer<typeof SummarizeObjectsInputSchema>;

const SummarizeObjectsOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the objects detected.'),
});
export type SummarizeObjectsOutput = z.infer<typeof SummarizeObjectsOutputSchema>;

export async function summarizeObjects(input: SummarizeObjectsInput): Promise<SummarizeObjectsOutput> {
  return summarizeObjectsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeObjectsPrompt',
  input: {
    schema: z.object({
      objectList: z
        .array(z.string())
        .describe('A list of objects detected in the video frame.'),
      timestamp: z.number().describe('The timestamp of the video frame.'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('A concise summary of the objects detected.'),
    }),
  },
  prompt: `You are an AI expert in video analysis. Given the following list of objects detected at {{timestamp}}, generate a concise one-sentence summary of the scene.\n\nObjects: {{{objectList}}}`,
});

const summarizeObjectsFlow = ai.defineFlow<
  typeof SummarizeObjectsInputSchema,
  typeof SummarizeObjectsOutputSchema
>(
  {
    name: 'summarizeObjectsFlow',
    inputSchema: SummarizeObjectsInputSchema,
    outputSchema: SummarizeObjectsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
