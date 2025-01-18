/**
 * Batch URL Screenshot Tool
 * 
 * This script takes screenshots of multiple web pages specified in a text file.
 * It supports customizable viewport dimensions, filename options, and includes
 * features like URL processing delays and filename length trimming.
 * 
 * Usage:
 * node script.js -s urls.txt [-w width] [-h height] [-n name] [-t trim] [-d delay]
 * 
 * @author Nazar Hotsa
 * @version 0.1
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ============================================================================
// Command Line Arguments Configuration
// ============================================================================

const { argv } = require('yargs/yargs')(process.argv.slice(2))
  .option('source', {
    alias: 's',
    describe: 'Path to the file containing the list of URLs',
    demandOption: true,
    type: 'string'
  })
  .option('name', {
    alias: 'n',
    describe: 'Filename option (title or url)',
    choices: ['title', 'url'],
    default: 'title'
  })
  .option('width', {
    alias: 'w',
    describe: 'Viewport width',
    type: 'number',
    default: 1024
  })
  .option('height', {
    alias: 'h',
    describe: 'Viewport height',
    type: 'number'
  })
  .option('trim', {
    alias: 't',
    describe: 'Trim length for title/URL in filename (min: 8, max: 200)',
    type: 'number',
    default: 200
  })
  .option('delay', {
    alias: 'd',
    describe: 'Delay in milliseconds between processing URLs',
    type: 'number',
    default: 0
  })
  .check((argv) => {
    if (argv.trim < 8 || argv.trim > 200) {
      throw new Error('Trim length must be between 8 and 200 characters');
    }
    if (argv.delay < 0) {
      throw new Error('Delay must be a non-negative number');
    }
    return true;
  });

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a promise that resolves after the specified time
 * @param {number} ms - Time to sleep in milliseconds
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Reads and parses URLs from a file
 * @param {string} filename - Path to the file containing URLs
 * @returns {string[]} Array of URLs
 * @throws {Error} If file cannot be read
 */
const readUrls = (filename) => {
  try {
    const content = fs.readFileSync(filename, 'utf8');
    return content.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#')); // Skip empty lines and comments
  } catch (error) {
    console.error(`Error reading URL file: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Intelligently trims a string (URL or title) to a specified length
 * For URLs, attempts to preserve the domain name if possible
 * @param {string} value - The string to trim
 * @param {number} maxLength - Maximum length of the output string
 * @returns {string} Trimmed string
 */
const trimValue = (value, maxLength) => {
  if (value.length <= maxLength) return value;
  
  // Special handling for URLs - try to keep the domain name
  if (value.startsWith('http')) {
    try {
      const url = new URL(value);
      const domain = url.hostname.replace('www.', '');
      if (domain.length <= maxLength) {
        return domain;
      }
    } catch (e) {
      // If URL parsing fails, fall back to simple trimming
    }
  }
  
  return value.substring(0, maxLength);
};

/**
 * Takes a screenshot of a webpage
 * @param {Browser} browser - Puppeteer browser instance
 * @param {string} url - URL to screenshot
 * @param {number} index - Current URL index
 * @param {number} totalUrls - Total number of URLs to process
 * @param {number} viewportWidth - Browser viewport width
 * @param {number} viewportHeight - Browser viewport height
 * @param {string} filenameOption - Filename generation option ('title' or 'url')
 * @param {number} trimLength - Maximum length for filename components
 * @returns {Promise<boolean>} Success status
 */
const takeScreenshot = async (browser, url, index, totalUrls, viewportWidth, viewportHeight, filenameOption = 'title', trimLength) => {
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0);
  
  // Configure viewport
  const actualHeight = viewportHeight || Math.floor(viewportWidth * 0.75);
  await page.setViewport({ 
    width: viewportWidth, 
    height: actualHeight 
  });

  console.log(`Processing [${index} of ${totalUrls}]: ${url}`);

  try {
    // Navigate to page with timeout
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  } catch (error) {
    console.error(`Failed to load URL: ${url}, Error: ${error}`);
    await page.close();
    return false;
  }

  // Forward page console messages to node console
  page.on('console', (msg) => console.log('', msg.text()));

  // Scroll through the page to ensure all content is loaded
  await page.evaluate(`(${(async () => {
    const innerHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    console.log('Page height: ' + innerHeight + 'px');
    await new Promise((resolve) => {
      let totalHeight = 0;
      let scrolled_times = 0;
      const distance = 100; // Scroll distance per step
      const timer = setInterval(() => {
        const scrollHeight = innerHeight;
        scrolled_times++;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          window.scrollTo(0, 0); // Return to top
          console.log("Scrolled " + scrolled_times + " times");
          clearInterval(timer);
          resolve();
        }
      }, 100); // Scroll every 100ms
    });
  })})()`);

  // Wait for any final rendering
  await page.evaluate(() => new Promise(r => setTimeout(r, 1000)));

  // Generate filename with proper formatting and length constraints
  let paddedIndex = String(index).padStart(4, '0');
  let filenameBase = filenameOption === 'url' ? url : await page.title();
  filenameBase = trimValue(filenameBase, trimLength);
  let filename = filenameBase.replace(/[^a-z0-9]/gmi, "_").replace(/\s+/g, "_");

  // Add viewport dimensions to filename
  filename = `${filename}_${viewportWidth}px_${actualHeight}px`;

  // Ensure filename doesn't exceed maximum length
  const MAX_FILENAME_LENGTH = 255;
  let reservedLength = paddedIndex.length + 1 + 8; // 1 for "_" and 8 for ".png" and dimensions
  if (reservedLength + filename.length > MAX_FILENAME_LENGTH) {
    filename = filename.substring(0, MAX_FILENAME_LENGTH - reservedLength);
  }

  filename = paddedIndex + "_" + filename + '.png';
  console.log(`Saving as: ${filename}\n`);

  try {
    // Take the screenshot
    await page.screenshot({
      path: filename,
      fullPage: true
    });
    await page.close();
    return true;
  } catch (error) {
    console.error(`Failed to take screenshot for URL: ${url}, Error: ${error}`);
    await page.close();
    return false;
  }
};

// ============================================================================
// Main Execution
// ============================================================================

/**
 * Main execution function
 * Coordinates the screenshot process for all URLs
 */
const main = async () => {
  const { source, name, width, height, trim, delay } = argv;

  // Validate viewport width
  if (isNaN(width) || width < 1) {
    console.error('Viewport width must be a positive number');
    process.exit(1);
  }

  // Read and validate URLs
  const urls = readUrls(source);
  const totalUrls = urls.length;
  console.log(`Found ${totalUrls} URLs to process`);
  console.log(`Viewport size: ${width}px × ${height || Math.floor(width * 0.75)}px`);
  console.log(`Title/URL trim length: ${trim} characters`);
  if (delay > 0) {
    console.log(`Delay between URLs: ${delay}ms\n`);
  }

  // Initialize browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--headless', '--disable-gpu']
  });

  // Track statistics
  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  try {
    // Process each URL
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i].trim();
      if (url) {
        const success = await takeScreenshot(
          browser, 
          url, 
          i + 1, 
          totalUrls,
          width, 
          height, 
          name, 
          trim
        );
        
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
        
        // Add delay between URLs if specified
        if (delay > 0 && i < urls.length - 1) {
          console.log(`Waiting ${delay}ms before processing next URL...`);
          await sleep(delay);
        }
      }
    }
  } finally {
    await browser.close();
  }

  // Calculate execution time
  const executionTime = Date.now() - startTime;
  const minutes = Math.floor(executionTime / 60000);
  const seconds = ((executionTime % 60000) / 1000).toFixed(1);
  
  // Print summary
  console.log('\n=================================');
  console.log('           SUMMARY               ');
  console.log('=================================');
  console.log(`URLs processed: ${totalUrls}`);
  console.log(`Viewport size: ${width}px × ${height || Math.floor(width * 0.75)}px`);
  console.log(`Delay between processing URLs: ${delay}ms`);
  console.log(`Screenshots saved: ${successCount}`);
  console.log(`Title/URL trim length: ${trim} characters`);
  console.log(`Total execution time: ${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`);
  
  if (errorCount === 0) {
    console.log('Status: ✓ All screenshots completed successfully');
  } else {
    console.log(`Status: ⚠ Completed with ${errorCount} error${errorCount > 1 ? 's' : ''}`);
    console.log(`       ${successCount} successful, ${errorCount} failed`);
  }
  console.log('=================================');
};

// Start execution and handle errors
main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
});