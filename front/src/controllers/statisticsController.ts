import { ref, reactive, type Ref } from 'vue';
import { format } from 'date-fns';
import { formatLocalDate } from '@/utils/date';
import { DixieController } from './dixie';

export type UsePdfReportOptions = {
  containerRef: Ref<HTMLElement | null>;
  buttonSelector?: string;
  filenameFactory?: () => string;
  html2canvasOptions?: Record<string, any>;
  jspdfOptions?: { orientation?: any; unit?: any; format?: any };
};

class StatisticsController {
  private popovers = reactive({
    mainDate: { open: false as boolean, event: null as Event | null },
    itemMessageHeleper: {
      open: false as boolean,
      event: null as Event | null,
      message: '.' as string,
    },
  });

  private hovered = reactive<Record<string, boolean>>({
    costSales: false,
    grossProfitCost: false,
    netProfit: false,
    dailyBreakEvenPoint: false,
    netMarginDay: false,
  });

  private modalOpen = ref(false);

  private snapshots = reactive<{ current: any; previous: any }>({
    current: { totalSales: 0, netProfit: 0 },
    previous: { totalSales: 0, netProfit: 0 },
  });

  private isGeneratingPdf = ref(false);

  setHover(key: string, value: boolean) {
    try {
      this.hovered[key] = value;
    } catch (_e) {
    }
  }

  getHovered() {
    return this.hovered;
  }

  isoDate(params: { d: Date }) {
    const { d } = params;
    return formatLocalDate({ d });
  }

  providerValue(p: any) {
    try {
      const efectivo = Number(p?.efectivo || 0);
      const tarjeta = Number(p?.tarjeta || 0);
      const credito = Number(p?.credito || 0);
      const sumPayments = efectivo + tarjeta + credito;
      if (sumPayments > 0) return sumPayments;
      const e = Number(p?.estimated || 0);
      return e;
    } catch (_e) {
      return 0;
    }
  }

  formatCurrency(val: any) {
    const n = Number(val ?? 0);
    const nf = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    if (!Number.isFinite(n)) {
      return nf.format(0);
    }

    return nf.format(n);
  }

  formatPercent(val: any) {
    const n = Number(val ?? 0);
    if (!Number.isFinite(n)) return '0';
    return String(Math.round(n));
  }

  getModalOpen() {
    return this.modalOpen.value;
  }

  setModalOpen(value: boolean) {
    this.modalOpen.value = value;
  }

  openModal() {
    this.modalOpen.value = true;
  }

  closeModal() {
    this.modalOpen.value = false;
  }

  toggleModal() {
    this.modalOpen.value = !this.modalOpen.value;
  }

  getSnapshots() {
    return this.snapshots;
  }

  setSnapshots(payload: { current?: any; previous?: any }) {
    if (typeof payload.current !== 'undefined') {
      this.snapshots.current = payload.current;
    }
    if (typeof payload.previous !== 'undefined') {
      this.snapshots.previous = payload.previous;
    }
  }

  async listBackups(storeName: string = 'backups') {
    const ctrl = new DixieController({ name: 'ABOgazDB', storeName });
    return await ctrl.listBackups();
  }

  async getBackup(id: IDBValidKey, storeName: string = 'backups') {
    const ctrl = new DixieController({ name: 'ABOgazDB', storeName });
    return await ctrl.getBackup(id);
  }

  async downloadPdf(opts: UsePdfReportOptions): Promise<boolean> {
    if (!opts || !opts.containerRef) return false;
    const elRef = opts.containerRef;
    if (!elRef.value) {
      console.warn('[StatisticsController] container element not available');
      return false;
    }

    if (this.isGeneratingPdf.value) return false;
    this.isGeneratingPdf.value = true;

    try {
      const html2canvasModule: any = await import('html2canvas');
      const html2canvas =
        html2canvasModule && (html2canvasModule.default ?? html2canvasModule);
      const jsPDFModule: any = await import('jspdf');
      const jsPDF =
        jsPDFModule &&
        (jsPDFModule.jsPDF ?? jsPDFModule.default ?? jsPDFModule);

      const el = elRef.value as HTMLElement;

      const selector = opts.buttonSelector || '#dowBut';
      const downloadBtn = el.querySelector(selector) as HTMLElement | null;
      const prevDisplay = downloadBtn ? downloadBtn.style.display : null;
      if (downloadBtn) downloadBtn.style.display = 'none';

      await new Promise(r => setTimeout(r, 50));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        ...(opts.html2canvasOptions || {}),
      });

      if (downloadBtn && prevDisplay !== null) {
        downloadBtn.style.display = prevDisplay;
      }

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
      console.error('[StatisticsController] downloadPdf error', err);
      return false;
    } finally {
      this.isGeneratingPdf.value = false;
    }
  }

  getIsGeneratingPdf() {
    return this.isGeneratingPdf.value;
  }
}

export { StatisticsController };
