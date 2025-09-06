export const waitForIframeLoading = (
  iframe: HTMLIFrameElement,
  timeout: number = 15000
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handleMessage)
      reject(new Error(`Timeout waiting for iframe content to load after ${timeout}ms`))
    }, timeout)

    const handleMessage = (event: MessageEvent) => {
      console.log('Received message from iframe:', event.data)
      // Check origin for security if the iframe is on a different domain
      if (!iframe.src.includes(event.origin)) return

      if (event.data && event.data.type === 'iframeContentLoaded') {
        clearTimeout(timer)
        console.log('Iframe content loaded message received.')
        window.removeEventListener('message', handleMessage)
        resolve()
      }
    }

    window.addEventListener('message', handleMessage)
    console.log('Waiting for iframe content loaded message...')
  })
}

interface IframeMessageData {
  message: string
  selector?: string
  timeout?: number
  [key: string]: any
}

// Helper to send message and await response using MessageChannel
export async function sendIframeMessage(
  iframe: HTMLIFrameElement,
  messageData: IframeMessageData
): Promise<any> {
  console.log('Sending message to iframe:', messageData.message, messageData.selector || '')
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = (event: MessageEvent) => {
      console.log('Received response from iframe:', event.data)
      if (event.data && event.data.success === false) {
        reject(new Error(event.data.error || `Iframe operation '${messageData.message}' failed.`))
      } else {
        resolve(event.data)
      }
      channel.port1.close()
    }
    channel.port1.onmessageerror = (event: MessageEvent) => {
      reject(new Error('Message error with iframe: ' + JSON.stringify(event)))
      channel.port1.close()
    }

    if (!iframe.contentWindow) {
      reject(new Error('Iframe contentWindow is not available. Cannot send message.'))
      return
    }
    // Ensure targetOrigin is specific for security, derived from the iframe's actual src
    const targetOrigin = new URL(iframe.src).origin
    iframe.contentWindow.postMessage(messageData, targetOrigin, [channel.port2])

    const timeoutDuration = messageData.timeout || 30000 // Default 30s, allow override
    setTimeout(() => {
      reject(
        new Error(
          `Timeout (${timeoutDuration}ms) waiting for response to message: ${messageData.message}`
        )
      )
      try {
        channel.port1.close()
      } catch (e) {
        /* ignore */
      }
    }, timeoutDuration)
  })
}
