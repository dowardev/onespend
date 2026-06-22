import { format } from 'date-fns';

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
        day: 'Día',
        week: 'Semana',
        month: 'Mes',
        year: 'Año',
      };

      let row = 1;

      worksheet['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }];

      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[`Reporte de ${periodLabels[opts.period]} ${opts.dateLabel}`]],
        { origin: `A${row}` },
      );
      row += 2;

      XLSX.utils.sheet_add_aoa(worksheet, [['INGRESOS']], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Concepto', 'Monto']], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Salario', opts.incomeData.salary]], {
        origin: `A${row}`,
      });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Inversiones', opts.incomeData.investments]], {
        origin: `A${row}`,
      });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Otros', opts.incomeData.other]], {
        origin: `A${row}`,
      });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['TOTAL INGRESOS', opts.incomeData.total]], {
        origin: `A${row}`,
      });
      row += 2;

      XLSX.utils.sheet_add_aoa(worksheet, [['GASTOS']], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Concepto', 'Monto']], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Vivienda', opts.expensesData.housing]], {
        origin: `A${row}`,
      });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Alimentación', opts.expensesData.food]], {
        origin: `A${row}`,
      });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Transporte', opts.expensesData.transport]], {
        origin: `A${row}`,
      });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Entretenimiento', opts.expensesData.entertainment]], {
        origin: `A${row}`,
      });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Salud', opts.expensesData.health]], {
        origin: `A${row}`,
      });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Otros', opts.expensesData.other]], {
        origin: `A${row}`,
      });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['TOTAL GASTOS', opts.expensesData.total]], {
        origin: `A${row}`,
      });
      row += 2;

      XLSX.utils.sheet_add_aoa(worksheet, [['RESUMEN']], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Balance', opts.summaryData.balance]], {
        origin: `A${row}`,
      });
      row++;
      XLSX.utils.sheet_add_aoa(worksheet, [['Ahorro', opts.summaryData.savings]], {
        origin: `A${row}`,
      });
      row++;
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [['Porcentaje de ahorro', `${opts.summaryData.savingsPercentage}%`]],
        { origin: `A${row}` },
      );
      row += 2;

      XLSX.utils.sheet_add_aoa(worksheet, [['CONFIGURACIÓN']], { origin: `A${row}` });
      row++;
      XLSX.utils.sheet_add_aoa(
        worksheet,
        [['Porcentaje esperado', `${opts.configData.savingsPercent}%`]],
        { origin: `A${row}` },
      );

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
