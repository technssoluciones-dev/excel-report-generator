/**
 * Analiza las filas iniciales para auto-detectar tipos de columnas y la clave principal
 * @param {Array<Object>} rows Muestra de registros cargados
 * @returns {Object} Columnas categorizadas y candidato a ID de consultorio
 */
function autoDetectColumns(rows) {
  if (!rows || rows.length === 0) {
    return { clinicColumn: null, numericColumns: [], textColumns: [] };
  }

  const sampleSize = Math.min(rows.length, 50);
  const keys = Object.keys(rows[0]);

  const numericColumns = [];
  const textColumns = [];
  let clinicColumn = null;

  // Palabras clave comunes para detectar la columna del consultorio
  const clinicKeywords = ['consultorio', 'clinica', 'centro', 'sucursal', 'sede', 'id_consultorio'];

  keys.forEach((key) => {
    const lowerKey = key.toLowerCase().trim();
    
    // 1. Detectar si es la columna identificadora del consultorio
    if (!clinicColumn && clinicKeywords.some(keyword => lowerKey.includes(keyword))) {
      clinicColumn = key;
    }

    // 2. Clasificar tipos de datos analizando la muestra
    let numericCount = 0;
    for (let i = 0; i < sampleSize; i++) {
      const val = rows[i][key];
      if (val !== null && val !== undefined && val !== '') {
        // Verifica si es un número válido (incluso si viene como string)
        if (!isNaN(Number(String(val).replace(',', '.')))) {
          numericCount++;
        }
      }
    }

    // Si más del 80% de la muestra es numérica, se clasifica como métrica
    if (numericCount / sampleSize >= 0.8) {
      numericColumns.push(key);
    } else {
      textColumns.push(key);
    }
  });

  // Fallback: Si no detectó por nombre, asigna la primera columna de texto
  if (!clinicColumn && textColumns.length > 0) {
    clinicColumn = textColumns[0];
  }

  return {
    clinicColumn,
    numericColumns,
    textColumns
  };
}

module.exports = { autoDetectColumns };