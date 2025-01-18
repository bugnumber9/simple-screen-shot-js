**Batch URL Screenshot Tool**

This Node.js script automates the process of capturing screenshots of multiple webpages specified in a text file. It offers customizable options for viewport dimensions, filename generation, and includes features like URL processing delays and filename length trimming.

Inspired by the work of Ryan S: [https://www.soothsawyer.com/how-to-take-full-page-screenshot-from-list-of-urls/](https://www.soothsawyer.com/how-to-take-full-page-screenshot-from-list-of-urls/) 
This Node.js script simplifies the process by eliminating the need for a separate Bash script.

**Features**

-   Capture screenshots of multiple URLs from a text file.
-   Customize viewport size (width and height).
-   Generate filenames based on webpage title or URL.
-   Trim filenames to a specified length.
-   Delay processing between URLs.


**Installation**

1.  Clone this repository or download the script file.
2.  Install required dependencies: `npm install puppeteer`


**Usage**

    node script.js -s urls.txt [-w width] [-h height] [-n name] [-t trim] [-d delay]
    
    -s, --source: The file containing the list of URLs (required).
    -w, --width: Viewport width for screenshots (defaults to 1024px).
    -h, --height: Viewport height for screenshots (defaults to 75% of width).
    -n, --name: Option to use filename based on 'title' or 'url' of the webpage (defaults to 'title').
    -t, --trim: Maximum length for title or url filename components (defaults to 200 characters).
    -d, --delay: Delay in milliseconds between processing URLs (defaults to 0).

**Example**

    node script.js -s urls.txt -w 1280 -h 800 -n url -t 150 -d 2000

This command will capture screenshots of URLs listed in `urls.txt` using a viewport size of 1280x800 pixels, filenames based on URLs with a maximum length of 150 characters, and a 2-second delay between processing each URL.

**Output**

The script will generate screenshot images (in PNG format) based on the specified filename options and save them in the same directory as the script. It will also provide a summary about the processing progress and any errors encountered.

**Testing Environment**

This script has been tested under the following environment:

-   **Operating System:** Windows 11
-   **Node.js Version:** 23.6.0
-   **Puppeteer Version:** 24.1.0

**Note:** While the script is expected to work on other platforms and with compatible versions of Node.js and Puppeteer, the behavior may vary.

**Sample Text File (urls.txt)**

This repository also includes a sample text file `urls.txt` that you can use to test the script.
