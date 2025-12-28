import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Email configuration from environment variables
const emailConfig = {
    service: process.env.EMAIL_SERVICE || 'gmail', // gmail, outlook, etc.
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
};

let transporter;

// Initialize email transporter
if (emailConfig.user && emailConfig.pass && emailConfig.user !== 'your_email@gmail.com') {
    transporter = nodemailer.createTransporter({
        service: emailConfig.service,
        auth: {
            user: emailConfig.user,
            pass: emailConfig.pass,
        },
    });

    // Verify connection
    transporter.verify((error, success) => {
        if (error) {
            console.error('❌ Email service error:', error.message);
        } else {
            console.log('✅ Email service ready');
        }
    });
} else {
    console.warn('⚠️  Email credentials not configured. Email features will be disabled.');
    console.warn('    Configure EMAIL_USER and EMAIL_PASSWORD in .env file.');
}

/**
 * Send certificate via email
 */
export const sendCertificateViaEmail = async (recipientEmail, pdfPath, certificateData) => {
    if (!transporter) {
        throw new Error('Email service is not configured. Please set up your email credentials in .env file.');
    }

    try {
        // Ensure PDF file exists
        if (!fs.existsSync(pdfPath)) {
            throw new Error(`PDF file not found: ${pdfPath}`);
        }

        const mailOptions = {
            from: {
                name: 'Top Selling Properties',
                address: emailConfig.from,
            },
            to: recipientEmail,
            subject: `🎓 Certificate of Appreciation - ${certificateData.certificate_number}`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f5f5f5;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              background: #d32f2f;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 20px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #666;
              font-size: 12px;
            }
            .details {
              background: white;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .details strong {
              color: #d32f2f;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎓 Certificate of Appreciation</h1>
            <p>Top Selling Properties</p>
          </div>
          
          <div class="content">
            <h2>Congratulations ${certificateData.recipient_name}!</h2>
            
            <p>We are pleased to present you with a <strong>Certificate of Appreciation</strong> from <strong>Top Selling Properties</strong>.</p>
            
            <div class="details">
              <p><strong>Certificate Number:</strong> ${certificateData.certificate_number}</p>
              ${certificateData.award_rera_number ? `<p><strong>Award RERA Number:</strong> ${certificateData.award_rera_number}</p>` : ''}
              <p><strong>Issued Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            
            <p>This certificate recognizes your commitment, hard work, and professionalism in achieving exceptional results in the real estate industry.</p>
            
            <p>Your certificate is attached to this email as a PDF document. You can download, print, or share it as needed.</p>
            
            <p style="margin-top: 30px;">
              <strong>Thank you for your excellence!</strong>
            </p>
          </div>
          
          <div class="footer">
            <p><strong>Top Selling Properties</strong></p>
            <p>www.topsellingproperty.com</p>
            <p>Our priority – Always ready to help you</p>
          </div>
        </body>
        </html>
      `,
            attachments: [
                {
                    filename: `Certificate_${certificateData.certificate_number}.pdf`,
                    path: pdfPath,
                    contentType: 'application/pdf',
                },
            ],
        };

        const info = await transporter.sendMail(mailOptions);

        console.log(`✅ Email sent to ${recipientEmail}. Message ID: ${info.messageId}`);

        return {
            success: true,
            messageId: info.messageId,
            to: recipientEmail,
        };
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

/**
 * Check if email is configured
 */
export const isEmailConfigured = () => {
    return transporter !== undefined;
};

export default {
    sendCertificateViaEmail,
    isEmailConfigured,
};
