/**
 * Distancia Levenshtein para sugerir coincidencias en texto
 */
function levenshteinDistance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () => 
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Valida los datos e identifica errores comunes
 */
function validateDataset(data, knownClinics = []) {
  const errors = [];
  const warnings = [];

  data.forEach((row, index) => {
    const rowNum = index + 2;

    // Validación de nulos y negativos
    if (!row.consultorio) {
      errors.push(`Fila ${rowNum}: El nombre del consultorio está vacío.`);
    }

    if (row.ingresos < 0 || row.gastos < 0) {
      warnings.push(`Fila ${rowNum}: Contiene valores financieros negativos en '${row.consultorio}'.`);
    }

    // Sugerencia de nombre si difiere ligeramente de una lista conocida
    if (row.consultorio && knownClinics.length > 0) {
      knownClinics.forEach((known) => {
        const dist = levenshteinDistance(
          row.consultorio.toLowerCase(), 
          known.toLowerCase()
        );
        if (dist > 0 && dist <= 2) {
          warnings.push(
            `Fila ${rowNum}: '${row.consultorio}' no coincide. ¿Quisiste decir '${known}'?`
          );
        }
      });
    }
  });

  return { errors, warnings };
}

module.exports = { validateDataset };