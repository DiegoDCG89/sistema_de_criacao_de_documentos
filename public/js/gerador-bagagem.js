// public/js/gerador-bagagem.js

import { mascaraCPF, mascaraIdt, mascaraPrecCP, mascaraTelefone, mascaraData, obterDataExtenso } from './utils.js';

let dependentes = [];
let dadosFormularioAtual = null;

// ==========================================
// 1. INICIALIZAÇÃO E MÁSCARAS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  document.getElementById('cpf').addEventListener('input', e => e.target.value = mascaraCPF(e.target.value));
  document.getElementById('idt').addEventListener('input', e => e.target.value = mascaraIdt(e.target.value));
  document.getElementById('preccp').addEventListener('input', e => e.target.value = mascaraPrecCP(e.target.value));
  document.getElementById('telefone').addEventListener('input', e => e.target.value = mascaraTelefone(e.target.value));
  document.getElementById('dataOcupacao').addEventListener('input', e => e.target.value = mascaraData(e.target.value));

  document.getElementById('btn-add-dep').addEventListener('click', addDependente);
  document.getElementById('form-bagagem').addEventListener('submit', processarFormulario);
  document.getElementById('btn-baixar-pdf').addEventListener('click', baixarPDFChecklist);

  renderDependentes();
});

// ==========================================
// 2. LÓGICA DE DEPENDENTES
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
  
  if (dependentes.length === 0) {
    container.innerHTML = '<p class="text-xs text-stone-500 italic">Nenhum dependente adicionado. (Opcional)</p>';
    return;
  }

  dependentes.forEach(dep => {
    container.innerHTML += `
      <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-stone-50 p-2.5 rounded border border-stone-200">
        <div class="sm:col-span-5">
          <input type="text" placeholder="Nome Completo" value="${dep.nome}" oninput="window.atualizarDep(${dep.id}, 'nome', this.value.toUpperCase())" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5 uppercase">
        </div>
        <div class="sm:col-span-3">
          <select onchange="window.atualizarDep(${dep.id}, 'parentesco', this.value)" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5 bg-white">
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
          <input type="text" placeholder="Dt Nasc" value="${dep.dtNasc}" maxlength="10" oninput="window.aplicarMascaraDataDep(this, ${dep.id})" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5">
        </div>
        <div class="sm:col-span-2 flex gap-1">
          <input type="number" placeholder="Idade" value="${dep.idade}" oninput="window.atualizarDep(${dep.id}, 'idade', this.value)" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5">
          <button type="button" onclick="window.removerDependente(${dep.id})" class="text-red-500 hover:text-red-700 px-2 font-bold"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
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
// 4. PROCESSAMENTO E GERAÇÃO DOS ARQUIVOS
// ==========================================
async function processarFormulario(e) {
  e.preventDefault();

  const btnSubmit = document.querySelector('button[type="submit"]');
  const txtOriginalBtn = btnSubmit.innerHTML;
  btnSubmit.innerHTML = '<i data-lucide="loader" class="w-6 h-6 animate-spin"></i> Enviando para a Nuvem...';
  btnSubmit.disabled = true;
  if (window.lucide) lucide.createIcons();

  try {
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
      bi: document.getElementById('bi').value.trim(),
      dataOcupacao: document.getElementById('dataOcupacao').value.trim(),
      dependentes: [...dependentes]
    };

    const { Document, Packer, Paragraph, TextRun, AlignmentType } = window.docx;

    // ----------------------------------------------------
    // GERAÇÃO DO DIEx (Modelo exato CMSE)
    // ----------------------------------------------------
    const docDIEx = new Document({
      sections: [{
        properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MINISTÉRIO DA DEFESA\nEXÉRCITO BRASILEIRO\n5° BATALHÃO DE INFANTARIA LEVE\n(Terço da Bahia/1631)\nREGIMENTO ITORORÓ", bold: true, size: 24 })] }),
          new Paragraph({ spacing: { before: 400, after: 400 }, children: [
            new TextRun({ text: "DIEx S/Nº", bold: true, size: 24 }),
            new TextRun({ text: `\t\t\t\tLorena - SP, ${obterDataExtenso()}.`, size: 24 })
          ]}),
          new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 }, children: [
            new TextRun({ text: `Solicito o encaminhamento deste documento e anexo ao CMSE, a fim de que seja feito o repasse, para esta OM, dos recursos necessários para o pagamento de indenização de transporte de bagagem na mesma sede ao ${dadosFormularioAtual.posto} ${dadosFormularioAtual.nome}, conforme dados abaixo:`, size: 24 })
          ]}),
          new Paragraph({ children: [new TextRun({ text: "OM: 5º Batalhão de Infantaria Leve;", size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: "CODUG: 160472;", size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: "CODOM: 007260;", size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: `POSTO/NOME: ${dadosFormularioAtual.posto} ${dadosFormularioAtual.nome};`, size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: "DISTÂNCIA (SISCOD): Até 50 Km;", size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: "BAGAGEM: 50 metros cúbicos;", size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: `BAR OCUPAÇÃO do PNR: ${dadosFormularioAtual.bi}; e`, size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: "BAR DIEx Opção: BAR nº XXX/5º BIL de XX MÊS XX.", size: 24 })] })
        ]
      }]
    });

    // ----------------------------------------------------
    // GERAÇÃO DA NOTA PARA BAR (Modelo Exato)
    // ----------------------------------------------------
    let textoDepBAR = 'Não possui';
    if (dadosFormularioAtual.dependentes.length > 0) {
      textoDepBAR = dadosFormularioAtual.dependentes.map(d => `${d.nome} – ${d.parentesco}`).join('; ');
    }

    const docBAR = new Document({
      sections: [{
        properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
        children: [
          new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 }, children: [
            new TextRun({ text: `Solicitou o pagamento de indenização de transporte de bagagem na mesma sede, em virtude da ocupação de PNR ocorrida em ${dadosFormularioAtual.dataOcupacao}, conforme publicado no ${dadosFormularioAtual.bi}.`, size: 24 })
          ]}),
          new Paragraph({ children: [new TextRun({ text: "1. Tipo de Movimentação: ", size: 24 }), new TextRun({ text: "Sem desligamento", size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: "2. Motivo da movimentação: ", size: 24 }), new TextRun({ text: "Mudança de residência na mesma Sede", size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: "3. OM de Origem: ", size: 24 }), new TextRun({ text: "5º BIL Guarnição: Lorena-SP", size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: "4. OM de Destino: ", size: 24 }), new TextRun({ text: "5º BIL Guarnição: Lorena-SP", size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: "5. Documento que autorizou a movimentação: ", size: 24 }), new TextRun({ text: dadosFormularioAtual.bi, size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: "6. Tipo de Pagamento: ", size: 24 }), new TextRun({ text: "Indenização de Transporte de Bagagem na mesma Sede", size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: "7. Dependentes: ", size: 24 }), new TextRun({ text: textoDepBAR, size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: "8. CPF: ", size: 24 }), new TextRun({ text: dadosFormularioAtual.cpf, size: 24 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "9. Domicílio Bancário: ", size: 24 }), new TextRun({ text: `- Banco: ${dadosFormularioAtual.banco}, Agência: ${dadosFormularioAtual.agencia} Conta: ${dadosFormularioAtual.conta}`, size: 24 })] }),
          
          new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 }, children: [
            new TextRun({ text: "Em consequência a divisão administrativa elabore o processo de pagamento da indenização de transporte de bagagem e demais interessados tomem as providências decorrentes.", size: 24 })
          ]}),
          new Paragraph({ children: [
            new TextRun({ text: `(Nota p/ BAR nº - DA.5, de ${obterDataExtenso().split(' de ').slice(1).join(' de ')})`, size: 24 })
          ]})
        ]
      }]
    });

    // ----------------------------------------------------
    // CONVERSÃO E UPLOAD
    // ----------------------------------------------------
    const blobDIEx = await window.docx.Packer.toBlob(docDIEx);
    const blobBAR = await window.docx.Packer.toBlob(docBAR);
    const docPdf = criarInstanciaPDF(dadosFormularioAtual);
    const blobPdf = docPdf.output('blob');

    const nomeUnico = `${dadosFormularioAtual.posto}_${dadosFormularioAtual.nome.replace(/\s+/g, '_')}_${Date.now()}`;
    
    const urlDiex = await subirArquivoParaServidor(blobDIEx, `DIEx_Bagagem_${nomeUnico}.docx`);
    const urlNotaBar = await subirArquivoParaServidor(blobBAR, `Nota_BAR_Bagagem_${nomeUnico}.docx`);
    const urlPdfDocs = await subirArquivoParaServidor(blobPdf, `Checklist_Bagagem_${nomeUnico}.pdf`);

    // ----------------------------------------------------
    // SALVAR NO BANCO DE DADOS
    // ----------------------------------------------------
    const payloadReq = {
      id: 'REQ-' + Date.now().toString().slice(-6),
      dataCriacao: new Date().toLocaleDateString('pt-BR'),
      modalidade: 'transporte_pnr',
      omDestino: '5º BIL Guarnição: Lorena-SP',
      posto: dadosFormularioAtual.posto,
      nomeCompleto: dadosFormularioAtual.nome,
      cpf: dadosFormularioAtual.cpf,
      urlDiex: urlDiex,
      urlNotaBar: urlNotaBar,
      urlPdfDocs: urlPdfDocs
    };

    const resDb = await fetch('/api/solicitacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadReq)
    });

    if (!resDb.ok) throw new Error('Não foi possível registrar a solicitação no painel.');

    window.saveAs(blobDIEx, `DIEx_Bagagem_${nomeUnico}.docx`);
    window.saveAs(blobBAR, `Nota_BAR_Bagagem_${nomeUnico}.docx`);

    document.getElementById('modal-sucesso').classList.remove('hidden');

  } catch (erro) {
    console.error(erro);
    alert('Erro ao enviar solicitação: ' + erro.message);
  } finally {
    btnSubmit.innerHTML = txtOriginalBtn;
    btnSubmit.disabled = false;
    if (window.lucide) lucide.createIcons();
  }
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
  doc.text(`Transporte de Bagagem na Mesma Sede (PNR)`, 43, 66);

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
  doc.text('[   ] 01 (uma) cópia autenticada do BAR da ocupação de PNR', 20, 115);
  doc.text('[   ] 01 (uma) cópia autenticada do último contracheque, com o desconto do PNR', 20, 123);
  doc.text('[   ] DIEx de Opção assinado', 20, 131);

  return doc;
}

function baixarPDFChecklist() {
  if (!dadosFormularioAtual) return;
  const doc = criarInstanciaPDF(dadosFormularioAtual);
  doc.save(`Checklist_Bagagem_${dadosFormularioAtual.posto}_${dadosFormularioAtual.nome.replace(/\s+/g, '_')}.pdf`);
}
