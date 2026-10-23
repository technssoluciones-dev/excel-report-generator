/**
 * Compara dos conjuntos de datos correspondientes a distintos períodos de manera defensiva
 * @param {Array<Object>} periodA Datos del Período 1 (Base)
 * @param {Array<Object>} periodB Datos del Período 2 (Actual)
 * @param {string} clinicKey Nombre de la columna que identifica al consultorio
 * @param {Array<string>} metrics Lista de métricas a comparar
 * @returns {Array<Object>} Matriz comparativa
 */
function comparePeriods(periodA, periodB, clinicKey, metrics) {
  const validA = Array.isArray(periodA) ? periodA : [];
  const validB = Array.isArray(periodB) ? periodB : [];
  const validMetrics = Array.isArray(metrics) ? metrics : [];

  const effectiveClinicKey = clinicKey || 'Consultorio';
  const mapA = new Map();

  // Indexar el Período A
  validA.forEach(row => {
    if (row && row[effectiveClinicKey]) {
      const key = String(row[effectiveClinicKey]).trim().toLowerCase();
      mapA.set(key, row);
    }
  });

  const comparisonResult = [];

  // Recorrer Período B y calcular variaciones
  validB.forEach(rowB => {
    if (!rowB) return;

    const key = rowB[effectiveClinicKey] ? String(rowB[effectiveClinicKey]).trim().toLowerCase() : '';
    const rowA = mapA.get(key);
    const clinicName = rowB[effectiveClinicKey] || 'Consultorio Desconocido';
    const metricsComparison = {};

    validMetrics.forEach(metric => {
      const valA = rowA ? (parseFloat(String(rowA[metric] || 0).replace(',', '.')) || 0) : 0;
      const valB = parseFloat(String(rowB[metric] || 0).replace(',', '.')) || 0;

      const diffAbs = valB - valA;
      const diffPct = valA !== 0 ? (diffAbs / Math.abs(valA)) * 100 : (valB > 0 ? 100 : 0);

      metricsComparison[metric] = {
        periodA: valA,
        periodB: valB,
        diffAbs: Number(diffAbs.toFixed(2)),
        diffPct: Number(diffPct.toFixed(2))
      };
    });

    comparisonResult.push({
      consultorio: clinicName,
      isNew: !rowA,
      comparisons: metricsComparison
    });
  });

  return comparisonResult;
}

module.exports = { comparePeriods };