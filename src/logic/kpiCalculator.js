const logger = require('./logger');

/**
 * Busca el valor de un campo probando diferentes variaciones de nombres de columnas
 */
function getNumericValue(row, possibleNames) {
  const keys = Object.keys(row);
  for (const name of possibleNames) {
    const foundKey = keys.find(k => k.toLowerCase().trim() === name.toLowerCase().trim());
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
      const val = parseFloat(String(row[foundKey]).replace(',', '.'));
      return isNaN(val) ? 0 : val;
    }
  }
  return 0;
}

/**
 * Calcula métricas clave adaptándose dinámicamente al formato del Excel
 */
function calculateKPIs(rows) {
  logger.info(`Iniciando cálculo de KPIs para ${rows.length} registros...`);

  return rows.map((row, index) => {
    // Mapeo flexible de columnas para soportar cualquier Excel
    const ingresos = getNumericValue(row, ['Ingresos ($)', 'Ingresos', 'ingresos', 'ingreso']);
    const gastos = getNumericValue(row, ['Gastos Operacionales ($)', 'Gastos ($)', 'Gastos', 'gastos']);
    const pacientes = getNumericValue(row, ['Total Pacientes', 'Pacientes', 'pacientes']);
    const consultas = getNumericValue(row, ['Consultas Realizadas', 'Consultas', 'consultas']);
    const medicos = getNumericValue(row, ['Personal Medico', 'Medicos', 'medicos']) || 1;
    const cancelaciones = getNumericValue(row, ['Consultas Canceladas', 'Cancelaciones', 'cancelaciones']);

    const marginOperacional = ingresos > 0 ? ((ingresos - gastos) / ingresos) * 100 : 0;
    const ingresoPorPaciente = pacientes > 0 ? ingresos / pacientes : 0;
    const tasaCancelacion = consultas > 0 ? (cancelaciones / consultas) * 100 : 0;
    const pacientesPorMedico = medicos > 0 ? pacientes / medicos : 0;
    const ingresoPorMedico = medicos > 0 ? ingresos / medicos : 0;

    const consultorioName = row['Consultorio'] || row['consultorio'] || `Consultorio ${index + 1}`;

    return {
      ...row,
      consultorioClean: consultorioName,
      ingresosClean: ingresos,
      gastosClean: gastos,
      kpis: {
        marginOperacional: Number(marginOperacional.toFixed(2)),
        ingresoPorPaciente: Number(ingresoPorPaciente.toFixed(2)),
        tasaCancelacion: Number(tasaCancelacion.toFixed(2)),
        pacientesPorMedico: Number(pacientesPorMedico.toFixed(2)),
        ingresoPorMedico: Number(ingresoPorMedico.toFixed(2))
      }
    };
  });
}

module.exports = { calculateKPIs };