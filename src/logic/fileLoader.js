const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const csv = require('csv-parser');

/**
 * Lee cualquier archivo (CSV, Excel, JSON) y devuelve una lista de objetos
 * @param {string} filePath 
 * @returns {Promise<Array<Object>>}
 */
async function loadFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.json') {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData);
  } 

  if (ext === '.csv') {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (err) => reject(err));
    });
  }

  if (['.xlsx', '.xls'].includes(ext)) {
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  }

  throw new Error(`Formato no soportado: ${ext}`);
}

module.exports = { loadFile };