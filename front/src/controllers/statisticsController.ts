// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { format } from 'date-fns';
import { translate } from '@/i18n';

class StatisticsController {
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
        day: translate('common.periodDay'),
        week: translate('common.periodWeek'),
        month: translate('common.periodMonth'),
        year: translate('common.periodYear'),
      };

      let row = 1;

      worksheet['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }];

      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.excel.reportTitle', { period: periodLabels[opts.period], date: opts.dateLabel })]],
        { origin: `A${row}` },
      );
      row += 2;

      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.excel.concept'), translate('statistics.excel.amount')]],
        { origin: `A${row}` },
      );
      row++;
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.performance.useincomestatement.label.salary'), opts.incomeData.salary]],
        {
          origin: `A${row}`,
        },
      );
      row++;
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.performance.useincomestatement.label.investments'), opts.incomeData.investments]],
        {
          origin: `A${row}`,
        },
      );
      row++;
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.performance.useincomestatement.label.other'), opts.incomeData.other]],
        {
          origin: `A${row}`,
        },
      );
      row++;
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.excel.totalIncomes'), opts.incomeData.total]],
        {
          origin: `A${row}`,
        },
      );
      row += 2;

      XLSX.utils.sheet_add_aoa(worksheet, [[translate('statistics.excel.expenses')]], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.excel.concept'), translate('statistics.excel.amount')]],
        { origin: `A${row}` },
      );
      row++;
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.performance.useincomestatement.label.housing'), opts.expensesData.housing]],
        {
          origin: `A${row}`,
        },
      );
      row++;
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.performance.useincomestatement.label.food'), opts.expensesData.food]],
        {
          origin: `A${row}`,
        },
      );
      row++;
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.performance.useincomestatement.label.transport'), opts.expensesData.transport]],
        {
          origin: `A${row}`,
        },
      );
      row++;
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.performance.useincomestatement.label.entertainment'), opts.expensesData.entertainment]],
        {
          origin: `A${row}`,
        },
      );
      row++;
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.performance.useincomestatement.label.health'), opts.expensesData.health]],
        {
          origin: `A${row}`,
        },
      );
      row++;
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.performance.useincomestatement.label.other'), opts.expensesData.other]],
        {
          origin: `A${row}`,
        },
      );
      row++;
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.excel.totalExpenses'), opts.expensesData.total]],
        {
          origin: `A${row}`,
        },
      );
      row += 2;

      XLSX.utils.sheet_add_aoa(worksheet, [[translate('statistics.excel.summary')]], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.excel.balance'), opts.summaryData.balance]],
        {
          origin: `A${row}`,
        },
      );
      row++;
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.excel.savings'), opts.summaryData.savings]],
        {
          origin: `A${row}`,
        },
      );
      row++;
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.excel.savingsPercent'), `${opts.summaryData.savingsPercentage}%`]],
        { origin: `A${row}` },
      );
      row += 2;

      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.excel.configuration')]],
        { origin: `A${row}` },
      );
      row++;
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[translate('statistics.excel.expectedPercent'), `${opts.configData.savingsPercent}%`]],
        { origin: `A${row}` },
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, translate('statistics.excel.sheetName'));

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
