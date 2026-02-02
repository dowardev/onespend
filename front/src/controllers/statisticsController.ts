import { ref, reactive, type Ref } from 'vue';
import { format } from 'date-fns';
import { formatLocalDate } from '@/utils/date';
import { DixieController } from './dixie';

export type Html2CanvasOptions = Record<string, unknown>;
export type JsPdfOptions = { orientation?: string; unit?: string; format?: string };

export type UsePdfReportOptions = {
  containerRef: HTMLElement | Ref<HTMLElement | null> | null;
  buttonSelector?: string;
  filenameFactory?: () => string;
  html2canvasOptions?: Html2CanvasOptions;
  jspdfOptions?: JsPdfOptions;
};

interface ProviderValue {
  efectivo?: number | null | undefined;
  tarjeta?: number | null | undefined;
  credito?: number | null | undefined;
  estimated?: number | null | undefined;
}

interface SnapshotData {
  totalSales: number;
  netProfit: number;
}

interface SetSnapshotsPayload {
  current?: SnapshotData;
  previous?: SnapshotData;
}

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

  private snapshots = reactive<{ current: SnapshotData; previous: SnapshotData }>({
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

  getPopovers() {
    return this.popovers;
  }

  isoDate(params: { d: Date }) {
    const { d } = params;
    return formatLocalDate({ d });
  }

  providerValue(p: ProviderValue) {
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

  formatCurrency(val: number | string | null | undefined) {
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

  formatPercent(val: number | string | null | undefined) {
    const n = Number(val ?? 0);
    if (!Number.isFinite(n)) return '0';
    return String(Math.round(n));
  }

  // Return the ref so callers can read/write `.value`
  getModalOpen() {
    return this.modalOpen;
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

  setSnapshots(payload: SetSnapshotsPayload) {
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
    console.log('[StatisticsController] downloadPdf started');
    if (!opts || !opts.containerRef) {
      console.log('[StatisticsController] No containerRef');
      return false;
    }
    
    // Handle both Ref and direct HTMLElement
    let el: HTMLElement;
    if (opts.containerRef instanceof HTMLElement) {
      el = opts.containerRef;
    } else if (opts.containerRef && 'value' in opts.containerRef) {
      el = opts.containerRef.value as HTMLElement;
    } else {
      console.warn('[StatisticsController] container element not available');
      return false;
    }
    
    if (!el) {
      console.warn('[StatisticsController] container element is null');
      return false;
    }

    if (this.isGeneratingPdf.value) {
      console.log('[StatisticsController] Already generating PDF');
      return false;
    }
    this.isGeneratingPdf.value = true;

    try {
      console.log('[StatisticsController] Importing html2canvas and jspdf...');
      const html2canvasModule = await import('html2canvas');
      const html2canvas =
        html2canvasModule && (html2canvasModule.default ?? html2canvasModule);
      const jsPDFModule = await import('jspdf');
      const jsPDF =
        jsPDFModule &&
        (jsPDFModule.jsPDF ?? jsPDFModule.default ?? jsPDFModule);

      console.log('[StatisticsController] html2canvas:', !!html2canvas, 'jspdf:', !!jsPDF);

      console.log('[StatisticsController] Element found:', !!el);

      const selector = opts.buttonSelector || '#dowBut';
      const downloadBtn = el.querySelector(selector) as HTMLElement | null;
      console.log('[StatisticsController] downloadBtn found:', !!downloadBtn);
      const prevDisplay = downloadBtn ? downloadBtn.style.display : null;
      if (downloadBtn) downloadBtn.style.display = 'none';

      // Apply white theme and hide elements not needed in PDF
      const originalClassName = el.className;
      el.classList.add('pdf-report-mode');
      
      // Create a style element for PDF mode
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        .pdf-report-mode {
          background-color: #ffffff !important;
          color: #000000 !important;
        }
        .pdf-report-mode ion-button {
          display: none !important;
        }
        .pdf-report-mode ion-item {
          --background: #ffffff !important;
          background-color: #ffffff !important;
        }
        .pdf-report-mode ion-item.transparent {
          --background: #ffffff !important;
          background-color: #ffffff !important;
        }
        .pdf-report-mode .list-content {
          background-color: #ffffff !important;
        }
        .pdf-report-mode .positive-profit, 
        .pdf-report-mode .negative-profit {
          background-color: #f5f5f5 !important;
          border: 1px solid #e0e0e0 !important;
          border-radius: 4px;
          padding: 4px 8px;
        }
        .pdf-report-mode .positive-profit {
          color: #155724 !important;
        }
        .pdf-report-mode .negative-profit {
          color: #721c24 !important;
        }
        .pdf-report-mode ion-card-title {
          color: #000000 !important;
        }
        .pdf-report-mode ion-list-header {
          --background: #ffffff !important;
          background-color: #ffffff !important;
        }
        .pdf-report-mode ion-label {
          color: #000000 !important;
        }
        .pdf-report-mode ion-note {
          color: #000000 !important;
        }
      `;
      document.head.appendChild(styleEl);

      console.log('[StatisticsController] Creating canvas...');
      await new Promise(r => setTimeout(r, 50));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        ...(opts.html2canvasOptions || {}),
      });
      console.log('[StatisticsController] Canvas created:', canvas.width, 'x', canvas.height);

      // Clean up PDF mode styles
      el.className = originalClassName;
      document.head.removeChild(styleEl);

      if (downloadBtn && prevDisplay !== null) {
        downloadBtn.style.display = prevDisplay;
      }

      const imgData = canvas.toDataURL('image/png');
      console.log('[StatisticsController] imgData length:', imgData.length);

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

      console.log('[StatisticsController] Adding image to PDF...');
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
      console.log('[StatisticsController] Saving PDF:', filename);
      pdf.save(filename);
      console.log('[StatisticsController] PDF saved successfully');

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

  async downloadExcel(opts: {
    period: string;
    dateLabel: string;
    incomeData: {
      salary: number;
      investments: number;
      other: number;
      total: number;
    };
    expensesData: {
      housing: number;
      food: number;
      transport: number;
      entertainment: number;
      health: number;
      other: number;
      total: number;
    };
    summaryData: {
      balance: number;
      savings: number;
      savingsPercentage: number;
    };
    configData: {
      savingsPercent: number;
    };
    filenameFactory?: () => string;
  }): Promise<boolean> {
    try {
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.aoa_to_sheet([]);

      const periodLabels: Record<string, string> = {
        day: 'Día',
        week: 'Semana',
        month: 'Mes',
        year: 'Año',
      };

      let row = 1;

      worksheet['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }];

      XLSX.utils.sheet_add_aoa(worksheet, [[`Reporte de ${periodLabels[opts.period]} ${opts.dateLabel}`]], { origin: `A${row}` });
      row += 2;

      XLSX.utils.sheet_add_aoa(worksheet, [['INGRESOS']], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Concepto', 'Monto']], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Salario', opts.incomeData.salary]], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Inversiones', opts.incomeData.investments]], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Otros', opts.incomeData.other]], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['TOTAL INGRESOS', opts.incomeData.total]], { origin: `A${row}` });
      row += 2;

      XLSX.utils.sheet_add_aoa(worksheet, [['GASTOS']], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Concepto', 'Monto']], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Vivienda', opts.expensesData.housing]], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Alimentación', opts.expensesData.food]], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Transporte', opts.expensesData.transport]], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Entretenimiento', opts.expensesData.entertainment]], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Salud', opts.expensesData.health]], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Otros', opts.expensesData.other]], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['TOTAL GASTOS', opts.expensesData.total]], { origin: `A${row}` });
      row += 2;

      XLSX.utils.sheet_add_aoa(worksheet, [['RESUMEN']], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Balance', opts.summaryData.balance]], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Ahorro', opts.summaryData.savings]], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Porcentaje de ahorro', `${opts.summaryData.savingsPercentage}%`]], { origin: `A${row}` });
      row += 2;

      XLSX.utils.sheet_add_aoa(worksheet, [['CONFIGURACIÓN']], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Porcentaje esperado', `${opts.configData.savingsPercent}%`]], { origin: `A${row}` });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');

      const filename = opts.filenameFactory
        ? opts.filenameFactory()
        : `reporte_${opts.period}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      XLSX.writeFile(workbook, filename);

      console.log('[StatisticsController] Excel saved successfully');
      return true;
    } catch (err) {
      console.error('[StatisticsController] downloadExcel error', err);
      return false;
    }
  }
}

export { StatisticsController };
