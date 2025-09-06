// Tool Imports
import { createImagesFromMetaAI } from './tools/meta.ai/create-image'
import { createImagesFromGrok } from './tools/x.com/i/grok/create-image'
import { createResponseFromAIStudioAPI } from './tools/aistudio.google.com/create-response'
import { imageGenerationCallback } from './utils/callback'

const tools: any[] = [
  {
    name: 'Gemini | aistudio.google.com',
    description: 'Creates response based on prompt',
    paramsSchema: {
      model: { type: 'string', optional: true, description: 'The model to use for the response' },
      messages: { type: 'array', description: 'The prompt to respond to' },
      callback: { type: 'any', optional: true, description: 'A callback function for streaming responses' },
    },
    callback: async (args: { model?: string; messages: any[]; callback?: any }) => {
      console.log('[Server Tool] Gemini:', args.messages)
      let responseText = await createResponseFromAIStudioAPI(args)
      return {
        content: [{ type: 'text', text: responseText }],
      }
    },
    tags: ['Text Generation', 'Gemini'],
    testTool: async (tool: { callback: (arg0: { model: string; messages: { role: string; content: string }[]; }) => any; }) => {
      let response = await tool.callback({
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: 'Hello' }],
      })
      console.log({ response })
    },
  },
  {
    name: 'Meta.ai Image Generator',
    description: 'Creates images from Meta.ai',
    paramsSchema: {
      prompt: { type: 'string', description: 'The image geneneration prompt' },
      aspectRatio: { type: 'string', description: 'Aspect ratio one of 1:1 or 9:16 or 16:9' },
    },
    callback: (args: { prompt: string; aspectRatio: string }) => imageGenerationCallback(createImagesFromMetaAI, args),
    tags: ['Image Generation', 'Meta.ai'],
  },
  {
    name: 'Grok Image Generator',
    description: 'Creates images from x.com/i/grok. Specialties: Celebrity image generation.',
    paramsSchema: { prompt: { type: 'string', description: 'The image geneneration prompt' } },
    callback: (args: { prompt: string }) => imageGenerationCallback(createImagesFromGrok, args),
    tags: ['Image Generation', 'x.com/i/grok'],
  },
]

export default tools
