let parsedData = null;

const fileInput = document.getElementById('fileInput');
const clinicColumnSelect = document.getElementById('clinicColumnSelect');
const availableMetrics = document.getElementById('availableMetrics');
const selectedMetrics = document.getElementById('selectedMetrics');
const addBtn = document.getElementById('addBtn');
const removeBtn = document.getElementById('removeBtn');
const enablePeriodCompare = document.getElementById('enablePeriodCompare');
const secondFileInput = document.getElementById('secondFileInput');
const selectOutputDirBtn = document.getElementById('selectOutputDirBtn');
const outputDirPath = document.getElementById('outputDirPath');
const generateBtn = document.getElementById('generateBtn');
const consoleLog = document.getElementById('consoleLog');

let selectedOutputPath = '';

function appendLog(message, type = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  consoleLog.appendChild(entry);
  consoleLog.scrollTop = consoleLog.scrollHeight;
}

// ① Carga y análisis del archivo primario
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  appendLog(`Cargando archivo: ${file.name}...`, 'info');
  
  const response = await window.api.parseFile(file.path);
  if (response.success) {
    parsedData = response;
    appendLog(`Archivo leído con éxito. Se detectaron ${response.columns.length} columnas.`, 'ok');

    clinicColumnSelect.innerHTML = '';
    response.columns.forEach(col => {
      const opt = document.createElement('option');
      opt.value = col;
      opt.textContent = col;
      if (response.detection.clinicColumn && col.toLowerCase() === response.detection.clinicColumn.toLowerCase()) {
        opt.selected = true;
      }
      clinicColumnSelect.appendChild(opt);
    });

    availableMetrics.innerHTML = '';
    selectedMetrics.innerHTML = '';
    const metricsToDisplay = response.detection.numericColumns.length > 0 
      ? response.detection.numericColumns 
      : response.columns;

    metricsToDisplay.forEach(col => {
      if (col !== clinicColumnSelect.value) {
        const opt = document.createElement('option');
        opt.value = col;
        opt.textContent = col;
        availableMetrics.appendChild(opt);
      }
    });

    appendLog(`Identificador sugerido: '${clinicColumnSelect.value}'`, 'kpi');
  } else {
    appendLog(`Error al leer archivo: ${response.message}`, 'error');
  }
});

function moveOptions(source, target) {
  const selected = Array.from(source.selectedOptions);
  selected.forEach(option => target.appendChild(option));
}

addBtn.addEventListener('click', () => moveOptions(availableMetrics, selectedMetrics));
removeBtn.addEventListener('click', () => moveOptions(selectedMetrics, availableMetrics));
availableMetrics.addEventListener('dblclick', () => moveOptions(availableMetrics, selectedMetrics));
selectedMetrics.addEventListener('dblclick', () => moveOptions(selectedMetrics, availableMetrics));

enablePeriodCompare.addEventListener('change', (e) => {
  secondFileInput.disabled = !e.target.checked;
  if (e.target.checked) {
    appendLog('Comparación entre períodos activada. Seleccione el segundo archivo.', 'warn');
  }
});

selectOutputDirBtn.addEventListener('click', async () => {
  const dir = await window.api.selectOutputDirectory();
  if (dir) {
    selectedOutputPath = dir;
    outputDirPath.textContent = dir;
    appendLog(`Carpeta de destino: ${dir}`, 'info');
  }
});

// ⑥ Generación de Reporte - Envío completo de parámetros IPC
generateBtn.addEventListener('click', async () => {
  if (!fileInput.files[0]) {
    appendLog('Error: Debe seleccionar un archivo de entrada primero.', 'error');
    return;
  }

  appendLog('Procesando datos y generando reporte Excel...', 'kpi');

  const metrics = Array.from(selectedMetrics.options).map(o => o.value);
  const isCompareEnabled = enablePeriodCompare.checked;
  const secondFile = isCompareEnabled && secondFileInput.files[0] ? secondFileInput.files[0].path : null;

  const result = await window.api.generateReport({
    filePath: fileInput.files[0].path,
    secondFilePath: secondFile,
    clinicColumn: clinicColumnSelect.value,
    metrics: metrics,
    outputPath: selectedOutputPath
  });

  if (result.success) {
    appendLog(result.message, 'ok');
  } else {
    appendLog(`Fallo al generar reporte: ${result.message}`, 'error');
  }
});