// public/js/gerador-movimentacao.js

import { mascaraCPF, mascaraIdt, mascaraPrecCP, mascaraTelefone, mascaraData, obterDataExtenso } from './utils.js';

let dependentes = [];
let dadosFormularioAtual = null;

// ==========================================
// 1. INICIALIZAÇÃO E MÁSCARAS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  // Aplica as máscaras
  document.getElementById('cpf').addEventListener('input', e => e.target.value = mascaraCPF(e.target.value));
  document.getElementById('idt').addEventListener('input', e => e.target.value = mascaraIdt(e.target.value));
  document.getElementById('preccp').addEventListener('input', e => e.target.value = mascaraPrecCP(e.target.value));
  document.getElementById('telefone').addEventListener('input', e => e.target.value = mascaraTelefone(e.target.value));

  // Event Listeners
  document.getElementById('btn-add-dep').addEventListener('click', addDependente);
  document.getElementById('form-movimentacao').addEventListener('submit', processarFormulario);
  document.getElementById('btn-baixar-pdf').addEventListener('click', baixarPDFChecklist);

  renderDependentes();
});

// ==========================================
// 2. LÓGICA DE DEPENDENTES (IDÊNTICO À IMAGEM)
// ==========================================
function addDependente() {
  dependentes.push({ id: Date.now(), nome: '', parentesco: 'Esposa', dtNasc: '', idade: '' });
  renderDependentes();
}

window.removerDependente = (id) => {
  dependentes = dependentes.filter(d => d.id !== id);
  renderDependentes();
};

window.atualizarDep = (id, campo, valor) => {
  const dep = dependentes.find(d => d.id === id);
  if (dep) dep[campo] = valor;
};

window.aplicarMascaraDataDep = (input, id) => {
  input.value = mascaraData(input.value);
  window.atualizarDep(id, 'dtNasc', input.value);
};

function renderDependentes() {
  const container = document.getElementById('lista-dependentes');
  container.innerHTML = '';
  
  if (dependentes.length === 0) return;

  dependentes.forEach(dep => {
    container.innerHTML += `
      <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-2.5 rounded border border-stone-200 shadow-sm">
        <div class="sm:col-span-5">
          <input type="text" placeholder="NOME COMPLETO" value="${dep.nome}" oninput="window.atualizarDep(${dep.id}, 'nome', this.value.toUpperCase())" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5 uppercase focus:ring-2 focus:ring-[#4B5320] outline-none">
        </div>
        <div class="sm:col-span-3">
          <select onchange="window.atualizarDep(${dep.id}, 'parentesco', this.value)" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5 bg-white focus:ring-2 focus:ring-[#4B5320] outline-none">
            <option value="Esposa" ${dep.parentesco === 'Esposa' ? 'selected' : ''}>Esposa</option>
            <option value="Companheiro(a)" ${dep.parentesco === 'Companheiro(a)' ? 'selected' : ''}>Companheiro(a)</option>
            <option value="Filho(a)" ${dep.parentesco === 'Filho(a)' ? 'selected' : ''}>Filho(a)</option>
            <option value="Enteado(a)" ${dep.parentesco === 'Enteado(a)' ? 'selected' : ''}>Enteado(a)</option>
            <option value="Pai" ${dep.parentesco === 'Pai' ? 'selected' : ''}>Pai</option>
            <option value="Mãe" ${dep.parentesco === 'Mãe' ? 'selected' : ''}>Mãe</option>
            <option value="Outro" ${dep.parentesco === 'Outro' ? 'selected' : ''}>Outro</option>
          </select>
        </div>
        <div class="sm:col-span-2">
          <input type="text" placeholder="Dt Nasc" value="${dep.dtNasc}" maxlength="10" oninput="window.aplicarMascaraDataDep(this, ${dep.id})" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-[#4B5320] outline-none">
        </div>
        <div class="sm:col-span-2 flex gap-1 items-center">
          <input type="number" placeholder="Idade" value="${dep.idade}" oninput="window.atualizarDep(${dep.id}, 'idade', this.value)" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-[#4B5320] outline-none">
          <button type="button" onclick="window.removerDependente(${dep.id})" class="text-red-500 hover:text-red-700 px-2 font-bold transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  });
  if (window.lucide) lucide.createIcons();
}

// ==========================================
// 3. COMUNICAÇÃO COM O SERVIDOR
// ==========================================
async function subirArquivoParaServidor(blob, nomeArquivo) {
  const res = await fetch(`/api/upload?filename=${encodeURIComponent(nomeArquivo)}`, {
    method: 'POST',
    body: blob
  });
  if (!res.ok) throw new Error(`Falha no upload do arquivo ${nomeArquivo}`);
  const data = await res.json();
  return data.url;
}

// ==========================================
// 4. PROCESSAMENTO DO FORMULÁRIO E ANEXOS
// ==========================================
async function processarFormulario(e) {
  e.preventDefault();

  const btnSubmit = document.querySelector('button[type="submit"]');
  const txtOriginalBtn = btnSubmit.innerHTML;
  btnSubmit.innerHTML = '<i data-lucide="loader" class="w-6 h-6 animate-spin"></i> Preparando documentos...';
  btnSubmit.disabled = true;
  if (window.lucide) lucide.createIcons();

  try {
    // Coleta as opções de rádio
    const temCarro = document.querySelector('input[name="opt_carro"]:checked').value === 'sim';
    const temMoto = document.querySelector('input[name="opt_moto"]:checked').value === 'sim';
    const temDependentes = document.querySelector('input[name="opt_dependentes"]:checked').value === 'sim';
    const acompanham = temDependentes && document.querySelector('input[name="opt_acompanham"]:checked').value === 'sim';

    dadosFormularioAtual = {
      posto: document.getElementById('posto').value.trim(),
      nome: document.getElementById('nome').value.trim().toUpperCase(),
      cpf: document.getElementById('cpf').value.trim(),
      idt: document.getElementById('idt').value.trim(),
      preccp: document.getElementById('preccp').value.trim(),
      telefone: document.getElementById('telefone').value.trim(),
      banco: document.getElementById('banco').value.trim(),
      agencia: document.getElementById('agencia').value.trim(),
      conta: document.getElementById('conta').value.trim(),
      temCarro,
      temMoto,
      dependentes: acompanham ? [...dependentes] : []
    };

    // Atualiza a lista visual de anexos no Modal de Sucesso
    atualizarListaAnexosModal(temCarro, temMoto);

    // Geração do Checklist em PDF
    const docPdf = criarInstanciaPDF(dadosFormularioAtual);
    const blobPdf = docPdf.output('blob');

    // ----------------------------------------------------
    // UPLOAD E BANCO DE DADOS
    // ----------------------------------------------------
    const nomeUnico = `${dadosFormularioAtual.posto}_${dadosFormularioAtual.nome.replace(/\s+/g, '_')}_${Date.now()}`;
    const urlPdfDocs = await subirArquivoParaServidor(blobPdf, `Checklist_Movimentacao_${nomeUnico}.pdf`);

    const payloadReq = {
      id: 'MOV-' + Date.now().toString().slice(-6),
      dataCriacao: new Date().toLocaleDateString('pt-BR'),
      modalidade: 'Movimentacao',
      omDestino: 'A preencher',
      posto: dadosFormularioAtual.posto,
      nomeCompleto: dadosFormularioAtual.nome,
      cpf: dadosFormularioAtual.cpf,
      urlPdfDocs: urlPdfDocs,
      // URLS dos DOCS do Word entrarão aqui depois
    };

    const resDb = await fetch('/api/solicitacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadReq)
    });

    if (!resDb.ok) throw new Error('Não foi possível registrar a solicitação no painel.');

    document.getElementById('modal-sucesso').classList.remove('hidden');

  } catch (erro) {
    console.error(erro);
    alert('Erro ao processar solicitação: ' + erro.message);
  } finally {
    btnSubmit.innerHTML = txtOriginalBtn;
    btnSubmit.disabled = false;
    if (window.lucide) lucide.createIcons();
  }
}

// Atualiza a interface do modal dinamicamente
function atualizarListaAnexosModal(temCarro, temMoto) {
  const lista = document.getElementById('lista-anexos-final');
  let html = `
    <li>Cópia autenticada do Adt DCEM</li>
    <li>Cópia do BI da transcrição do Adt DCEM</li>
    <li>Cópia do último contracheque</li>
    <li>Declaração de Beneficiários</li>
  `;
  if (temCarro) html += `<li>Cópia autenticada do CRLV do automóvel</li>`;
  if (temMoto) html += `<li>Cópia autenticada do CRLV da motocicleta</li>`;
  
  lista.innerHTML = html;
}

// ==========================================
// 5. GERAÇÃO DO CHECKLIST (PDF)
// ==========================================
function criarInstanciaPDF(dados) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('MINISTÉRIO DA DEFESA', 105, 20, { align: 'center' });
  doc.text('EXÉRCITO BRASILEIRO', 105, 26, { align: 'center' });
  doc.text('5º BATALHÃO DE INFANTARIA LEVE', 105, 32, { align: 'center' });
  
  doc.setDrawColor(75, 83, 32); 
  doc.setLineWidth(0.5); 
  doc.line(20, 38, 190, 38);

  doc.setFontSize(14);
  doc.text('RELAÇÃO DE DOCUMENTOS (ANEXOS)', 105, 48, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Militar:`, 20, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`${dados.posto} ${dados.nome}`, 35, 60);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Modalidade:`, 20, 66);
  doc.setFont('helvetica', 'normal');
  doc.text(`Movimentação / Transferência`, 43, 66);

  doc.setFillColor(254, 226, 226); 
  doc.setDrawColor(220, 38, 38);   
  doc.setLineWidth(0.5);
  doc.roundedRect(20, 75, 170, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); 
  doc.text('O MILITAR DEVERÁ COMPARECER A DIVISÃO ADMINISTRATIVA', 105, 81, { align: 'center' });
  doc.text('PARA ASSINATURA E ENTREGA DE DOCUMENTOS', 105, 87, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('ANEXOS NECESSÁRIOS:', 20, 105);
  
  doc.setFont('helvetica', 'normal');
  let y = 115;
  doc.text('[   ] 01 (uma) cópia autenticada do Adt DCEM', 20, y); y += 8;
  doc.text('[   ] 01 (uma) cópia do BI da transcrição do Adt DCEM', 20, y); y += 8;
  doc.text('[   ] 01 (uma) cópia do último contracheque', 20, y); y += 8;
  doc.text('[   ] 01 (uma) cópia da Declaração de Beneficiários', 20, y); y += 8;
  
  if (dados.temCarro) {
    doc.text('[   ] 01 (uma) cópia autenticada do CRLV do automóvel', 20, y); y += 8;
  }
  if (dados.temMoto) {
    doc.text('[   ] 01 (uma) cópia autenticada do CRLV da motocicleta', 20, y); y += 8;
  }

  return doc;
}

function baixarPDFChecklist() {
  if (!dadosFormularioAtual) return;
  const doc = criarInstanciaPDF(dadosFormularioAtual);
  doc.save(`Checklist_Movimentacao_${dadosFormularioAtual.posto}_${dadosFormularioAtual.nome.replace(/\s+/g, '_')}.pdf`);
}
