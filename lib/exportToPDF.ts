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

    // Temporarily remove overflow clipping on the target element and its ancestors
    // so the full content is captured, not just the visible viewport.
    const overflowFixups: { el: HTMLElement; overflow: string; overflowX: string }[] = [];
    let walker: HTMLElement | null = element;
    while (walker) {
        const computed = window.getComputedStyle(walker);
        if (
            computed.overflow !== 'visible' ||
            computed.overflowX !== 'visible'
        ) {
            overflowFixups.push({
                el: walker,
                overflow: walker.style.overflow,
                overflowX: walker.style.overflowX,
            });
            walker.style.overflow = 'visible';
            walker.style.overflowX = 'visible';
        }
        walker = walker.parentElement;
    }

    try {
        // Capture the element as a PNG image using html-to-image
        // which natively supports modern CSS features like lab() and oklch()
        const dataUrl = await toPng(element, {
            backgroundColor: '#FFFBF0',
            pixelRatio: 2,
            style: {
                transform: 'scale(1)',
                transformOrigin: 'top left',
            },
        });

        // Get image dimensions to create a properly sized PDF
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        // PDF dimensions based on the element
        const pdf = new jsPDF({
            orientation: img.width > img.height ? 'landscape' : 'portrait',
            unit: 'px',
            format: [img.width, img.height],
        });

        pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
        pdf.save(filename);
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    } finally {
        // Restore original overflow values
        for (const fix of overflowFixups) {
            fix.el.style.overflow = fix.overflow;
            fix.el.style.overflowX = fix.overflowX;
        }
    }
};
