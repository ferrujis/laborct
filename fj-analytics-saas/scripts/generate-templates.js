const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../templates');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function createBaseTemplate() {
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Veterinarios', 'Producao', '', 'Valores Fixos', '', 'Semana', 'Data', 'Horas Normais', 'Horas Noturnas'],
    ['joao.silva', 45000, '', 2000, '', 'Semana 1', '2026-01-01', 40, 8],
    ['joao.silva', 42000, '', 2000, '', 'Semana 2', '2026-01-08', 40, 8],
    ['maria.oliveira', 55000, '', 2200, '', 'Semana 1', '2026-01-01', 36, 12],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 5 }, { wch: 14 }, { wch: 5 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Base de dados');
  XLSX.writeFile(wb, path.join(dataDir, 'Planilha_sem_titulo.xlsx'));
  console.log('Created: Planilha_sem_titulo.xlsx');
}

function createAnalTemplate() {
  const wb = XLSX.utils.book_new();
  const clinicaData = [['Data', '', 'Procedimento', 'Veterinario', 'Paciente', 'Valor Lancado', 'Valor Tabela'], ['2026-01-01', '', 'Consulta Geral', 'joao.silva', 'Rex', 150, 180]];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(clinicaData), 'CLINICA');
  const interData = [['Data', '', 'Procedimento', 'Veterinario', 'Paciente', 'Valor Lancado', 'Valor Tabela'], ['2026-01-01', '', 'Internacao', 'joao.silva', 'Max', 500, 600]];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(interData), 'INTER');
  const cirurgicoData = [['Data', '', 'Procedimento', 'Veterinario', 'Paciente', 'Valor Lancado', 'Valor Tabela'], ['2026-01-01', '', 'Cirurgia', 'joao.silva', 'Luna', 350, 400]];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cirurgicoData), 'C. CIRURGICO');
  const labData = [['Data', '', 'Procedimento', 'Veterinario', 'Paciente', 'Valor Lancado', 'Valor Tabela'], ['2026-01-01', '', 'Hemograma', 'joao.silva', 'Rex', 45, 60]];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(labData), 'LAB');
  XLSX.writeFile(wb, path.join(dataDir, 'Analises_Balneario.xlsx'));
  console.log('Created: Analises_Balneario.xlsx');
}

function createCogsTemplate() {
  const wb = XLSX.utils.book_new();
  const cogsData = [['Data', 'Categoria', 'Fornecedor/Item', 'Valor'], ['2026-01-05', 'Veterinarios/CLT', 'Tatica Veterinaria', 15000], ['2026-01-10', 'Fornecedores/Labs', 'TM35 Labs', 2500], ['2026-01-20', 'Faturamento/Receita', 'Receita Clinica', 85000]];
  const ws = XLSX.utils.aoa_to_sheet(cogsData);
  ws['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Custos');
  XLSX.writeFile(wb, path.join(dataDir, 'Custos_Balneario.xlsx'));
  console.log('Created: Custos_Balneario.xlsx');
}

function createEscalaTemplate() {
  const wb = XLSX.utils.book_new();
  const escalaData = [['Escala de Plantao - Janeiro 2026'], [], ['01/01/2026~31/01/2026'], [], ['SEG 01/01', 'TER 02/01', 'QUA 03/01'], ['08:00~20:00', '08:00~20:00', '08:00~20:00'], ['Clinica', 'Clinica', 'Clinica'], ['Joao Silva(FJ)', 'Maria Oliveira(FJ)', 'Joao Silva(FJ)']];
  const ws = XLSX.utils.aoa_to_sheet(escalaData);
  ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Escala');
  XLSX.writeFile(wb, path.join(dataDir, 'Escalas_Balneario.xlsx'));
  console.log('Created: Escalas_Balneario.xlsx');
}

console.log('Generating Excel Templates...');
createBaseTemplate();
createAnalTemplate();
createCogsTemplate();
createEscalaTemplate();
console.log('Done!');
