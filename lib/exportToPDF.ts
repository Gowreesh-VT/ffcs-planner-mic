import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

/**
 * Exports a given HTML element to PDF
 * @param elementId The ID of the HTML element to export
 * @param filename The name of the downloaded PDF file
 */
export const exportToPDF = async (elementId: string, filename: string = 'timetable.pdf') => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with ID ${elementId} not found`);
        return;
    }

    try {
        // Capture the element as a PNG image directly using html-to-image
        // which natively supports modern CSS features like lab() and oklch()
        // unlike html2canvas.
        const dataUrl = await toPng(element, {
            backgroundColor: '#FFFBF0',
            pixelRatio: 2, // High resolution
            style: {
                // Ensure no unexpected overflow hiding ruins the capture
                transform: 'scale(1)',
                transformOrigin: 'top left'
            }
        });

        // Get image dimensions to create a properly sized PDF
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => {
            img.onload = resolve;
        });

        // PDF dimensions based on the element
        const pdf = new jsPDF({
            orientation: img.width > img.height ? 'landscape' : 'portrait',
            unit: 'px',
            format: [img.width, img.height]
        });

        pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
        pdf.save(filename);
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};
