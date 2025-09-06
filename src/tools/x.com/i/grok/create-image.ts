import { sendIframeMessage, waitForIframeLoading } from '../../../../utils/iframe'

interface CreateImagesFromGrokParams {
  prompt: string;
}

interface Selectors {
  loginDetector: string;
  promptInput: string;
  submitButton: string;
  imageContainer: string;
  thumbnailImageElement: string;
  regenerateButton: string;
}

export async function createImagesFromGrok({ prompt }: CreateImagesFromGrokParams): Promise<string[]> {
  prompt = 'Create an image : ' + prompt
  const selectors: Selectors = {
    loginDetector: 'a[aria-label="Profile"]',
    promptInput: 'textarea', // Actual selector for Meta AI's prompt input
    submitButton: 'button[aria-label="Grok something"]', // Actual selector for Meta AI's send/generate button
    imageContainer: 'div[style*="outline: none;"]',
    thumbnailImageElement: 'img[src*="ton.x.com"]', // Actual selector for individual thumbnail images
    regenerateButton: 'button[aria-label="Regenerate"]',
  }

  const iframe: HTMLIFrameElement = document.createElement('iframe')
  iframe.src = 'https://x.com/i/grok/'
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
    await waitForIframeLoading(iframe)
    console.log('Iframe loaded.')

    try {
      await sendIframeMessage(iframe, {
        message: 'waitForElement',
        selector: selectors.loginDetector,
        timeout: 2000,
      })
    } catch (error) {
      throw new Error('Please login to x.com')
    }

    // 1. Wait for the prompt input field to be available
    console.log('Waiting for prompt input field:', selectors.promptInput)
    await sendIframeMessage(iframe, {
      message: 'waitForElement',
      selector: selectors.promptInput,
      timeout: 20000, // Wait up to 20s for the page to fully load.
      pollInterval: 1000, // Poll every second
    })
    console.log('Prompt input field found.')

    // 2. Input the prompt
    console.log('Typing prompt:', prompt)
    await sendIframeMessage(iframe, {
      message: 'textInput',
      selector: selectors.promptInput,
      text: prompt,
    })
    console.log('Prompt typed.')

    // 3. Wait for the submit button to be available/clickable
    console.log('Waiting for submit button:', selectors.submitButton)
    await sendIframeMessage(iframe, {
      message: 'waitForElement',
      selector: selectors.submitButton,
      timeout: 10000,
    })
    console.log('Submit button found.')

    // 4. Click the submit button
    console.log('Clicking submit button.')
    await sendIframeMessage(iframe, {
      message: 'click',
      selector: selectors.submitButton,
    })
    console.log('Submit button clicked.')

    //Wait for image container
    console.log('Waiting for image container:', selectors.imageContainer)
    await sendIframeMessage(iframe, {
      message: 'waitForElement',
      selector: selectors.imageContainer,
      timeout: 10000,
    })
    console.log('Image container found.')

    //Get the DOM to identify all thumbnail containers
    console.log('Fetching DOM to identify thumbnail containers.')
    let dom: any = await sendIframeMessage(iframe, {
      message: 'getDOM',
      timeout: 10000,
    })

    let parser: DOMParser = new DOMParser()
    let iframeDoc: Document = parser.parseFromString(dom.html, 'text/html')

    //find all containers
    const imageContainers: NodeListOf<Element> = iframeDoc.querySelectorAll(selectors.imageContainer)
    console.log(`Found ${imageContainers.length} image containers.`)

    //wait for thumbnails as per number of containers
    for (let i = 0; i < imageContainers.length; i++) {
      const thumbnailSelector = `div:nth-child(${i + 1}) > ${selectors.imageContainer} ${
        selectors.thumbnailImageElement
      }`
      console.log(`Waiting for thumbnail ${i + 1} using selector: ${thumbnailSelector}`)
      await sendIframeMessage(iframe, {
        message: 'waitForElement',
        selector: thumbnailSelector,
        timeout: 60000, // Wait up to 30s for each thumbnail
      })
      console.log(`Thumbnail ${i + 1} found.`)
    }

    // Wait for the regenerate button to be available
    console.log('Waiting for regenerate button:', selectors.regenerateButton)
    await sendIframeMessage(iframe, {
      message: 'waitForElement',
      selector: selectors.regenerateButton,
      timeout: 60000,
    })
    console.log('Regenerate button found.')

    //Get the DOM to identify all thumbnails
    console.log('Fetching DOM to identify thumbnails.')
    dom = await sendIframeMessage(iframe, {
      message: 'getDOM',
      timeout: 10000,
    })

    parser = new DOMParser()
    iframeDoc = parser.parseFromString(dom.html, 'text/html')
    const thumbnailElements: NodeListOf<HTMLImageElement> = iframeDoc.querySelectorAll(selectors.thumbnailImageElement)

    console.log(`Found ${thumbnailElements.length} thumbnail image elements.`)
    const largeImageUrls: string[] = []

    for (let i = 0; i < thumbnailElements.length; i++) {
      console.log(`Processing thumbnail ${i + 1} of ${thumbnailElements.length}`)

      let currentSrc = thumbnailElements[i].src
      // Remove the trailing progress number path e.g. '/25' (upto 2 digit only) or similar if present
      const lastSlashIndex = currentSrc.lastIndexOf('/')
      if (lastSlashIndex > -1) {
        const potentialNumber = currentSrc.substring(lastSlashIndex + 1)
        if (/^\d{1,2}$/.test(potentialNumber)) {
          currentSrc = currentSrc.substring(0, lastSlashIndex)
        }
      }

      // Check if this URL (without the trailing number) is already added
      if (!largeImageUrls.includes(currentSrc)) {
        largeImageUrls.push(currentSrc)
      } else {
        console.log(`Skipping duplicate image URL: ${currentSrc}`)
      }
    }

    console.log('Extracted all large image URLs:', largeImageUrls)
    return largeImageUrls
  } catch (error: any) {
    console.error('Error in generateImagesFromMetaAI:', error.message, error.stack)
    throw error // Re-throw the error
  } finally {
    // 7. Clean up: remove the iframe
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe)
      console.log('Iframe removed.')
    }
  }
}
