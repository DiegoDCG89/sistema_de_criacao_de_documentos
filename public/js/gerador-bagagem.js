// public/js/gerador-bagagem.js

import { mascaraCPF, mascaraIdt, mascaraPrecCP, mascaraTelefone, mascaraData, obterDataExtenso } from './utils.js';

// Estado global da tela
let dependentes = [];
let dadosFormularioAtual = null;

// ==========================================
// 1. INICIALIZAÇÃO E MÁSCARAS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Inicializa os ícones
  if (window.lucide) lucide.createIcons();

  // Aplica as máscaras importadas aos inputs
  document.getElementById('cpf').addEventListener('input', e => e.target.value = mascaraCPF(e.target.value));
  document.getElementById('idt').addEventListener('input', e => e.target.value = mascaraIdt(e.target.value));
  document.getElementById('preccp').addEventListener('input', e => e.target.value = mascaraPrecCP(e.target.value));
  document.getElementById('telefone').addEventListener('input', e => e.target.value = mascaraTelefone(e.target.value));
  document.getElementById('dataOcupacao').addEventListener('input', e => e.target.value = mascaraData(e.target.value));

  // Event Listeners dos botões
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

// Como estamos usando ES Modules, precisamos atrelar essas funções ao window
// para que o HTML gerado dinamicamente consiga enxergá-las.
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
          <input type="text" placeholder="Parentesco (Ex: Esposa)" value="${dep.parentesco}" oninput="window.atualizarDep(${dep.id}, 'parentesco', this.value)" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5">
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
// 3. PROCESSAMENTO E GERAÇÃO DOS ARQUIVOS
// ==========================================
async function processarFormulario(e) {
  e.preventDefault();

  dadosFormularioAtual = {
    posto: document.getElementById('posto').value.trim(),
    nome: document.getElementById('nome').value.trim().toUpperCase(),
    cpf: document.getElementById('cpf').value.trim(),
    idt: document.getElementById('idt').value.trim(),
    preccp: document.getElementById('preccp').value.trim(),
    telefone: document.getElementById('telefone').value.trim(),
    email: document.getElementById('email').value.trim(),
    banco: document.getElementById('banco').value.trim(),
    agencia: document.getElementById('agencia').value.trim(),
    conta: document.getElementById('conta').value.trim(),
    bi: document.getElementById('bi').value.trim(),
    dataOcupacao: document.getElementById('dataOcupacao').value.trim(),
    dependentes: [...dependentes]
  };

  const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType } = window.docx;

  // ----------------------------------------------------
  // GERAÇÃO DO DIEx
  // ----------------------------------------------------
  let tabelaDependentes;
  if (dadosFormularioAtual.dependentes.length > 0) {
    const rows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nome", bold: true, size: 24 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Grau de parentesco", bold: true, size: 24 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Dt Nasc", bold: true, size: 24 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Idade", bold: true, size: 24 })] })] }),
        ]
      })
    ];
    dadosFormularioAtual.dependentes.forEach(d => {
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: d.nome || "-", size: 24 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: d.parentesco || "-", size: 24 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: d.dtNasc || "-", size: 24 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: d.idade || "-", size: 24 })] })] }),
        ]
      }));
    });
    tabelaDependentes = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rows });
  } else {
    tabelaDependentes = new Paragraph({ children: [new TextRun({ text: "Não possui dependentes.", size: 24 })] });
  }

  const docDIEx = new Document({
    sections: [{
      properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MINISTÉRIO DA DEFESA\nEXÉRCITO BRASILEIRO\n5° BATALHÃO DE INFANTARIA LEVE\n(Terço da Bahia/1631)\nREGIMENTO ITORORÓ", bold: true, size: 24 })] }),
        new Paragraph({ spacing: { before: 400, after: 200 }, children: [
          new TextRun({ text: "DIEx S/Nº", bold: true, size: 24 }),
          new TextRun({ text: `\t\t\t\tLorena - SP, ${obterDataExtenso()}.`, size: 24 })
        ]}),
        new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Do ", bold: true, size: 24 }), new TextRun({ text: `${dadosFormularioAtual.nome}`, size: 24 })] }),
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Ao Sr Chefe da Divisão Administrativa", bold: true, size: 24 })] }),
        new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Assunto: ", bold: true, size: 24 }), new TextRun({ text: "Solicitação de Indenização de Transporte de Bagagem na mesma Sede", size: 24 })] }),
        new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: "Anexos: 1) 01(uma) cópia autenticada do BAR da ocupação de PNR;", bold: true, size: 24 })] }),
        new Paragraph({ spacing: { after: 200 }, indent: { left: 900 }, children: [new TextRun({ text: "2) 01 (uma) cópia autenticada do último contracheque, com o desconto do PNR;", bold: true, size: 24 })] }),
        
        new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 }, indent: { firstLine: 700 }, children: [
          new TextRun({ text: `1. Tendo em vista a minha ocupação de PNR, Publicado em ${dadosFormularioAtual.bi}, solicito indenização de Bagagem na mesma Sede, com amparo no inciso IV, da letra d, do artigo 48, da Portaria nº 290-DGP, de 9 DEZ 13.`, size: 24 })
        ]}),

        new Paragraph({ spacing: { after: 100 }, indent: { firstLine: 700 }, children: [new TextRun({ text: "2. Informações Complementares:", bold: true, size: 24 })] }),
        new Paragraph({ indent: { left: 700 }, children: [new TextRun({ text: `a. CPF: ${dadosFormularioAtual.cpf}`, size: 24 })] }),
        new Paragraph({ indent: { left: 700 }, children: [new TextRun({ text: `b. Identidade militar: ${dadosFormularioAtual.idt}`, size: 24 })] }),
        new Paragraph({ indent: { left: 700 }, children: [new TextRun({ text: `c. Prec CP: ${dadosFormularioAtual.preccp}`, size: 24 })] }),
        new Paragraph({ indent: { left: 700 }, children: [new TextRun({ text: `d. Banco: ${dadosFormularioAtual.banco}   Agência: ${dadosFormularioAtual.agencia}   Conta corrente: ${dadosFormularioAtual.conta}`, size: 24 })] }),
        new Paragraph({ indent: { left: 700 }, children: [new TextRun({ text: `e. Data do Ajuste de Contas: após o recebimento da Nota de Crédito.`, size: 24 })] }),
        new Paragraph({ indent: { left: 700 }, children: [new TextRun({ text: `f. Telefone contato: ${dadosFormularioAtual.telefone}`, size: 24 })] }),
        new Paragraph({ indent: { left: 700 }, spacing: { after: 200 }, children: [new TextRun({ text: `g. Email: ${dadosFormularioAtual.email}`, size: 24 })] }),

        new Paragraph({ spacing: { after: 100 }, indent: { firstLine: 700 }, children: [new TextRun({ text: "3. Dependentes:", bold: true, size: 24 })] }),
        tabelaDependentes,

        new Paragraph({ spacing: { before: 400, after: 400 }, children: [
          new TextRun({ text: "OBS: De acordo com a Port nº 290-DGP, de 9 Dez 13 e sob a pena prevista no Art 312 do Código Penal Militar (CPM).", bold: true, size: 24 })
        ]}),

        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${dadosFormularioAtual.nome} – ${dadosFormularioAtual.posto}`, bold: true, size: 24 })] }),
        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Idt ${dadosFormularioAtual.idt} / MD`, size: 24 })] })
      ]
    }]
  });

  // ----------------------------------------------------
  // GERAÇÃO DA NOTA PARA BAR
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
        new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "1. Tipo de Movimentação: ", bold: true, size: 24 }), new TextRun({ text: "Sem desligamento", size: 24 })] }),
        new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "2. Motivo da movimentação: ", bold: true, size: 24 }), new TextRun({ text: "Mudança de residência na mesma Sede", size: 24 })] }),
        new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "3. OM de Origem: ", bold: true, size: 24 }), new TextRun({ text: "5º BIL Guarnição: Lorena-SP", size: 24 })] }),
        new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "4. OM de Destino: ", bold: true, size: 24 }), new TextRun({ text: "5º BIL Guarnição: Lorena-SP", size: 24 })] }),
        new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "5. Documento que autorizou a movimentação: ", bold: true, size: 24 }), new TextRun({ text: dadosFormularioAtual.bi, size: 24 })] }),
        new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "6. Tipo de Pagamento: ", bold: true, size: 24 }), new TextRun({ text: "Indenização de Transporte de Bagagem na mesma Sede", size: 24 })] }),
        new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "7. Dependentes: ", bold: true, size: 24 }), new TextRun({ text: textoDepBAR, size: 24 })] }),
        new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "8. CPF: ", bold: true, size: 24 }), new TextRun({ text: dadosFormularioAtual.cpf, size: 24 })] }),
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "9. Domicílio Bancário: ", bold: true, size: 24 }), new TextRun({ text: `- Banco: ${dadosFormularioAtual.banco}, Agência: ${dadosFormularioAtual.agencia} Conta: ${dadosFormularioAtual.conta}`, size: 24 })] }),
        
        new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 }, children: [
          new TextRun({ text: "Em consequência a divisão administrativa elabore o processo de pagamento da indenização de transporte de bagagem e demais interessados tomem as providências decorrentes.", size: 24 })
        ]}),
        new Paragraph({ alignment: AlignmentType.RIGHT, children: [
          new TextRun({ text: `(Nota p/ BAR nº - DA.5, de ${obterDataExtenso().split(' de ').slice(1).join(' de ')})`, italics: true, size: 24 })
        ]})
      ]
    }]
  });

  // Executa o download automático
  const blobDIEx = await window.docx.Packer.toBlob(docDIEx);
  window.saveAs(blobDIEx, `DIEx_Bagagem_${dadosFormularioAtual.posto}_${dadosFormularioAtual.nome.replace(/\s+/g, '_')}.docx`);

  const blobBAR = await window.docx.Packer.toBlob(docBAR);
  window.saveAs(blobBAR, `Nota_BAR_Bagagem_${dadosFormularioAtual.posto}_${dadosFormularioAtual.nome.replace(/\s+/g, '_')}.docx`);

  // Exibe o modal de sucesso na interface
  document.getElementById('modal-sucesso').classList.remove('hidden');
}


// ==========================================
// 4. GERAÇÃO DO CHECKLIST (PDF)
// ==========================================
function baixarPDFChecklist() {
  if (!dadosFormularioAtual) return;

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

  // Dados
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Militar:`, 20, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`${dadosFormularioAtual.posto} ${dadosFormularioAtual.nome}`, 35, 60);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Modalidade:`, 20, 66);
  doc.setFont('helvetica', 'normal');
  doc.text(`Transporte de Bagagem na Mesma Sede (PNR)`, 43, 66);

  // Alerta Vermelho
  doc.setFillColor(254, 226, 226); 
  doc.setDrawColor(220, 38, 38);   
  doc.setLineWidth(0.5);
  doc.roundedRect(20, 75, 170, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); 
  doc.text('O MILITAR DEVERÁ COMPARECER A DIVISÃO ADMINISTRATIVA', 105, 81, { align: 'center' });
  doc.text('PARA ASSINATURA E ENTREGA DE DOCUMENTOS', 105, 87, { align: 'center' });

  // Checklist
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('ANEXOS NECESSÁRIOS:', 20, 105);
  
  doc.setFont('helvetica', 'normal');
  doc.text('[   ] 01 (uma) cópia autenticada do BAR da ocupação de PNR', 20, 115);
  doc.text('[   ] 01 (uma) cópia autenticada do último contracheque, com o desconto do PNR', 20, 123);
  doc.text('[   ] DIEx de Opção assinado', 20, 131);

  doc.save(`Checklist_Bagagem_${dadosFormularioAtual.posto}_${dadosFormularioAtual.nome.replace(/\s+/g, '_')}.pdf`);
}
