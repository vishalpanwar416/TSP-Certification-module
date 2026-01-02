
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
        awardedTo: '16px "Montserrat", sans-serif',
        name: 'bold 58px "Alex Brush", cursive',
        label: '700 11px "Montserrat", sans-serif',
        value: '700 13px "Montserrat", sans-serif'
    },
    colors: {
        awardedTo: '#1a1a1a',
        name: '#df2c2c',
        label: '#1a1a1a',
        value: '#1a1a1a'
    },
    positions: {
        awardedTo: { x: 512, y: 300 },
        name: { x: 512, y: 360 },
        professionLabel: { x: 235, y: 550 },
        profession: { x: 235, y: 540 },
        certificateNumberLabel: { x: 512, y: 550 },
        certificateNumber: { x: 512, y: 540 },
        reraNumberLabel: { x: 789, y: 550 },
        reraNumber: { x: 789, y: 540 },
        watermark: { x: 995, y: 362 } // Vertical watermark
    }
};

/**
 * Generate a certificate as a Data URL (image/png)
 * @param {Object} data - Certificate data (name, certificate_number, etc.)
 * @param {string} templateUrl - Optional custom template URL (defaults to CONFIG.backgroundImage)
 */
export const generateCertificateDataUrl = async (data, templateUrl = null) => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = CONFIG.canvasWidth;
        canvas.height = CONFIG.canvasHeight;
        const ctx = canvas.getContext('2d');

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = templateUrl || CONFIG.backgroundImage;

        img.onload = () => {
            // Draw background
            ctx.drawImage(img, 0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

            // Draw Recipient Name (large, bold, italicized red script font)
            // Note: "IS AWARDED TO:" and underline are already on the template image
            ctx.font = CONFIG.fonts.name;
            ctx.fillStyle = CONFIG.colors.name;
            ctx.textAlign = 'center';
            const recipientName = data.name || data.recipient_name || 'Recipient Name';
            ctx.fillText(recipientName, CONFIG.positions.name.x, CONFIG.positions.name.y);

            // Draw Values Only (labels are already on the template)
            ctx.textAlign = 'center';
            ctx.font = CONFIG.fonts.value;
            ctx.fillStyle = CONFIG.colors.value;
            
            // AWARDE PROFESSION Value
            ctx.fillText((data.professional || data.Professional || 'RERA CONSULTANT').toUpperCase(), CONFIG.positions.profession.x, CONFIG.positions.profession.y);

            // CERTIFICATE NUMBER Value
            ctx.fillText((data.certificate_number || data.certificateNumber || '-').toUpperCase(), CONFIG.positions.certificateNumber.x, CONFIG.positions.certificateNumber.y);

            // AWARDE RERA NUMBER Value
            // Note: RERA number vertical watermark is already on the template image
            ctx.fillText((data.award_rera_number || data.rera_awarde_no || data.reraAwardeNo || '-').toUpperCase(), CONFIG.positions.reraNumber.x, CONFIG.positions.reraNumber.y);

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
