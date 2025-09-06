export async function imageGenerationCallback(
  imageCreationFunc: (args: any) => Promise<string | string[]>,
  args: any
) {
  console.log('[Server Tool] Image Generator:', args.prompt)
  const imageResults = await imageCreationFunc(args)

  let imageUrlsText = ''
  if (typeof imageResults === 'string' && imageResults.startsWith('http')) {
    imageUrlsText = imageResults
  } else if (Array.isArray(imageResults) && imageResults.length > 0) {
    imageUrlsText = imageResults
      .filter((url) => typeof url === 'string' && url.startsWith('http'))
      .join(' ')
  }

  let responseText = 'Here are the images you requested:';
  if (imageUrlsText) {
    responseText += ` ${imageUrlsText}`;
  } else {
    responseText = "I tried to generate images, but couldn't retrieve any.";
  }

  return {
    content: [{ type: 'text', text: responseText }],
  };
}
