/**
 * Generates optimized image attributes for better performance and SEO
 * @param {string} src - Image source path
 * @param {string} alt - Alt text for the image
 * @param {Object} options - Additional options
 * @param {string} [options.className] - CSS class names
 * @param {string} [options.sizes] - Sizes attribute for responsive images
 * @param {string} [options.loading] - Loading attribute ('lazy' or 'eager')
 * @returns {Object} - Object containing image attributes
 */
export const getOptimizedImageProps = (src, alt, { className = '', sizes = '100vw', loading = 'lazy' } = {}) => {
  // Ensure alt text is provided for better accessibility
  if (!alt) {
    console.warn('Image is missing alt text:', src);
  }

  // Check if the image is from an external source
  const isExternal = src.startsWith('http');
  
  // For local images, you could add WebP conversion logic here
  // For now, we'll just use the original source
  
  return {
    src,
    alt: alt || '',
    loading,
    className,
    sizes,
    // Add decoding async for better performance
    decoding: 'async',
    // Add fetchpriority for above-the-fold images
    ...(loading === 'eager' && { fetchpriority: 'high' }),
  };
};

/**
 * Generates a responsive image srcSet string
 * @param {string} baseUrl - Base image URL
 * @param {number[]} widths - Array of image widths to generate
 * @returns {string} - Formatted srcSet string
 */
export const generateSrcSet = (baseUrl, widths = [320, 480, 768, 1024, 1366, 1600, 1920]) => {
  return widths
    .map(width => {
      // For external URLs, you might need to use a different approach
      if (baseUrl.startsWith('http')) {
        return `${baseUrl} ${width}w`;
      }
      // For local images, you could append width parameters if your image CDN supports it
      return `${baseUrl}?width=${width} ${width}w`;
    })
    .join(', ');
};
