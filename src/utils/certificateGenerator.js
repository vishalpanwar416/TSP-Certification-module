
/**
 * Certificate Generator Utility
 * 
 * Handles client-side certificate generation using HTML5 Canvas.
 * This can be used for instant previews and downloads.
 */

// Coordinates for a 1024x724 canvas
const CONFIG = {
    canvasWidth: 1024,
    canvasHeight: 724,
    backgroundImage: '/Certificate.jpg',
    fonts: {
        name: '48px "Alex Brush", cursive',
        value: '700 14px "Montserrat", sans-serif'
    },
    colors: {
        name: '#df2c2c',
        value: '#1a1a1a'
    },
    positions: {
        name: { x: 512, y: 352 },
        profession: { x: 235, y: 565 },
        certificateNumber: { x: 512, y: 565 },
        reraNumber: { x: 789, y: 565 },
        watermark: { x: 995, y: 362 } // Vertical watermark
    }
};

/**
 * Generate a certificate as a Data URL (image/png)
 */
export const generateCertificateDataUrl = async (data) => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = CONFIG.canvasWidth;
        canvas.height = CONFIG.canvasHeight;
        const ctx = canvas.getContext('2d');

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = CONFIG.backgroundImage;

        img.onload = () => {
            // Draw background
            ctx.drawImage(img, 0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

            // Draw Recipient Name
            ctx.font = CONFIG.fonts.name;
            ctx.fillStyle = CONFIG.colors.name;
            ctx.textAlign = 'center';
            ctx.fillText(data.name || data.recipient_name || 'Recipient Name', CONFIG.positions.name.x, CONFIG.positions.name.y);

            // Draw a decorative line under the name (matching the design)
            const textWidth = ctx.measureText(data.name || data.recipient_name || 'Recipient Name').width;
            ctx.beginPath();
            ctx.moveTo(CONFIG.positions.name.x - Math.max(200, textWidth / 2 + 20), CONFIG.positions.name.y + 15);
            ctx.lineTo(CONFIG.positions.name.x + Math.max(200, textWidth / 2 + 20), CONFIG.positions.name.y + 15);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw Values
            ctx.font = CONFIG.fonts.value;
            ctx.fillStyle = CONFIG.colors.value;
            ctx.textAlign = 'center';

            // Profession
            ctx.fillText((data.professional || data.Professional || 'RERA CONSULTANT').toUpperCase(), CONFIG.positions.profession.x, CONFIG.positions.profession.y);

            // Certificate Number
            ctx.fillText((data.certificate_number || data.certificateNumber || '-').toUpperCase(), CONFIG.positions.certificateNumber.x, CONFIG.positions.certificateNumber.y);

            // RERA Number
            ctx.fillText((data.award_rera_number || data.rera_awarde_no || data.reraAwardeNo || '-').toUpperCase(), CONFIG.positions.reraNumber.x, CONFIG.positions.reraNumber.y);

            // Vertical Watermark on the right edge
            ctx.save();
            ctx.translate(CONFIG.positions.watermark.x, CONFIG.positions.watermark.y);
            ctx.rotate(Math.PI / 2);
            ctx.font = '700 10px "Montserrat", sans-serif';
            ctx.fillStyle = '#333';
            ctx.fillText(`RERA NO: ${data.award_rera_number || data.rera_awarde_no || data.reraAwardeNo || 'PRM/KA/RERA/1251/309/AG/250318/006037'}`, 0, 0);
            ctx.restore();

            resolve(canvas.toDataURL('image/png'));
        };

        img.onerror = (err) => {
            console.error('Failed to load certificate template image', err);
            reject(err);
        };
    });
};

/**
 * Downloads the certificate as a PNG file
 */
export const downloadCertificate = async (data) => {
    const dataUrl = await generateCertificateDataUrl(data);
    const link = document.createElement('a');
    link.download = `Certificate_${data.certificateNumber || data.certificate_number || 'TSP'}.png`;
    link.href = dataUrl;
    link.click();
};
