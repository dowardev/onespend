import { ref, Ref } from 'vue';
import { format } from 'date-fns';

export type Html2CanvasOptions = Record<string, unknown>;

export type JsPdfOrientation = 'portrait' | 'landscape';
export type JsPdfUnit = 'pt' | 'mm' | 'cm' | 'in' | 'px';
export type JsPdfFormat = 'a4' | 'letter' | 'legal' | 'tabloid' | 'executive' | 'a3' | 'a5' | 'a6' | 'b4' | 'b5' | 'b6' | 'c7' | 'custom';

export type UsePdfReportOptions = {
  containerRef: Ref<HTMLElement | null>;
  buttonSelector?: string;
  filenameFactory?: () => string;
  html2canvasOptions?: Html2CanvasOptions;
  jspdfOptions?: {
    orientation?: JsPdfOrientation;
    unit?: JsPdfUnit;
    format?: JsPdfFormat | [number, number];
  };
};

export function usePdfReport() {
  const isGeneratingPdf = ref(false);

  async function downloadPdf(opts: UsePdfReportOptions) {
    if (!opts || !opts.containerRef) return false;
    const elRef = opts.containerRef;
    if (!elRef.value) {
      console.warn('[usePdfReport] container element not available');
      return false;
    }

    if (isGeneratingPdf.value) return false;
    isGeneratingPdf.value = true;

    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas =
        html2canvasModule && (html2canvasModule.default ?? html2canvasModule);
      const jsPDFModule = await import('jspdf');
      const jsPDF =
        jsPDFModule &&
        (jsPDFModule.jsPDF ?? jsPDFModule.default ?? jsPDFModule);

      const el = elRef.value as HTMLElement;

      const selector = opts.buttonSelector || '#dowBut';
      const downloadBtn = el.querySelector(selector) as HTMLElement | null;
      const prevDisplay = downloadBtn ? downloadBtn.style.display : null;
      if (downloadBtn) downloadBtn.style.display = 'none';

      // allow reflow
      await new Promise(r => setTimeout(r, 50));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        ...(opts.html2canvasOptions || {}),
      });

      if (downloadBtn && prevDisplay !== null)
        downloadBtn.style.display = prevDisplay;

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation:
          (opts.jspdfOptions && opts.jspdfOptions.orientation) || 'portrait',
        unit: (opts.jspdfOptions && opts.jspdfOptions.unit) || 'pt',
        format: (opts.jspdfOptions && opts.jspdfOptions.format) || 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
      const renderedWidth = imgWidth * ratio;
      const renderedHeight = imgHeight * ratio;

      const xOffset = Math.max(0, (pageWidth - renderedWidth) / 2);
      const yOffset = 0;

      pdf.addImage(
        imgData,
        'PNG',
        xOffset,
        yOffset,
        renderedWidth,
        renderedHeight
      );

      const filename = opts.filenameFactory
        ? opts.filenameFactory()
        : `report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(filename);

      return true;
    } catch (err) {
      console.error('[usePdfReport] downloadPdf error', err);
      return false;
    } finally {
      isGeneratingPdf.value = false;
    }
  }

  return { downloadPdf, isGeneratingPdf };
}
