import { sendIframeMessage, waitForIframeLoading } from '../../utils/iframe'
export async function getAPIKey(): Promise<string> {
  const selectors: Record<string, string> = {
    apiKeyButton: 'project-table > div > div > div.table-body > div > div.table-cell.key-cell > a', // Actual selector for Meta AI's prompt input
    apiKeyText: 'div.apikey-text',
  }

  const iframe: HTMLIFrameElement = document.createElement('iframe')
  iframe.src = 'https://aistudio.google.com/apikey'
  iframe.style.width = '1024px'
  iframe.style.height = '768px'
  iframe.style.zIndex = '-1'
  iframe.style.position = 'fixed'
  iframe.style.top = '0px'
  iframe.style.opacity = '0'
  iframe.style.border = '1px solid #ccc'
  document.body.appendChild(iframe)

  try {
    console.log('Waiting for iframe to load...')
    try {
      await waitForIframeLoading(iframe, 5000)
    } catch (error) {
      throw new Error('Please log in to aistudio.google.com & click on Get API Key. Your API Key is saved in your browser only.')
    }
    console.log('Iframe loaded.')

    console.log('Waiting for API key button', selectors.apiKeyButton)
    await sendIframeMessage(iframe, {
      message: 'waitForElement',
      selector: selectors.apiKeyButton,
      timeout: 20000, // Wait up to 20s for the page to fully load.
      pollInterval: 1000, // Poll every second
    })
    console.log('API key button found.')

    //click the API Key button
    await sendIframeMessage(iframe, {
      message: 'click',
      selector: selectors.apiKeyButton,
    })
    console.log('API key button clicked.')

    // Wait for the API key text to appear
    console.log('Waiting for API key text', selectors.apiKeyText)
    await sendIframeMessage(iframe, {
      message: 'waitForElement',
      selector: selectors.apiKeyText,
      timeout: 10000,
      pollInterval: 500,
    })
    console.log('API key text found.')

    // Get the API key text
    const dom: { html: string } = await sendIframeMessage(iframe, {
      message: 'getDOM',
      timeout: 10000,
    })

    const parser: DOMParser = new DOMParser()
    const iframeDoc: Document = parser.parseFromString(dom.html, 'text/html')
    const apiKeyElement: Element | null = iframeDoc.querySelector(selectors.apiKeyText)
    if (apiKeyElement) {
      const apiKey: string = apiKeyElement.textContent?.trim() || ''
      console.log('API Key:', apiKey)
      return apiKey
    } else {
      throw new Error('API Key element not found.')
    }
  } catch (error: unknown) {
    let errorMessage = 'An unknown error occurred.'
    if (error instanceof Error) {
      errorMessage = error.message
      console.error('Error:', error.message, error.stack)
    } else {
      console.error('Unknown error:', error)
    }
    throw new Error(`Failed to get API key: ${errorMessage}`)
  } finally {
    // 7. Clean up: remove the iframe
    if (iframe && iframe.parentNode) {
      // iframe.parentNode.removeChild(iframe)
      console.log('Iframe removed.')
    }
  }
}
