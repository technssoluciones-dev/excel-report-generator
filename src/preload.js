const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  /**
   * Solicita la lectura e inspección de columnas de un archivo
   * @param {string} filePath 
   */
  parseFile: (filePath) => ipcRenderer.invoke('parse-file', filePath),

  /**
   * Solicita la generación del reporte Excel
   * @param {Object} options 
   */
  generateReport: (options) => ipcRenderer.invoke('generate-report', options),

  /**
   * Abre un diálogo de selección de carpeta de salida
   */
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory')
});