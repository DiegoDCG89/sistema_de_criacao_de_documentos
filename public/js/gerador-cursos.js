// public/js/gerador-cursos.js

import { mascaraCPF, mascaraIdt, mascaraPrecCP, mascaraTelefone, mascaraData } from './utils.js';

let dependentes = [];
let dadosFormularioAtual = null;

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  document.getElementById('cpf').addEventListener('input', e => e.target.value = mascaraCPF(e.target.value));
  document.getElementById('idt').addEventListener('input', e => e.target.value = mascaraIdt(e.target.value));
  document.getElementById('preccp').addEventListener('input', e => e.target.value = mascaraPrecCP(e.target.value));
  document.getElementById('telefone').addEventListener('input', e => e.target.value = mascaraTelefone(e.target.value));
  document.getElementById('dataDesligamento').addEventListener('input', e => e.target.value = mascaraData(e.target.value));
  document.getElementById('btn-add-dep').addEventListener('click', addDependente);
  document.getElementById('form-cursos').addEventListener('submit', processarFormulario);
  document.getElementById('btn-baixar-pdf').addEventListener('click', baixarPDFChecklist);
  renderDependentes();
});

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
        <div class="sm:col-span-5"><input type="text" placeholder="NOME COMPLETO" value="${dep.nome}" oninput="window.atualizarDep(${dep.id}, 'nome', this.value.toUpperCase())" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5 uppercase focus:ring-2 focus:ring-[#4B5320] outline-none"></div>
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
        <div class="sm:col-span-2"><input type="text" placeholder="Dt Nasc" value="${dep.dtNasc}" maxlength="10" oninput="window.aplicarMascaraDataDep(this, ${dep.id})" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-[#4B5320] outline-none"></div>
        <div class="sm:col-span-2 flex gap-1 items-center"><input type="number" placeholder="Idade" value="${dep.idade}" oninput="window.atualizarDep(${dep.id}, 'idade', this.value)" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-[#4B5320] outline-none"><button type="button" onclick="window.removerDependente(${dep.id})" class="text-red-500 hover:text-red-700 px-2 font-bold transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>
      </div>
    `;
  });
  if (window.lucide) lucide.createIcons();
}

// === NOVO UPLOAD PARA O GOOGLE DRIVE ===
async function subirArquivoParaServidor(blob, nomeArquivo, nomePasta) {
  const res = await fetch(`/api/upload?filename=${encodeURIComponent(nomeArquivo)}&folder=${encodeURIComponent(nomePasta)}`, { method: 'POST', body: blob });
  if (!res.ok) throw new Error(`Falha no upload: ${nomeArquivo}`);
  return await res.json();
}

async function obterImagemBrasao() {
  try {
    const response = await fetch('/img/brasao.png');
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch (error) {
    return null;
  }
}

async function processarFormulario(e) {
  e.preventDefault();
  const btnSubmit = document.querySelector('button[type="submit"]');
  const txtOriginalBtn = btnSubmit.innerHTML;
  btnSubmit.innerHTML = '<i data-lucide="loader" class="w-6 h-6 animate-spin"></i> Enviando para o Google Drive...';
  btnSubmit.disabled = true;

  try {
    const arrayBufferBrasao = await obterImagemBrasao();
    const temDependentes = document.querySelector('input[name="opt_dependentes"]:checked').value === 'sim';

    dadosFormularioAtual = {
      posto: document.getElementById('posto').value.trim(),
      nome: document.getElementById('nome').value.trim().toUpperCase(),
      cpf: document.getElementById('cpf').value.trim(),
      idt: document.getElementById('idt').value.trim(),
      preccp: document.getElementById('preccp').value.trim(),
      telefone: document.getElementById('telefone').value.trim(),
      curso: document.getElementById('curso').value.trim().toUpperCase(),
      omCurso: document.getElementById('omCurso').value.trim().toUpperCase(),
      guarnicaoCurso: document.getElementById('guarnicaoCurso').value.trim().toUpperCase(),
      adtDcem: document.getElementById('adtDcem').value.trim(),
      bi: document.getElementById('bi').value.trim(),
      dataDesligamento: document.getElementById('dataDesligamento').value.trim(),
      banco: document.getElementById('banco').value.trim(),
      agencia: document.getElementById('agencia').value.trim(),
      conta: document.getElementById('conta').value.trim(),
      dependentes: temDependentes ? [...dependentes] : []
    };

    const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, ImageRun } = window.docx;

    const elementosCabecalho = [];
    if (arrayBufferBrasao) {
      elementosCabecalho.push(
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: arrayBufferBrasao, transformation: { width: 70, height: 70 } })] })
      );
    }
    elementosCabecalho.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MINISTÉRIO DA DEFESA\nEXÉRCITO BRASILEIRO\nREGIMENTO ITORORÓ\n5º BATALHÃO DE INFANTARIA LEVE\n(Terço da Bahia/1631)", bold: true })] }));

    const gerarLinhaDep = (nome, grau, dtnasc, idade) => new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: nome })] }),
        new TableCell({ children: [new Paragraph({ text: grau })] }),
        new TableCell({ children: [new Paragraph({ text: dtnasc })] }),
        new TableCell({ children: [new Paragraph({ text: idade })] })
      ]
    });
    
    let rowsDep = [gerarLinhaDep("Nome", "Grau de parentesco", "Dt Nasc", "Idade")];
    if (dadosFormularioAtual.dependentes.length > 0) {
      dadosFormularioAtual.dependentes.forEach(d => rowsDep.push(gerarLinhaDep(d.nome, d.parentesco, d.dtNasc, d.idade)));
    } else {
      rowsDep.push(gerarLinhaDep("NÃO HÁ", "NÃO HÁ", "NÃO HÁ", "NÃO HÁ"));
    }
    const tabelaDep = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rowsDep });

    let txtDependentes = dadosFormularioAtual.dependentes.length > 0 
      ? dadosFormularioAtual.dependentes.map(d => `${d.nome} (${d.parentesco})`).join("; ") 
      : "NÃO HÁ";

    const docDIEx = new Document({
      sections: [{
        properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
        children: [
          ...elementosCabecalho,
          new Paragraph({ text: "DIEx S/Nº", bold: true, spacing: { before: 200, after: 200 } }),
          new Paragraph({ alignment: AlignmentType.RIGHT, text: `Lorena - SP, ${dataAtual}.`, spacing: { after: 200 } }),
          new Paragraph({ text: `Do ${dadosFormularioAtual.posto} ${dadosFormularioAtual.nome}` }),
          new Paragraph({ text: "Ao Sr Chefe da Divisão Administrativa" }),
          new Paragraph({ text: "Assunto: Solicitação de Indenização de Transporte e Ajuda de Custo", spacing: { before: 100, after: 100 } }),
          new Paragraph({ text: "Anexos: 1) 01(uma) cópia autenticada do Adt DCEM;" }),
          new Paragraph({ indent: { left: 900 }, text: "2) 01(uma) cópia autenticada do BI de transcrição do Adt DCEM;" }),
          new Paragraph({ indent: { left: 900 }, text: "3) 01 (uma) cópia autenticada do último contracheque;" }),
          new Paragraph({ indent: { left: 900 }, text: "4) 01 (uma) cópia autenticada da Declaração de Beneficiários; e", spacing: { after: 200 } }),
          
          new Paragraph({ alignment: AlignmentType.JUSTIFIED, text: `1. Tendo em vista a minha designação para o ${dadosFormularioAtual.curso}, ${dadosFormularioAtual.omCurso} - ${dadosFormularioAtual.guarnicaoCurso}, conforme publicado no ${dadosFormularioAtual.adtDcem}, transcrito no ${dadosFormularioAtual.bi} solicito indenização de Ajuda de Custo e Passagens.`, spacing: { after: 200 } }),
          
          new Paragraph({ text: "2. Informações Complementares:" }),
          new Paragraph({ text: `a. Previsão da data de desligamento: ${dadosFormularioAtual.dataDesligamento}` }),
          new Paragraph({ text: `b. CPF: ${dadosFormularioAtual.cpf}` }),
          new Paragraph({ text: `c. Identidade: ${dadosFormularioAtual.idt}` }),
          new Paragraph({ text: `d. Prec CP: ${dadosFormularioAtual.preccp}` }),
          new Paragraph({ text: `e. Banco: ${dadosFormularioAtual.banco} Agência: ${dadosFormularioAtual.agencia} Conta corrente: ${dadosFormularioAtual.conta}` }),
          new Paragraph({ text: "f. Data do Ajuste de Contas: 30 dias após o recebimento da nota de crédito." }),
          new Paragraph({ text: `g. Telefone contato: ${dadosFormularioAtual.telefone}`, spacing: { after: 200 } }),

          new Paragraph({ text: "3. Dependentes:" }),
          tabelaDep,

          new Paragraph({ alignment: AlignmentType.CENTER, text: `${dadosFormularioAtual.nome}  ${dadosFormularioAtual.posto}`, spacing: { top: 600 } }),
          new Paragraph({ alignment: AlignmentType.CENTER, text: `${dadosFormularioAtual.idt} / MD` })
        ]
      }]
    });

    const docBAR = new Document({
      sections: [{
        properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
        children: [
          new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 }, children: [
            new TextRun({ text: `Solicitou ao Chefe da Divisão Administrativa do Batalhão, a Indenização de Ajuda de Custo e passagens em virtude da designação para a realização do ${dadosFormularioAtual.curso}.` })
          ]}),
          new Paragraph({ text: "1. Tipo de Movimentação: Sem desligamento;" }),
          new Paragraph({ text: `2. Motivo da Movimentação: ${dadosFormularioAtual.curso};` }),
          new Paragraph({ text: "3. OM de Origem: 5º BIL Guarnição: Lorena - SP;" }),
          new Paragraph({ text: `4. OM de Destino: ${dadosFormularioAtual.omCurso} Guarnição: ${dadosFormularioAtual.guarnicaoCurso};` }),
          new Paragraph({ text: `5. Documento que autorizou a movimentação: ${dadosFormularioAtual.adtDcem};` }),
          new Paragraph({ text: "6. Data de ajuste de contas: Após o Recebimento do Crédito;" }),
          new Paragraph({ text: "7. Tipo de Pagamento: Ajuda de Custo e passagens;" }),
          new Paragraph({ text: `8. Dependentes: ${txtDependentes};` }),
          new Paragraph({ text: `9. CPF: ${dadosFormularioAtual.cpf}; e` }),
          new Paragraph({ text: `10. Domicílio Bancário: Banco: ${dadosFormularioAtual.banco} Agência: ${dadosFormularioAtual.agencia} Conta corrente: ${dadosFormularioAtual.conta}.`, spacing: { after: 200 } }),
          
          new Paragraph({ alignment: AlignmentType.JUSTIFIED, text: "Em consequência, o Ch Div Adm elabore o processo de pagamento da Indenização de Transporte e Ajuda de custo e demais interessados tomem as providências decorrentes.", spacing: { after: 400 } }),
          new Paragraph({ alignment: AlignmentType.RIGHT, text: `(Nota p/ BAR nº - DA.5, ${dataAtual})` })
        ]
      }]
    });

    const docOrdPagto = new Document({
      sections: [{
        properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
        children: [
          new Paragraph({ text: "ASSUNTO: INDENIZAÇÃO DE TRANSPORTE E AJUDA DE CUSTO - Pagamento", bold: true, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
          new Paragraph({ text: "Faz jus ao pagamento da indenização prevista na Portaria nº 290, de 9 DEZ 13:", spacing: { after: 200 } }),
          new Paragraph({ text: "1. Processo de Pagamento de Indenização;" }),
          new Paragraph({ text: `2. Favorecido: ${dadosFormularioAtual.nome};` }),
          new Paragraph({ text: `3. Posto/Graduação: ${dadosFormularioAtual.posto};` }),
          new Paragraph({ text: `4. CPF: ${dadosFormularioAtual.cpf};` }),
          new Paragraph({ text: "5. Dados Bancários:" }),
          new Paragraph({ text: `- Banco: ${dadosFormularioAtual.banco} Agência: ${dadosFormularioAtual.agencia} Conta corrente: ${dadosFormularioAtual.conta}` }),
          new Paragraph({ text: "6. Indenizações:", spacing: { before: 100 } }),
          new Paragraph({ text: "- Ajuda de Custo: R$ XXXXXX;" }),
          new Paragraph({ text: "- Indenização de Transporte: R$ XXXXXX;" }),
          new Paragraph({ text: "7. Total das Indenizações: R$ XXXXXX (VALOR POR EXTENSO);", spacing: { before: 100 } }),
          new Paragraph({ text: `8. Documento que autorizou o pagamento: ${dadosFormularioAtual.adtDcem};` }),
          new Paragraph({ text: "9. Nº da NC 2026NCXXX: - DATA (Ajuda de Custo) e Nº da NC 2026NCXXX: - DATA (Indz Transp);" }),
          new Paragraph({ text: "10. Cotista: DCEM; e" }),
          new Paragraph({ text: `11. Motivo da indenização: Designação para o ${dadosFormularioAtual.curso}, realizado na ${dadosFormularioAtual.omCurso} guarnição de ${dadosFormularioAtual.guarnicaoCurso}.`, spacing: { after: 400 } }),
          new Paragraph({ text: "Em consequência, a SALC providencie o empenho e o Setor Financeiro efetue o pagamento das referidas indenizações." }),
          new Paragraph({ text: `(Nota Nr - DA.5, ${dataAtual})`, alignment: AlignmentType.RIGHT, spacing: { top: 400 } })
        ]
      }]
    });

    const blobDIEx = await window.docx.Packer.toBlob(docDIEx);
    const blobBAR = await window.docx.Packer.toBlob(docBAR);
    const blobOrdPagto = await window.docx.Packer.toBlob(docOrdPagto);
    
    const docPdf = criarInstanciaPDF(dadosFormularioAtual);
    const blobPdf = docPdf.output('blob');

    // MÁGICA DA NUVEM (Google Drive)
    const nomeBase = `${dadosFormularioAtual.posto}_${dadosFormularioAtual.nome.replace(/\s+/g, '_')}_${Date.now()}`;
    const nomePasta = `Cursos - ${dadosFormularioAtual.posto} ${dadosFormularioAtual.nome}`;

    await subirArquivoParaServidor(blobPdf, `Checklist_Cursos_${nomeBase}.pdf`, nomePasta);
    await subirArquivoParaServidor(blobDIEx, `DIEx_Cursos_${nomeBase}.docx`, nomePasta);
    await subirArquivoParaServidor(blobBAR, `NotaBAR_Cursos_${nomeBase}.docx`, nomePasta);
    await subirArquivoParaServidor(blobOrdPagto, `OrdPagto_Cursos_${nomeBase}.docx`, nomePasta);

    // MÁGICA DO PROTOCOLO ADMIN
    const payloadReq = {
      id: 'CUR-' + Date.now().toString().slice(-6),
      dataCriacao: new Date().toLocaleDateString('pt-BR'),
      modalidade: 'Cursos / Estagios',
      posto: dadosFormularioAtual.posto,
      nomeCompleto: dadosFormularioAtual.nome,
      cpf: dadosFormularioAtual.cpf
    };

    const resDb = await fetch('/api/solicitacoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadReq) });
    if (!resDb.ok) throw new Error('Falha ao registrar no painel.');

    window.saveAs(blobDIEx, `DIEx_Cursos_${nomeBase}.docx`);
    window.saveAs(blobBAR, `NotaBAR_Cursos_${nomeBase}.docx`);
    window.saveAs(blobOrdPagto, `OrdPagto_Cursos_${nomeBase}.docx`);

    document.getElementById('modal-sucesso').classList.remove('hidden');

  } catch (erro) {
    alert('Erro: ' + erro.message);
  } finally {
    btnSubmit.innerHTML = txtOriginalBtn;
    btnSubmit.disabled = false;
    if (window.lucide) lucide.createIcons();
  }
}

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
  doc.text(`Cursos e Estágios`, 43, 66);
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
  doc.text('[   ] 01 (uma) cópia autenticada do BI de transcrição do Adt DCEM', 20, y); y += 8;
  doc.text('[   ] 01 (uma) cópia autenticada do último contracheque', 20, y); y += 8;
  doc.text('[   ] 01 (uma) cópia autenticada da Declaração de Beneficiários', 20, y); y += 8;
  return doc;
}

function baixarPDFChecklist() {
  if (!dadosFormularioAtual) return;
  const doc = criarInstanciaPDF(dadosFormularioAtual);
  doc.save(`Checklist_Cursos_${dadosFormularioAtual.posto}_${dadosFormularioAtual.nome.replace(/\s+/g, '_')}.pdf`);
}
