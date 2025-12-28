import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const certificatesDir = join(__dirname, '../../public/certificates');

// Ensure certificates directory exists
if (!fs.existsSync(certificatesDir)) {
    fs.mkdirSync(certificatesDir, { recursive: true });
}

/**
 * Generate certificate HTML template
 */
const getCertificateHTML = (data) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: 1024px;
      height: 720px;
      font-family: 'Arial', sans-serif;
      position: relative;
      overflow: hidden;
    }

    .certificate {
      width: 100%;
      height: 100%;
      position: relative;
      background: linear-gradient(to bottom, #f5f5f5 0%, #ffffff 50%, #f5f5f5 100%);
    }

    .wave-top {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 180px;
      background: #d32f2f;
      clip-path: ellipse(150% 100% at 50% 0%);
      z-index: 1;
    }

    .wave-bottom {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 150px;
      background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%);
      clip-path: ellipse(150% 100% at 50% 100%);
      z-index: 1;
    }

    .logo {
      position: absolute;
      top: 40px;
      right: 50px;
      width: 100px;
      height: 100px;
      background: white;
      border-radius: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 2;
      font-weight: bold;
      color: #d32f2f;
      font-size: 12px;
      text-align: center;
      padding: 10px;
      border: 3px solid #d32f2f;
    }

    .badge {
      position: absolute;
      top: 140px;
      right: 100px;
      width: 90px;
      height: 90px;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%);
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 2;
      border: 4px solid #fff;
    }

    .badge-year {
      font-size: 28px;
      font-weight: bold;
      color: #333;
    }

    .badge-ribbon {
      position: absolute;
      bottom: -15px;
      width: 40px;
      height: 30px;
      background: #d32f2f;
      clip-path: polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%);
    }

    .content {
      position: relative;
      z-index: 2;
      text-align: center;
      padding: 160px 80px 80px;
    }

    .title {
      font-size: 72px;
      font-weight: bold;
      color: #1a1a1a;
      letter-spacing: 4px;
      margin-bottom: 10px;
    }

    .subtitle {
      font-size: 32px;
      color: #555;
      font-weight: 500;
      letter-spacing: 2px;
      margin-bottom: 40px;
    }

    .awarded-to {
      font-size: 20px;
      color: #666;
      margin-bottom: 15px;
      letter-spacing: 1px;
    }

    .recipient-name {
      font-size: 56px;
      font-weight: bold;
      color: #d32f2f;
      font-style: italic;
      margin-bottom: 30px;
      text-decoration: underline;
      text-decoration-color: #1a1a1a;
      text-decoration-thickness: 2px;
      text-underline-offset: 8px;
    }

    .description {
      font-size: 16px;
      color: #444;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto 40px;
      padding: 0 20px;
    }

    .certificate-details {
      display: flex;
      justify-content: space-around;
      max-width: 800px;
      margin: 0 auto 40px;
    }

    .detail-box {
      text-align: center;
    }

    .detail-label {
      font-size: 14px;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }

    .detail-value {
      font-size: 13px;
      color: #555;
      font-weight: 600;
    }

    .signatures {
      display: flex;
      justify-content: space-around;
      max-width: 600px;
      margin: 0 auto;
    }

    .signature {
      text-align: center;
    }

    .signature-line {
      width: 200px;
      height: 60px;
      border-bottom: 2px solid #1a1a1a;
      margin-bottom: 8px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      font-family: 'Brush Script MT', cursive;
      font-size: 28px;
      color: #1a5a8a;
      padding-bottom: 5px;
    }

    .signature-title {
      font-size: 16px;
      font-weight: bold;
      color: #1a1a1a;
    }

    .watermark {
      position: absolute;
      bottom: 20px;
      left: 50px;
      font-size: 10px;
      color: #999;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      z-index: 2;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="wave-top"></div>
    <div class="wave-bottom"></div>
    
    <div class="logo">
      TOP SELLING<br>PROPERTY
    </div>

    <div class="badge">
      <div class="badge-year">${new Date().getFullYear()}</div>
      <div class="badge-ribbon"></div>
    </div>

    <div class="content">
      <div class="title">CERTIFICATE</div>
      <div class="subtitle">FOR APPRECIATION</div>
      
      <div class="awarded-to">IS AWARDED TO:</div>
      
      <div class="recipient-name">${data.recipient_name}</div>
      
      <div class="description">
        ${data.description || 'This Certificate was given for your commitment, hard work, and professionalism have set a remarkable standard of excellence for excellence in property marketing, client handling, and achieving exceptional results in real estate platform. <strong>www.topsellingproperty.com</strong> for your real estate needs, Our priority – Always ready to help you.'}
      </div>

      <div class="certificate-details">
        <div class="detail-box">
          <div class="detail-label">CERTIFICATE NUMBER</div>
          <div class="detail-value">${data.certificate_number}</div>
        </div>
        ${data.award_rera_number ? `
        <div class="detail-box">
          <div class="detail-label">AWARDE RERA NUMBER</div>
          <div class="detail-value">${data.award_rera_number}</div>
        </div>
        ` : ''}
      </div>

      <div class="signatures">
        <div class="signature">
          <div class="signature-line">Signature</div>
          <div class="signature-title">Director</div>
        </div>
        <div class="signature">
          <div class="signature-line">Signature</div>
          <div class="signature-title">Founder</div>
        </div>
      </div>
    </div>

    <div class="watermark">PRINTUKVAREBA/12578904/25082030/006037</div>
  </div>
</body>
</html>
  `;
};

/**
 * Generate PDF certificate
 */
export const generateCertificatePDF = async (certificateData) => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        const html = getCertificateHTML(certificateData);

        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfPath = join(certificatesDir, `${certificateData.id}.pdf`);

        await page.pdf({
            path: pdfPath,
            width: '1024px',
            height: '720px',
            printBackground: true,
            preferCSSPageSize: true
        });

        console.log(`✅ Certificate PDF generated: ${pdfPath}`);

        return {
            success: true,
            path: pdfPath,
            filename: `${certificateData.id}.pdf`
        };
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    } finally {
        await browser.close();
    }
};

export default { generateCertificatePDF };
