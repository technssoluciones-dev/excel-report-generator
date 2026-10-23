const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const logger = require('./logic/logger');
const { loadFile } = require('./logic/fileLoader');
const { autoDetectColumns } = require('./logic/autoDetector');
const { calculateKPIs } = require('./logic/kpiCalculator');
const { generateExcelReport } = require('./logic/excelGenerator');
const { comparePeriods } = require('./logic/periodComparer');

function createWindow() {
  logger.info('Iniciando ventana principal de la aplicación...');
  
  const win = new BrowserWindow({
    width: 900,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile(path.join(__dirname, 'gui/index.html'));
}

// -------------------------------------------------------------
// HANDLERS IPC
// -------------------------------------------------------------

// 1. Análisis y detección dinámica de columnas al cargar un archivo
ipcMain.handle('parse-file', async (event, filePath) => {
  try {
    logger.info(`Solicitud parse-file recibida para: ${filePath}`);
    const raw = await loadFile(filePath);
    const data = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.data) ? raw.data : []);
    
    const detection = autoDetectColumns(data);
    
    logger.info(`Archivo leído correctamente. Filas: ${data.length}, Columnas: ${Object.keys(data[0] || {}).length}`);
    
    return {
      success: true,
      columns: Object.keys(data[0] || {}),
      detection,
      sampleData: data.slice(0, 5)
    };
  } catch (error) {
    logger.error(`Error en parse-file: ${error.message}`);
    return { success: false, message: error.message };
  }
});

// 2. Diálogo nativo para seleccionar la carpeta de destino
ipcMain.handle('select-output-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    logger.info(`Carpeta de salida seleccionada: ${result.filePaths[0]}`);
    return result.filePaths[0];
  }
  return null;
});

// 3. Proceso principal de cálculo de KPIs, comparación y generación de Excel
ipcMain.handle('generate-report', async (event, { filePath, secondFilePath, clinicColumn, metrics, outputPath }) => {
  try {
    logger.info(`Iniciando generación de reporte. Archivo principal: ${filePath}`);
    
    // Extraer datos del período principal
    const rawA = await loadFile(filePath);
    const rawDataA = Array.isArray(rawA) ? rawA : (rawA && Array.isArray(rawA.data) ? rawA.data : []);
    const processedDataA = calculateKPIs(rawDataA);
    
    // Extraer datos y procesar comparación entre períodos (si aplica)
    let comparisonData = null;
    if (secondFilePath) {
      logger.info(`Comparación entre períodos activada con segundo archivo: ${secondFilePath}`);
      const rawB = await loadFile(secondFilePath);
      const rawDataB = Array.isArray(rawB) ? rawB : (rawB && Array.isArray(rawB.data) ? rawB.data : []);
      
      const validMetrics = (Array.isArray(metrics) && metrics.length > 0)
        ? metrics 
        : ['Ingresos ($)', 'Gastos Operacionales ($)', 'Total Pacientes'];
        
      comparisonData = comparePeriods(rawDataA, rawDataB, clinicColumn || 'Consultorio', validMetrics);
    }
    
    // Determinar la ruta final del archivo de salida
    const finalOutputPath = outputPath 
      ? path.join(outputPath, 'Reporte_Consultorios.xlsx') 
      : path.join(path.dirname(filePath), 'Reporte_Consultorios.xlsx');

    // Generar el Excel multíhoja
    await generateExcelReport(processedDataA, finalOutputPath, comparisonData);
    logger.info(`Reporte creado exitosamente en: ${finalOutputPath}`);
    
    // Abrir automáticamente el archivo en el sistema operativo
    await shell.openPath(finalOutputPath);

    return { success: true, message: `Reporte generado con éxito en: ${finalOutputPath}` };
  } catch (error) {
    logger.error(`Error durante la generación del reporte: ${error.stack || error.message}`);
    return { success: false, message: error.message };
  }
});

// -------------------------------------------------------------
// CICLO DE VIDA DE ELECTRON
// -------------------------------------------------------------

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});