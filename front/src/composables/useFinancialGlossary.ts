export interface GlossaryEntry {
  term: string
  definition: string
  formula?: string
}

export const financialGlossary: Record<string, GlossaryEntry> = {
  'Utilidad Bruta': {
    term: 'Utilidad Bruta',
    definition: 'Beneficio generado después de cubrir los gastos esenciales del periodo.',
    formula: 'Ingresos totales − Costo de Vida',
  },
  'Ahorro Operativo': {
    term: 'Ahorro Operativo',
    definition: 'Monto disponible después de gastos variables no esenciales.',
    formula: 'Utilidad Bruta − Gastos Discrecionales',
  },
  'Resultado Neto': {
    term: 'Resultado Neto',
    definition: 'Resultado final del periodo tras considerar todos los gastos, incluyendo financieros.',
    formula: 'Ahorro Operativo − Gastos Financieros',
  },
  Ingresos: {
    term: 'Ingresos',
    definition: 'Todo el dinero que entra en el periodo: salarios, inversiones y otros ingresos.',
    formula: 'Salario + Inversiones + Otros ingresos',
  },
  'Costo de Vida': {
    term: 'Costo de Vida',
    definition: 'Gastos necesarios para el día a día: vivienda, alimentación, transporte y salud.',
    formula: 'Vivienda + Alimentación + Transporte + Salud',
  },
  'Gastos Discrecionales': {
    term: 'Gastos Discrecionales',
    definition: 'Gastos no esenciales como entretenimiento y otros consumos optativos.',
    formula: 'Entretenimiento + Otros',
  },
  'Gastos Financieros': {
    term: 'Gastos Financieros',
    definition: 'Intereses, comisiones bancarias y costos relacionados con deudas y préstamos.',
    formula: 'Suma de todas las transacciones categorizadas como financieras',
  },
  Salario: {
    term: 'Salario',
    definition: 'Ingresos por nómina, sueldos o salarios del trabajo principal.',
  },
  Inversiones: {
    term: 'Inversiones',
    definition: 'Rendimientos de inversiones, dividendos o rentas por propiedades.',
  },
  'Otros ingresos': {
    term: 'Otros ingresos',
    definition: 'Ingresos que no encajan en salario ni inversiones.',
  },
  Vivienda: {
    term: 'Vivienda',
    definition: 'Gastos de renta, hipoteca, mantenimiento de casa o departamento.',
  },
  Alimentación: {
    term: 'Alimentación',
    definition: 'Gastos en supermercado, despensa, restaurantes y comida en general.',
  },
  Transporte: {
    term: 'Transporte',
    definition: 'Gasolina, Uber, taxi, camión, transporte público y relacionados.',
  },
  Salud: {
    term: 'Salud',
    definition: 'Consultas médicas, medicamentos, seguros de salud y farmacia.',
  },
  Entretenimiento: {
    term: 'Entretenimiento',
    definition: 'Cine, Netflix, Spotify, juegos y cualquier gasto de ocio.',
  },
  'Intereses y comisiones': {
    term: 'Intereses y comisiones',
    definition: 'Intereses de tarjetas de crédito, comisiones bancarias y costos financieros.',
  },
  Otros: {
    term: 'Otros',
    definition: 'Gastos o ingresos que no encajan en ninguna categoría anterior.',
  },
}

export function useGlossary(termKey: string): GlossaryEntry | undefined {
  return financialGlossary[termKey]
}
