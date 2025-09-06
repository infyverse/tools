import { openDB } from 'idb'
import { getAPIKey } from './get-api-key'
import type { IDBPDatabase } from 'idb'

// This is the correct format for OpenAI compatible multimodal messages
interface ChatMessagePart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
  }
}

interface ChatMessage {
  role: 'user' | 'model' | 'system'
  content: string | ChatMessagePart[]
}

interface CreateResponseParams {
  model?: string
  messages: ChatMessage[]
  callback?: (message: string) => void
}

// Define the database schema for better type safety with idb
interface MyDB {
  'api-keys': {
    key: string
    value: string
  }
}

const dbPromise = openDB<MyDB>('i/chat/api-keys', 1, {
  upgrade(db: IDBPDatabase<MyDB>) {
    if (!db.objectStoreNames.contains('api-keys')) {
      db.createObjectStore('api-keys')
    }
  },
})

export const createResponseFromAIStudioAPI = async ({
  model,
  messages,
  callback,
}: CreateResponseParams): Promise<string> => {
  const db = await dbPromise
  let apiKey: string | undefined = await db.get('api-keys', 'aistudio.google.com')

  if (!apiKey) {
    apiKey = await getAPIKey()
    //save apiKey
    await db.put('api-keys', apiKey, 'aistudio.google.com')
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gemini-2.5-flash',
        messages: messages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('API Error:', errorData)
      throw new Error(
        `API request failed with status ${response.status}: ${errorData?.error?.message}`
      )
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let result = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6).trim()
          if (jsonStr === '[DONE]') {
            return result
          }
          try {
            const chunk = JSON.parse(jsonStr)
            if (chunk.choices && chunk.choices[0].delta && chunk.choices[0].delta.content) {
              const content = chunk.choices[0].delta.content
              result += content
              if (callback) {
                callback(result)
              }
            }
          } catch (e) {
            console.error('Failed to parse chunk:', jsonStr)
          }
        }
      }
    }

    return result
  } catch (error: unknown) {
    // Catch error as unknown and narrow its type
    if (error instanceof Error) {
      console.error('Failed to fetch from AI Studio API:', error)
    } else {
      console.error('An unknown error occurred:', error)
    }
    throw error // Re-throw the error for the caller to handle
  }
}
