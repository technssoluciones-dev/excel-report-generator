const fs = require('fs');
const path = require('path');

const logFilePath = path.join(process.cwd(), 'app.log');

/**
 * Escribe un mensaje con marca de tiempo en el archivo app.log
 * @param {string} level 'INFO' | 'WARN' | 'ERROR' | 'KPI'
 * @param {string} message 
 */
function writeLog(level, message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  
  // Imprimir en consola de Node
  console.log(logLine.trim());
  
  // Guardar en archivo
  try {
    fs.appendFileSync(logFilePath, logLine, 'utf8');
  } catch (err) {
    console.error('Error al escribir en app.log:', err);
  }
}

module.exports = {
  info: (msg) => writeLog('INFO', msg),
  warn: (msg) => writeLog('WARN', msg),
  error: (msg) => writeLog('ERROR', msg),
  kpi: (msg) => writeLog('KPI', msg)
};