const ExcelJS = require('exceljs');
const logger = require('./logger');

/**
 * Genera el reporte Excel profesional con KPIs, semáforos, barras de datos y comparación entre períodos
 * @param {Array<Object>} data Datos procesados con KPIs del período principal
 * @param {string} outputPath Ruta del archivo de salida
 * @param {Array<Object>|null} comparisonData Datos de comparación entre períodos (opcional)
 */
async function generateExcelReport(data, outputPath, comparisonData = null) {
  logger.info(`Generando libro Excel en: ${outputPath}`);
  
  if (!data || data.length === 0) {
    logger.error('No hay datos recibidos para escribir en el Excel.');
    throw new Error('El conjunto de datos está vacío.');
  }

  const workbook = new ExcelJS.Workbook();

  // =============================================================
  // HOJA 1: RESUMEN DE KPIS (CON SEMÁFOROS Y BARRAS DE DATOS)
  // =============================================================
  const summarySheet = workbook.addWorksheet('Resumen KPIs');

  summarySheet.columns = [
    { header: 'Consultorio', key: 'consultorio', width: 25 },
    { header: 'Ingresos ($)', key: 'ingresos', width: 20 },
    { header: 'Margen Operativo (%)', key: 'marginOperacional', width: 22 },
    { header: 'Tasa Cancelación (%)', key: 'tasaCancelacion', width: 22 },
    { header: 'Ingreso / Paciente ($)', key: 'ingresoPorPaciente', width: 22 },
    { header: 'Pacientes / Médico', key: 'pacientesPorMedico', width: 20 }
  ];

  // Estilo de cabecera principal
  const headerRow = summarySheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Insertar filas de consultorios
  data.forEach((item) => {
    const row = summarySheet.addRow({
      consultorio: item.consultorioClean,
      ingresos: item.ingresosClean,
      marginOperacional: item.kpis ? item.kpis.marginOperacional : 0,
      tasaCancelacion: item.kpis ? item.kpis.tasaCancelacion : 0,
      ingresoPorPaciente: item.kpis ? item.kpis.ingresoPorPaciente : 0,
      pacientesPorMedico: item.kpis ? item.kpis.pacientesPorMedico : 0
    });

    // Formato de moneda para ingresos
    row.getCell('ingresos').numFmt = '"$"#,##0.00';
    row.getCell('ingresoPorPaciente').numFmt = '"$"#,##0.00';

    // Regla de Semáforo: Tasa de Cancelación
    const cancelVal = item.kpis ? item.kpis.tasaCancelacion : 0;
    const cancelCell = row.getCell('tasaCancelacion');
    if (cancelVal > 15) {
      cancelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC7CE' } };
      cancelCell.font = { color: { argb: '9C0006' }, bold: true };
    } else if (cancelVal >= 8) {
      cancelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEB9C' } };
      cancelCell.font = { color: { argb: '9C6500' } };
    } else {
      cancelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C6EFCE' } };
      cancelCell.font = { color: { argb: '006100' } };
    }
  });

  const lastRowIndex = data.length + 1;

  // Fila de Promedios con Fórmulas Nativas de Excel
  const totalRow = summarySheet.addRow({
    consultorio: 'PROMEDIO GENERAL',
    ingresos: { formula: `AVERAGE(B2:B${lastRowIndex})` },
    marginOperacional: { formula: `AVERAGE(C2:C${lastRowIndex})` },
    tasaCancelacion: { formula: `AVERAGE(D2:D${lastRowIndex})` },
    ingresoPorPaciente: { formula: `AVERAGE(E2:E${lastRowIndex})` },
    pacientesPorMedico: { formula: `AVERAGE(F2:F${lastRowIndex})` }
  });
  totalRow.font = { bold: true };
  totalRow.getCell('ingresos').numFmt = '"$"#,##0.00';
  totalRow.getCell('ingresoPorPaciente').numFmt = '"$"#,##0.00';

  // Micro-gráficos: Aplicar Barras de Datos en la columna de Ingresos (B2:B{lastRowIndex})
  summarySheet.addConditionalFormatting({
    ref: `B2:B${lastRowIndex}`,
    rules: [
      {
        type: 'dataBar',
        color: { argb: '638EC6' },
        cfvo: [
          { type: 'min' },
          { type: 'max' }
        ]
      }
    ]
  });

  // =============================================================
  // HOJA 2: ANÁLISIS DINÁMICO POR ESPECIALIDAD Y TURNO
  // =============================================================
  const pivotSheet = workbook.addWorksheet('Tabla Dinámica (Resumen)');
  
  pivotSheet.columns = [
    { header: 'Especialidad', key: 'especialidad', width: 22 },
    { header: 'Turno', key: 'turno', width: 15 },
    { header: 'Total Ingresos ($)', key: 'totalIngresos', width: 20 },
    { header: 'Promedio Pacientes', key: 'promPacientes', width: 20 }
  ];

  pivotSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  pivotSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5597' } };

  const groupedData = {};
  data.forEach(item => {
    const esp = item['Especialidad'] || item['especialidad'] || 'General';
    const tur = item['Turno'] || item['turno'] || 'Sin Turno';
    const key = `${esp} - ${tur}`;

    if (!groupedData[key]) {
      groupedData[key] = { especialidad: esp, turno: tur, ingresos: 0, pacientes: 0, count: 0 };
    }

    groupedData[key].ingresos += item.ingresosClean || 0;
    groupedData[key].pacientes += parseFloat(item['Total Pacientes'] || item['pacientes'] || 0);
    groupedData[key].count += 1;
  });

  Object.values(groupedData).forEach(group => {
    const row = pivotSheet.addRow({
      especialidad: group.especialidad,
      turno: group.turno,
      totalIngresos: group.ingresos,
      promPacientes: group.count > 0 ? Number((group.pacientes / group.count).toFixed(1)) : 0
    });
    row.getCell('totalIngresos').numFmt = '"$"#,##0.00';
  });

  // =============================================================
  // HOJA 3: COMPARATIVA ENTRE PERÍODOS (SI APLICA)
  // =============================================================
  if (Array.isArray(comparisonData) && comparisonData.length > 0) {
    const compSheet = workbook.addWorksheet('Comparativa Períodos');
    
    compSheet.columns = [
      { header: 'Consultorio', key: 'consultorio', width: 25 },
      { header: 'Métrica', key: 'metrica', width: 25 },
      { header: 'Período A', key: 'periodoA', width: 18 },
      { header: 'Período B', key: 'periodoB', width: 18 },
      { header: 'Var. Absoluta', key: 'diffAbs', width: 18 },
      { header: 'Var. Porcentual (%)', key: 'diffPct', width: 20 }
    ];

    compSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    compSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '333333' } };

    comparisonData.forEach(item => {
      if (item && item.comparisons) {
        Object.keys(item.comparisons).forEach(metricKey => {
          const comp = item.comparisons[metricKey];
          if (comp) {
            const row = compSheet.addRow({
              consultorio: item.consultorio,
              metrica: metricKey,
              periodoA: comp.periodA,
              periodoB: comp.periodB,
              diffAbs: comp.diffAbs,
              diffPct: comp.diffPct
            });

            const pctCell = row.getCell('diffPct');
            if (comp.diffPct < 0) {
              pctCell.font = { color: { argb: '9C0006' }, bold: true };
            } else if (comp.diffPct > 0) {
              pctCell.font = { color: { argb: '006100' }, bold: true };
            }
          }
        });
      }
    });
  }

  // =============================================================
  // HOJA 4: DATOS DETALLADOS (RESPALDO ORIGINAL)
  // =============================================================
  const detailsSheet = workbook.addWorksheet('Datos Detallados');
  const sampleKeys = Object.keys(data[0] || {}).filter(k => !['kpis', 'consultorioClean', 'ingresosClean', 'gastosClean'].includes(k));

  detailsSheet.columns = sampleKeys.map(key => ({ header: key, key: key, width: 20 }));
  detailsSheet.getRow(1).font = { bold: true };

  data.forEach(item => {
    const rowData = {};
    sampleKeys.forEach(k => { rowData[k] = item[k]; });
    detailsSheet.addRow(rowData);
  });

  // Guardar archivo Excel
  await workbook.xlsx.writeFile(outputPath);
  logger.info(`Archivo Excel generado correctamente con ${data.length} registros en: ${outputPath}`);
}

module.exports = { generateExcelReport };