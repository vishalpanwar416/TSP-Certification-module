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
      top: 48.5%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: 'Alex Brush', cursive;
      font-size: 58px;
      color: #df2c2c;
      text-align: center;
      width: 80%;
      white-space: nowrap;
      padding-bottom: 5px;
      border-bottom: 2px solid #333; /* The dash in the design */
      display: inline-block;
      width: auto;
      min-width: 400px;
    }

    .info-container {
      position: absolute;
      bottom: 185px;
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

    .info-value {
      font-size: 13px;
      font-weight: 700;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 15px; /* Adjust based on where "AWARDE PROFESSION" label is */
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
    <div class="recipient-name">${data.recipient_name}.</div>
    
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

    <div class="watermark-vertical">
      RERA NO. ${data.award_rera_number || data.reraAwardeNo || 'PRM/KA/RERA/1251/309/AG/250318/006037'}
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
        // Fetch the image from URL and convert to base64
        const https = require('https');
        const http = require('http');
        const url = require('url');
        
        const fetchImage = () => {
          return new Promise((resolve, reject) => {
            const parsedUrl = url.parse(templateUrl);
            const client = parsedUrl.protocol === 'https:' ? https : http;
            
            client.get(templateUrl, (response) => {
              if (response.statusCode !== 200) {
                reject(new Error(`Failed to fetch image: ${response.statusCode}`));
                return;
              }
              
              const chunks = [];
              response.on('data', (chunk) => chunks.push(chunk));
              response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const base64 = buffer.toString('base64');
                const contentType = response.headers['content-type'] || 'image/jpeg';
                resolve(`data:${contentType};base64,${base64}`);
              });
            }).on('error', reject);
          });
        };
        
        imageDataUrl = await fetchImage();
        console.log('✅ Using uploaded certificate template');
      } catch (err) {
        console.warn('⚠️ Failed to load template from URL, falling back to default:', err.message);
        // Fallback to default
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

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

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

module.exports = { generateCertificatePDF };
