const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Generate certificate HTML template using the background image
 */
const getCertificateHTML = (data, imageDataUrl) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Montserrat:wght@400;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: 1024px;
      height: 724px; /* Matches aspect ratio of standard A4/Certificate more closely */
      font-family: 'Montserrat', sans-serif;
      overflow: hidden;
    }

    .certificate {
      width: 1024px;
      height: 724px;
      position: relative;
      background-image: url('${imageDataUrl}');
      background-size: 100% 100%;
      background-repeat: no-repeat;
    }

    .recipient-name {
      position: absolute;
      top: 49.7%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: 'Alex Brush', cursive;
      font-size: 58px;
      font-weight: bold;
      font-style: italic;
      color: #df2c2c;
      text-align: center;
      width: 80%;
      white-space: nowrap;
      display: inline-block;
      width: auto;
      min-width: 400px;
    }

    .info-container {
      position: absolute;
      bottom: 225px;
      left: 0;
      width: 100%;
      display: flex;
      justify-content: space-around;
      padding: 0 50px;
    }

    .info-box {
      text-align: center;
      flex: 1;
    }

    .info-label {
      font-size: 11px;
      font-weight: 700;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }

    .info-value {
      font-size: 13px;
      font-weight: 700;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .watermark-vertical {
      position: absolute;
      right: 25px;
      top: 50%;
      transform: translateY(-50%) rotate(90deg);
      font-size: 10px;
      font-weight: 700;
      color: #333;
      letter-spacing: 1px;
    }

    .qr-code {
      position: absolute;
      bottom: 55px;
      left: 135px;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .barcode {
        position: absolute;
        bottom: 55px;
        left: 45px;
        width: 80px;
        height: 50px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="recipient-name">${data.recipient_name || data.name || 'Recipient Name'}</div>
    
    <div class="info-container">
      <div class="info-box">
        <div class="info-value">${data.professional || data.Professional || 'RERA CONSULTANT'}</div>
      </div>
      <div class="info-box">
        <div class="info-value">${data.certificate_number || data.certificateNumber || '-'}</div>
      </div>
      <div class="info-box">
        <div class="info-value">${data.award_rera_number || data.reraAwardeNo || '-'}</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Generate PDF certificate and return as Buffer
 * @param {Object} certificateData - Certificate data
 * @param {string} templateUrl - Optional template image URL (from Firebase Storage)
 */
const generateCertificatePDF = async (certificateData, templateUrl = null) => {
  let browser;

  try {
    let imageDataUrl = '';

    // If template URL is provided, use it
    if (templateUrl) {
      try {
        const fetch = require('node-fetch');

        // Handle emulator URLs if running locally
        let actualUrl = templateUrl;
        if (process.env.FUNCTIONS_EMULATOR && templateUrl.includes('storage.googleapis.com')) {
          // If we are in emulator, the hardcoded storage.googleapis.com URL won't work
          // But since we are inside the function, we might be able to use the local emulator port
          // For now, let's just try to fetch it as is, but if it fails, we know why.
        }

        const response = await fetch(templateUrl);
        if (response.ok) {
          const buffer = await response.buffer();
          const base64 = buffer.toString('base64');
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          imageDataUrl = `data:${contentType};base64,${base64}`;
          console.log('✅ Successfully loaded customized certificate template');
        } else {
          throw new Error(`Failed to fetch template: ${response.statusText}`);
        }
      } catch (err) {
        console.warn('⚠️ Failed to load template from URL, falling back to default:', err.message);
        imageDataUrl = '';
      }
    }

    // Fallback to default image if no template URL or if URL loading failed
    if (!imageDataUrl) {
      const imagePath = path.join(__dirname, '..', 'assets', 'Certificate.jpg');
      try {
        if (fs.existsSync(imagePath)) {
          const imageBase64 = fs.readFileSync(imagePath).toString('base64');
          imageDataUrl = `data:image/jpeg;base64,${imageBase64}`;
          console.log('✅ Using default certificate template');
        } else {
          console.warn('⚠️ Background image not found at:', imagePath);
        }
      } catch (err) {
        console.error('Error reading background image:', err);
      }
    }

    const launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };

    // On local Mac, if bundled browser fails, try system Chrome
    if (process.platform === 'darwin' && fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')) {
      launchOptions.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    const html = getCertificateHTML(certificateData, imageDataUrl);

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Set viewport to match the design dimensions
    await page.setViewport({
      width: 1024,
      height: 724,
      deviceScaleFactor: 2, // High resolution
    });

    const pdfBuffer = await page.pdf({
      width: '1024px',
      height: '724px',
      printBackground: true,
      preferCSSPageSize: true
    });

    console.log(`✅ Certificate PDF generated for: ${certificateData.recipient_name}`);

    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * Generate image certificate (JPG) and return as Buffer
 * @param {Object} certificateData - Certificate data
 * @param {string} templateUrl - Optional template image URL
 */
const generateCertificateImage = async (certificateData, templateUrl = null) => {
  let browser;

  try {
    let imageDataUrl = '';

    // If template URL is provided, use it
    if (templateUrl) {
      try {
        const fetch = require('node-fetch');
        const response = await fetch(templateUrl);

        if (response.ok) {
          const buffer = await response.buffer();
          const base64 = buffer.toString('base64');
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          imageDataUrl = `data:${contentType};base64,${base64}`;
          console.log('✅ Successfully loaded customized certificate template for image');
        } else {
          throw new Error(`Failed to fetch template: ${response.statusText}`);
        }
      } catch (err) {
        console.warn('⚠️ Failed to load template from URL, falling back to default:', err.message);
      }
    }

    // Fallback to default image
    if (!imageDataUrl) {
      const imagePath = path.join(__dirname, '..', 'assets', 'Certificate.jpg');
      if (fs.existsSync(imagePath)) {
        const imageBase64 = fs.readFileSync(imagePath).toString('base64');
        imageDataUrl = `data:image/jpeg;base64,${imageBase64}`;
      }
    }

    const launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };

    if (process.platform === 'darwin' && fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')) {
      launchOptions.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    const html = getCertificateHTML(certificateData, imageDataUrl);

    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded', 'load'],
      timeout: 30000
    });

    await page.setViewport({
      width: 1024,
      height: 724,
      deviceScaleFactor: 2,
    });

    const imageBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 90,
      fullPage: true
    });

    console.log(`✅ Certificate Image generated for: ${certificateData.recipient_name}`);

    return imageBuffer;
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

module.exports = { generateCertificatePDF, generateCertificateImage };
