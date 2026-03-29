import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * Exports a given HTML element to PDF.
 * Uses html2canvas which has broader CSS compatibility than html-to-image.
 *
 * @param elementId The ID of the HTML element to export
 * @param filename  The name of the downloaded PDF file
 */
export const exportToPDF = async (
    elementId: string,
    filename: string = 'timetable.pdf',
) => {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`Element with id "${elementId}" not found`);
    }

    // Temporarily remove overflow clipping on the target element and ancestors
    // so the full content is captured instead of only the visible viewport.
    const overflowFixups: {
        el: HTMLElement;
        overflow: string;
        overflowX: string;
    }[] = [];
    const colorProperties = [
        'color',
        'backgroundColor',
        'borderTopColor',
        'borderRightColor',
        'borderBottomColor',
        'borderLeftColor',
        'outlineColor',
        'textDecorationColor',
        'caretColor',
        'boxShadow',
        'textShadow',
        'fill',
        'stroke',
    ] as const;

    type ColorProperty = (typeof colorProperties)[number];

    const styleFixups: {
        el: HTMLElement;
        styles: Partial<Record<ColorProperty, string>>;
    }[] = [];

    const copySanitizedStyles = (sourceEl: HTMLElement, targetEl: HTMLElement) => {
        const computed = window.getComputedStyle(sourceEl);
        colorProperties.forEach((property) => {
            const computedValue = computed[property];
            if (computedValue) {
                targetEl.style[property] = computedValue;
            }
        });
    };

    const normalizeComputedStyles = (el: HTMLElement) => {
        const computed = window.getComputedStyle(el);
        const originalStyles: Partial<Record<keyof CSSStyleDeclaration, string>> = {};

        colorProperties.forEach((property) => {
            originalStyles[property] = el.style[property];
            const computedValue = computed[property];
            if (computedValue) {
                el.style[property] = computedValue;
            }
        });

        styleFixups.push({ el, styles: originalStyles });
    };

    let walker: HTMLElement | null = element;
    while (walker) {
        const computed = window.getComputedStyle(walker);
        if (computed.overflow !== 'visible' || computed.overflowX !== 'visible') {
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

    normalizeComputedStyles(element);
    element.querySelectorAll<HTMLElement>('*').forEach((child) => {
        normalizeComputedStyles(child);
    });


    try {
        const buildPdfFromImage = (imgData: string, imgWidth: number, imgHeight: number) => {
            const pdf = new jsPDF({
                orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
                unit: 'px',
                format: [imgWidth, imgHeight],
            });

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(filename);
        };

        try {
            const canvas = await html2canvas(element, {
                backgroundColor: '#FFFBF0',
                scale: 3,
                width: element.scrollWidth,
                height: element.scrollHeight,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
                useCORS: true,
                logging: false,
                onclone: (clonedDoc: Document) => {
                    const clonedElement = clonedDoc.getElementById(elementId);
                    if (!clonedElement) return;

                    copySanitizedStyles(element, clonedElement as HTMLElement);

                    const originalNodes = element.querySelectorAll<HTMLElement>('*');
                    const clonedNodes = clonedElement.querySelectorAll<HTMLElement>('*');
                    originalNodes.forEach((originalNode, index) => {
                        const clonedNode = clonedNodes[index];
                        if (!clonedNode) return;
                        copySanitizedStyles(originalNode, clonedNode);
                    });
                },
                ignoreElements: (el: Element) => {
                    return el.tagName === 'IFRAME';
                },
            } as any);

            buildPdfFromImage(canvas.toDataURL('image/png'), canvas.width, canvas.height);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (!message.includes('unsupported color function')) {
                throw error;
            }

            const imgData = await toPng(element, {
                backgroundColor: '#FFFBF0',
                cacheBust: true,
                pixelRatio: 3,
                canvasWidth: element.scrollWidth,
                canvasHeight: element.scrollHeight,
                skipAutoScale: true,
            });

            buildPdfFromImage(imgData, element.scrollWidth * 3, element.scrollHeight * 3);
        }
    } catch (error: unknown) {
        console.error('Error generating PDF:', error);
        const message = error instanceof Error ? error.message : String(error);
        window.alert('PDF Export Error: ' + message);
        throw error;
    } finally {
        // Always restore original overflow values
        for (const fix of overflowFixups) {
            fix.el.style.overflow = fix.overflow;
            fix.el.style.overflowX = fix.overflowX;
        }
        for (const fix of styleFixups) {
            for (const property of colorProperties) {
                fix.el.style[property] = fix.styles[property] ?? '';
            }
        }
    }
};
