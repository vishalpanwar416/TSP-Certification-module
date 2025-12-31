const nodemailer = require('nodemailer');
const functions = require('firebase-functions');

// Get email credentials from Firebase environment config
const config = functions.config();
const emailConfig = {
    service: config.email?.service || 'gmail',
    user: config.email?.user,
    pass: config.email?.pass,
    from: config.email?.from || config.email?.user,
};

let transporter;

// Initialize email transporter if credentials are available
if (emailConfig.user && emailConfig.pass && emailConfig.user !== 'your_email@gmail.com') {
    transporter = nodemailer.createTransport({
        service: emailConfig.service,
        auth: {
            user: emailConfig.user,
            pass: emailConfig.pass,
        },
    });

    /*
    // Verify connection
    transporter.verify((error, success) => {
        if (error) {
            console.error('❌ Email service error:', error.message);
        } else {
            console.log('✅ Email service ready');
        }
    });
    */
} else {
    console.warn('⚠️  Email credentials not configured. Email features will be disabled.');
    console.warn('    Set them using: firebase functions:config:set email.user="YOUR_EMAIL" email.pass="YOUR_PASSWORD"');
}

/**
 * Send certificate via email
 */
const sendCertificateViaEmail = async (recipientEmail, certificateUrl, certificateData) => {
    if (!transporter) {
        throw new Error('Email service is not configured. Please set up your email credentials.');
    }

    try {
        const mailOptions = {
            from: `"Top Selling Property" <${emailConfig.from}>`,
            to: recipientEmail,
            subject: `🎉 Certificate of Appreciation - ${certificateData.certificate_number}`,
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
                            background: #f9f9f9;
                            padding: 30px;
                            border-radius: 0 0 10px 10px;
                        }
                        .certificate-details {
                            background: white;
                            padding: 20px;
                            border-radius: 8px;
                            margin: 20px 0;
                            border-left: 4px solid #d32f2f;
                        }
                        .button {
                            display: inline-block;
                            padding: 12px 30px;
                            background: #d32f2f;
                            color: white;
                            text-decoration: none;
                            border-radius: 5px;
                            margin: 20px 0;
                            font-weight: bold;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 30px;
                            color: #666;
                            font-size: 12px;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>🎉 Congratulations!</h1>
                        <p>Certificate of Appreciation</p>
                    </div>
                    <div class="content">
                        <p>Dear <strong>${certificateData.recipient_name}</strong>,</p>
                        
                        <p>We are delighted to inform you that you have been awarded a <strong>Certificate of Appreciation</strong> from <strong>Top Selling Property</strong>.</p>
                        
                        <div class="certificate-details">
                            <p><strong>Certificate Number:</strong> ${certificateData.certificate_number}</p>
                            ${certificateData.award_rera_number ? `<p><strong>Award RERA Number:</strong> ${certificateData.award_rera_number}</p>` : ''}
                            ${certificateData.description ? `<p><strong>Description:</strong> ${certificateData.description}</p>` : ''}
                        </div>
                        
                        <p>Your commitment, hard work, and professionalism have set a remarkable standard of excellence.</p>
                        
                        <div style="text-align: center;">
                            <a href="${certificateUrl}" class="button">Download Your Certificate</a>
                        </div>
                        
                        <p>Thank you for your outstanding contribution!</p>
                        
                        <div class="footer">
                            <p><strong>Top Selling Property</strong></p>
                            <p>Visit us at <a href="https://www.topsellingproperty.com">www.topsellingproperty.com</a></p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
Congratulations ${certificateData.recipient_name}!

You have been awarded a Certificate of Appreciation from Top Selling Property.

Certificate Number: ${certificateData.certificate_number}
${certificateData.award_rera_number ? `Award RERA Number: ${certificateData.award_rera_number}` : ''}

Download your certificate: ${certificateUrl}

Thank you for your outstanding contribution!

Top Selling Property
www.topsellingproperty.com
            `,
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
 * Check if Email is configured
 */
const isEmailConfigured = () => {
    return transporter !== undefined;
};

/**
 * Send bulk marketing email
 * @param {string} recipientEmail - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content of the email (can contain plain text)
 */
const sendBulkEmail = async (recipientEmail, subject, htmlContent) => {
    if (!transporter) {
        throw new Error('Email service is not configured. Please set up your email credentials.');
    }

    try {
        // Check if content is HTML or plain text
        const isHtml = htmlContent.includes('<') && htmlContent.includes('>');

        const mailOptions = {
            from: `"MarketHub" <${emailConfig.from}>`,
            to: recipientEmail,
            subject: subject || 'Message from MarketHub',
            ...(isHtml ? {
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
                                background: #f9f9f9;
                                padding: 30px;
                                border-radius: 0 0 10px 10px;
                            }
                            .footer {
                                text-align: center;
                                margin-top: 30px;
                                color: #666;
                                font-size: 12px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>MarketHub</h1>
                        </div>
                        <div class="content">
                            ${htmlContent}
                        </div>
                        <div class="footer">
                            <p>Sent via MarketHub</p>
                        </div>
                    </body>
                    </html>
                `,
            } : {
                text: htmlContent,
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
                                background: #f9f9f9;
                                padding: 30px;
                                border-radius: 0 0 10px 10px;
                                white-space: pre-wrap;
                            }
                            .footer {
                                text-align: center;
                                margin-top: 30px;
                                color: #666;
                                font-size: 12px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>MarketHub</h1>
                        </div>
                        <div class="content">
                            ${htmlContent.replace(/\n/g, '<br>')}
                        </div>
                        <div class="footer">
                            <p>Sent via MarketHub</p>
                        </div>
                    </body>
                    </html>
                `,
            }),
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Bulk email sent to ${recipientEmail}. Message ID: ${info.messageId}`);

        return {
            success: true,
            messageId: info.messageId,
            to: recipientEmail,
        };
    } catch (error) {
        console.error('Error sending bulk email:', error);
        throw error;
    }
};

module.exports = {
    sendCertificateViaEmail,
    isEmailConfigured,
    sendBulkEmail,
};


