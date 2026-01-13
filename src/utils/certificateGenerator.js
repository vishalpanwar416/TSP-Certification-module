
/**
 * Certificate Generator Utility
 * 
 * Handles client-side certificate generation using HTML5 Canvas.
 * This can be used for instant previews and downloads.
 */

import { API_BASE_URL } from './api';

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
        watermark: { x: 995, y: 362 } 
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

        // Load image using fetch with no-cors mode to avoid CORS issues
        // This works even if the server doesn't send CORS headers
        const loadImageViaFetch = async (imageUrl) => {
            try {
                console.log('[Certificate Generator] Fetching image via fetch API (no-cors):', imageUrl);
                
                // Try with no-cors first (works even without CORS headers)
                let response;
                try {
                    response = await fetch(imageUrl, {
                        mode: 'no-cors',
                        credentials: 'omit',
                        cache: 'default'
                    });
                } catch (fetchError) {
                    console.warn('[Certificate Generator] no-cors fetch failed, trying cors mode:', fetchError.message);
                    // Try with cors mode as fallback
                    response = await fetch(imageUrl, {
                        mode: 'cors',
                        credentials: 'omit'
                    });
                }
                
                // With no-cors, response.ok will always be false, but we can still get the blob
                const blob = await response.blob();
                
                // Verify blob is actually an image
                if (!blob.type.startsWith('image/') && blob.size > 0) {
                    throw new Error('Fetched data is not an image');
                }
                
                const objectUrl = URL.createObjectURL(blob);
                
                return new Promise((resolveImg, rejectImg) => {
                    const img = new Image();
                    const timeout = setTimeout(() => {
                        URL.revokeObjectURL(objectUrl);
                        rejectImg(new Error(`Image loading timeout after 30 seconds: ${imageUrl}`));
                    }, 30000);

                    img.onload = () => {
                        clearTimeout(timeout);
                        console.log('[Certificate Generator] Image loaded successfully via fetch:', imageUrl);
                        // Don't revoke URL yet, we'll do it after drawing
                        resolveImg({ img, objectUrl });
                    };

                    img.onerror = (err) => {
                        clearTimeout(timeout);
                        URL.revokeObjectURL(objectUrl);
                        const errorMsg = `Failed to load image from blob: ${imageUrl}`;
                        console.error('[Certificate Generator] Image load error:', errorMsg, err);
                        rejectImg(new Error(errorMsg));
                    };

                    img.src = objectUrl;
                });
            } catch (fetchError) {
                console.warn('[Certificate Generator] Fetch failed, trying direct image load:', fetchError.message);
                // Fallback to direct image loading
                throw fetchError; // Re-throw to let caller handle fallback
            }
        };

        // Direct image loading (for same-origin images)
        const loadImageDirect = (imageUrl, useCORS = false) => {
            return new Promise((resolveImg, rejectImg) => {
                const img = new Image();
                
                if (useCORS) {
                    img.crossOrigin = 'anonymous';
                }
                
                const timeout = setTimeout(() => {
                    rejectImg(new Error(`Image loading timeout after 30 seconds: ${imageUrl}`));
                }, 30000);

                img.onload = () => {
                    clearTimeout(timeout);
                    console.log('[Certificate Generator] Image loaded successfully (direct):', imageUrl);
                    resolveImg({ img, objectUrl: null });
                };

                img.onerror = (err) => {
                    clearTimeout(timeout);
                    const errorMsg = `Failed to load image: ${imageUrl}`;
                    console.error('[Certificate Generator] Image load error:', errorMsg, err);
                    rejectImg(new Error(errorMsg + (useCORS ? ' (CORS may be blocked)' : '')));
                };

                console.log('[Certificate Generator] Attempting to load image (direct):', imageUrl, useCORS ? '(with CORS)' : '(no CORS)');
                
                if (!imageUrl) {
                    rejectImg(new Error('Image URL is empty or undefined'));
                    return;
                }
                
                img.src = imageUrl;
            });
        };

        const tryLoadImage = async () => {
            const imageUrl = templateUrl || CONFIG.backgroundImage;
            const isExternal = imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'));
            const isLocal = imageUrl && (imageUrl.startsWith('/') || imageUrl.startsWith('./'));
            
            console.log('[Certificate Generator] Image URL:', imageUrl);
            console.log('[Certificate Generator] Is external:', isExternal);
            console.log('[Certificate Generator] Is local:', isLocal);
            
            // For external images (Firebase Storage, etc.), try using proxy endpoint first
            if (isExternal && templateUrl) {
                // Use proxy endpoint to avoid CORS issues
                const proxyUrl = `${API_BASE_URL}/certificates/template/image`;
                
                try {
                    console.log('[Certificate Generator] Trying proxy endpoint:', proxyUrl);
                    const result = await loadImageDirect(proxyUrl, true);
                    return result;
                } catch (proxyError) {
                    console.warn('[Certificate Generator] Proxy endpoint failed, trying direct:', proxyError.message);
                }
            }
            
            // For external images, use fetch to avoid CORS issues
            if (isExternal) {
                try {
                    const result = await loadImageViaFetch(imageUrl);
                    return result;
                } catch (fetchError) {
                    console.warn('[Certificate Generator] Fetch load failed:', fetchError.message);
                    // Try direct loading without CORS (might work for some servers)
                    try {
                        const result = await loadImageDirect(imageUrl, false);
                        return result;
                    } catch (directError) {
                        console.warn('[Certificate Generator] Direct load also failed:', directError.message);
                        // If all fail and we have a custom template, try default
                        if (templateUrl) {
                            console.warn('[Certificate Generator] Custom template failed, trying default template');
                            try {
                                const result = await loadImageDirect(CONFIG.backgroundImage, false);
                                return result;
                            } catch (defaultError) {
                                throw new Error(`Failed to load both custom template (${imageUrl}) and default template (${CONFIG.backgroundImage}). Please ensure the image server allows cross-origin requests or use a local image.`);
                            }
                        }
                        throw new Error(`Failed to load image: ${imageUrl}. This is likely a CORS issue. The image server needs to allow cross-origin requests. Error: ${directError.message}`);
                    }
                }
            } else {
                // Local image, try direct loading first
                try {
                    const result = await loadImageDirect(imageUrl, false);
                    return result;
                } catch (localError) {
                    // If local fails, try as if it's external (might be a relative URL that needs fetch)
                    console.warn('[Certificate Generator] Direct local load failed, trying fetch:', localError.message);
                    try {
                        const result = await loadImageViaFetch(imageUrl);
                        return result;
                    } catch (fetchError) {
                        throw localError; // Return original error
                    }
                }
            }
        };

        // Helper function to wait for fonts to load
        const waitForFonts = () => {
            return new Promise((resolve) => {
                if (document.fonts && document.fonts.ready) {
                    document.fonts.ready.then(() => {
                        // Additional check for specific fonts
                        if (document.fonts.check('bold 58px "Alex Brush"') || document.fonts.check('58px "Alex Brush"')) {
                            resolve();
                        } else {
                            // Fonts might not be loaded yet, wait a bit more
                            setTimeout(() => {
                                console.log('[Certificate Generator] Fonts check - Alex Brush available:', document.fonts.check('58px "Alex Brush"'));
                                console.log('[Certificate Generator] Fonts check - Montserrat available:', document.fonts.check('13px "Montserrat"'));
                                resolve(); // Continue anyway, browser will use fallback
                            }, 500);
                        }
                    });
                } else {
                    // Fallback for browsers without Font Loading API
                    setTimeout(resolve, 500);
                }
            });
        };

        tryLoadImage()
            .then(async (result) => {
                const img = result.img;
                const objectUrl = result.objectUrl;
                
                console.log('[Certificate Generator] Image loaded successfully, dimensions:', img.width, 'x', img.height);
                
                // Wait for fonts to be ready
                await waitForFonts();
                
                try {
                    // Draw background
                    ctx.drawImage(img, 0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

                    // Draw Recipient Name (large, bold, italicized red script font)
                    // Note: "IS AWARDED TO:" and underline are already on the template image
                    ctx.font = CONFIG.fonts.name;
                    ctx.fillStyle = CONFIG.colors.name;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const recipientName = data.name || data.recipient_name || 'Recipient Name';
                    ctx.fillText(recipientName, CONFIG.positions.name.x, CONFIG.positions.name.y);

                    // Draw Values Only (labels are already on the template)
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = CONFIG.fonts.value;
                    ctx.fillStyle = CONFIG.colors.value;
                    
                    // AWARDE PROFESSION Value
                    const profession = (data.professional || data.Professional || 'RERA CONSULTANT').toUpperCase();
                    ctx.fillText(profession, CONFIG.positions.profession.x, CONFIG.positions.profession.y);

                    // CERTIFICATE NUMBER Value
                    const certNumber = (data.certificate_number || data.certificateNumber || '-').toUpperCase();
                    ctx.fillText(certNumber, CONFIG.positions.certificateNumber.x, CONFIG.positions.certificateNumber.y);

                    // AWARDE RERA NUMBER Value
                    // Note: RERA number vertical watermark is already on the template image
                    const reraNumber = (data.award_rera_number || data.rera_awarde_no || data.reraAwardeNo || '-').toUpperCase();
                    ctx.fillText(reraNumber, CONFIG.positions.reraNumber.x, CONFIG.positions.reraNumber.y);

                    // Clean up object URL if we used fetch
                    if (objectUrl) {
                        URL.revokeObjectURL(objectUrl);
                    }
                    
                    // Check if canvas is tainted before calling toDataURL
                    try {
                        // Try to read a pixel to check if canvas is tainted
                        ctx.getImageData(0, 0, 1, 1);
                    } catch (taintError) {
                        console.error('[Certificate Generator] Canvas is tainted, cannot export:', taintError);
                        throw new Error('Canvas is tainted due to CORS restrictions. The image server needs to allow cross-origin requests with proper CORS headers.');
                    }

                    const dataUrl = canvas.toDataURL('image/png');
                    console.log('[Certificate Generator] Certificate generated successfully, data URL length:', dataUrl.length);
                    resolve(dataUrl);
                } catch (error) {
                    // Clean up object URL on error
                    if (objectUrl) {
                        URL.revokeObjectURL(objectUrl);
                    }
                    console.error('[Certificate Generator] Error drawing on canvas:', error);
                    console.error('[Certificate Generator] Error stack:', error.stack);
                    reject(new Error(`Failed to draw certificate: ${error.message}`));
                }
            })
            .catch((error) => {
                console.error('[Certificate Generator] Failed to load certificate template image:', error);
                console.error('[Certificate Generator] Template URL was:', templateUrl);
                console.error('[Certificate Generator] Default image path:', CONFIG.backgroundImage);
                
                let errorMessage = 'Failed to load certificate template image';
                if (templateUrl && (templateUrl.startsWith('http://') || templateUrl.startsWith('https://'))) {
                    errorMessage += '. This might be a CORS (Cross-Origin) issue. The image server needs to allow cross-origin requests.';
                    errorMessage += ` URL: ${templateUrl}`;
                } else if (!templateUrl) {
                    errorMessage += `. Default certificate image not found at: ${CONFIG.backgroundImage}`;
                    errorMessage += '. Please ensure /Certificate.jpg exists in the public folder.';
                }
                errorMessage += ` Error: ${error.message}`;
                
                reject(new Error(errorMessage));
            });
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
