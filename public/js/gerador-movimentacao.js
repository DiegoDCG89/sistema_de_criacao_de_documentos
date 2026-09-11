import { mascaraCPF, mascaraIdt, mascaraPrecCP, mascaraTelefone, mascaraData, obterDataExtenso } from './utils.js';

let dependentes = [];
let dadosFormularioAtual = null;

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  document.getElementById('cpf').addEventListener('input', e => e.target.value = mascaraCPF(e.target.value));
  document.getElementById('idt').addEventListener('input', e => e.target.value = mascaraIdt(e.target.value));
  document.getElementById('preccp').addEventListener('input', e => e.target.value = mascaraPrecCP(e.target.value));
  document.getElementById('telefone').addEventListener('input', e => e.target.value = mascaraTelefone(e.target.value));
  document.getElementById('dataOcupacao').addEventListener('input', e => e.target.value = mascaraData(e.target.value));
  document.getElementById('dataDesligamento').addEventListener('input', e => e.target.value = mascaraData(e.target.value));
  document.getElementById('btn-add-dep').addEventListener('click', addDependente);
  document.getElementById('form-movimentacao').addEventListener('submit', processarFormulario);
  document.getElementById('btn-baixar-pdf').addEventListener('click', baixarPDFChecklist);
  renderDependentes();
});

function addDependente() {
  dependentes.push({ id: Date.now(), nome: '', parentesco: 'Esposa', dtNasc: '', idade: '' });
  renderDependentes();
}

window.removerDependente = (id) => { dependentes = dependentes.filter(d => d.id !== id); renderDependentes(); };
window.atualizarDep = (id, campo, valor) => { const dep = dependentes.find(d => d.id === id); if (dep) dep[campo] = valor; };
window.aplicarMascaraDataDep = (input, id) => { input.value = mascaraData(input.value); window.atualizarDep(id, 'dtNasc', input.value); };

function renderDependentes() {
  const container = document.getElementById('lista-dependentes');
  container.innerHTML = '';
  if (dependentes.length === 0) return;
  dependentes.forEach(dep => {
    container.innerHTML += `
      <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-2.5 rounded border border-stone-200 shadow-sm">
        <div class="sm:col-span-5"><input type="text" placeholder="NOME COMPLETO" value="${dep.nome}" oninput="window.atualizarDep(${dep.id}, 'nome', this.value.toUpperCase())" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5 uppercase outline-none"></div>
        <div class="sm:col-span-3">
          <select onchange="window.atualizarDep(${dep.id}, 'parentesco', this.value)" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5 bg-white outline-none">
            <option value="Esposa" ${dep.parentesco === 'Esposa' ? 'selected' : ''}>Esposa</option>
            <option value="Companheiro(a)" ${dep.parentesco === 'Companheiro(a)' ? 'selected' : ''}>Companheiro(a)</option>
            <option value="Filho(a)" ${dep.parentesco === 'Filho(a)' ? 'selected' : ''}>Filho(a)</option>
            <option value="Enteado(a)" ${dep.parentesco === 'Enteado(a)' ? 'selected' : ''}>Enteado(a)</option>
            <option value="Pai" ${dep.parentesco === 'Pai' ? 'selected' : ''}>Pai</option>
            <option value="Mãe" ${dep.parentesco === 'Mãe' ? 'selected' : ''}>Mãe</option>
            <option value="Outro" ${dep.parentesco === 'Outro' ? 'selected' : ''}>Outro</option>
          </select>
        </div>
        <div class="sm:col-span-2"><input type="text" placeholder="Dt Nasc" value="${dep.dtNasc}" maxlength="10" oninput="window.aplicarMascaraDataDep(this, ${dep.id})" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5 outline-none"></div>
        <div class="sm:col-span-2 flex gap-1 items-center"><input type="number" placeholder="Idade" value="${dep.idade}" oninput="window.atualizarDep(${dep.id}, 'idade', this.value)" class="w-full text-xs border border-stone-300 rounded px-2 py-1.5 outline-none"><button type="button" onclick="window.removerDependente(${dep.id})" class="text-red-500 hover:text-red-700 px-2 font-bold transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>
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

async function processarFormulario(e) {
  e.preventDefault();
  const btnSubmit = document.querySelector('button[type="submit"]');
  const txtOriginalBtn = btnSubmit.innerHTML;
  btnSubmit.innerHTML = '<i data-lucide="loader" class="w-6 h-6 animate-spin"></i> Enviando para o Google Drive...';
  btnSubmit.disabled = true;

  try {
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
      cidadeReside: document.getElementById('cidadeReside').value.trim().toUpperCase(),
      cidadeResidira: document.getElementById('cidadeResidira').value.trim().toUpperCase(),
      dataDesligamento: document.getElementById('dataDesligamento').value.trim(),
      banco: document.getElementById('banco').value.trim(),
      agencia: document.getElementById('agencia').value.trim(),
      conta: document.getElementById('conta').value.trim(),
      adtDcem: document.getElementById('adtDcem').value.trim(),
      bi: document.getElementById('bi').value.trim(),
      dataOcupacao: document.getElementById('dataOcupacao').value.trim(),
      omDestino: document.getElementById('omDestino').value.trim().toUpperCase(),
      guarnicao: document.getElementById('guarnicao').value.trim().toUpperCase(),
      temCarro, temMoto,
      carro: temCarro ? { marca: document.getElementById('carro_marca').value.trim() || 'XXXXXXX', placa: document.getElementById('carro_placa').value.trim().toUpperCase() || 'XXXXXXX', cor: document.getElementById('carro_cor').value.trim() || 'XXXXXXX', ano: document.getElementById('carro_ano').value.trim() || 'XXXXXXX' } : null,
      moto: temMoto ? { marca: document.getElementById('moto_marca').value.trim() || 'XXXXXXX', placa: document.getElementById('moto_placa').value.trim().toUpperCase() || 'XXXXXXX', cor: document.getElementById('moto_cor').value.trim() || 'XXXXXXX', ano: document.getElementById('moto_ano').value.trim() || 'XXXXXXX' } : null,
      indBagagem: document.getElementById('ind_bagagem').checked,
      indPassagens: document.getElementById('ind_passagens').checked,
      indAjudaCusto: document.getElementById('ind_ajuda_custo').checked,
      dependentes: acompanham ? [...dependentes] : [],
      possuiDepStr: temDependentes ? "( X ) SIM         (   ) NÃO" : "(   ) SIM         ( X ) NÃO",
      acompanhamStr: acompanham ? "( X ) SIM         (   ) NÃO" : (temDependentes ? "(   ) SIM         ( X ) NÃO" : "(   ) SIM         (   ) NÃO")
    };

    atualizarListaAnexosModal(temCarro, temMoto);
    const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType } = window.docx;
    const txtCheckbox = (checked) => checked ? "(   ) Não\t\t( X ) Sim" : "( X ) Não\t\t(   ) Sim";

    const gerarLinhaDep = (nome, grau, dtnasc, idade) => new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: nome })] }), new TableCell({ children: [new Paragraph({ text: grau })] }), new TableCell({ children: [new Paragraph({ text: dtnasc })] }), new TableCell({ children: [new Paragraph({ text: idade })] })]});
    let rowsDep = [gerarLinhaDep("Nome", "Grau de parentesco", "Dt Nasc", "Idade")];
    if (dadosFormularioAtual.dependentes.length > 0) dadosFormularioAtual.dependentes.forEach(d => rowsDep.push(gerarLinhaDep(d.nome, d.parentesco, d.dtNasc, d.idade)));
    else rowsDep.push(gerarLinhaDep("XXXXXXX", "XXXXXXX", "XXXXXXX", "XXXXXXX"));
    const tabelaDep = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rowsDep });

    const docDIEx = new Document({
      sections: [{
        properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MINISTÉRIO DA DEFESA\nEXÉRCITO BRASILEIRO\n5° BATALHÃO DE INFANTARIA LEVE\n(Terço da Bahia/1631)\nREGIMENTO ITORORÓ", bold: true })] }),
          new Paragraph({ text: "DIEx S/Nº", bold: true, spacing: { before: 200, after: 200 } }),
          new Paragraph({ alignment: AlignmentType.RIGHT, text: `Lorena - SP, ${dataAtual}.`, spacing: { after: 200 } }),
          new Paragraph({ text: `Do ${dadosFormularioAtual.posto} ${dadosFormularioAtual.nome}` }),
          new Paragraph({ text: "Ao Sr Chefe da Divisão Administrativa" }),
          new Paragraph({ text: "Assunto: Solicitação de Indenização de Transporte e Ajuda de Custo", spacing: { before: 100, after: 100 } }),
          new Paragraph({ text: `Anexos: 1) 01(uma) cópia autenticada do ${dadosFormularioAtual.adtDcem};` }),
          new Paragraph({ indent: { left: 900 }, text: `2) 01(uma) cópia do Boletim Interno (BI) da Transcrição (${dadosFormularioAtual.bi});` }),
          new Paragraph({ indent: { left: 900 }, text: "3) 01 (uma) cópia do último contracheque;" }),
          new Paragraph({ indent: { left: 900 }, text: "4) 01 (uma) cópia da Declaração de Beneficiários; e" }),
          new Paragraph({ indent: { left: 900 }, text: "5) 01 (uma) cópia autenticada do CRLV do automóvel (se for o caso); e" }),
          new Paragraph({ indent: { left: 900 }, text: "6) 01 (uma) cópia autenticada do CRLV da motocicleta (se for o caso)", spacing: { after: 200 } }),
          new Paragraph({ alignment: AlignmentType.JUSTIFIED, text: `1. Tendo em vista a minha transferência para a ${dadosFormularioAtual.omDestino}, ${dadosFormularioAtual.guarnicao}, conforme publicado no ${dadosFormularioAtual.adtDcem}, opto pelas indenizações abaixo:` }),
          new Paragraph({ text: `a. Transporte de Automóvel\t${txtCheckbox(dadosFormularioAtual.temCarro)}` }),
          new Paragraph({ text: `b. Transporte de Motocicleta\t${txtCheckbox(dadosFormularioAtual.temMoto)}` }),
          new Paragraph({ text: `c. Transporte de Bagagem\t${txtCheckbox(dadosFormularioAtual.indBagagem)}` }),
          new Paragraph({ text: `d. Passagens\t\t\t${txtCheckbox(dadosFormularioAtual.indPassagens)}` }),
          new Paragraph({ text: `e. Ajuda de Custo\t\t${txtCheckbox(dadosFormularioAtual.indAjudaCusto)}`, spacing: { after: 200 } }),
          new Paragraph({ text: "2. Dados da Movimentação:", bold: true }),
          new Paragraph({ text: "a. OM de origem e cidade/UF: 5º BIAmv / Lorena - SP" }),
          new Paragraph({ text: `b. Cidade que o militar reside: ${dadosFormularioAtual.cidadeReside}` }),
          new Paragraph({ text: `c. OM de destino e cidade/UF: ${dadosFormularioAtual.omDestino} / ${dadosFormularioAtual.guarnicao}` }),
          new Paragraph({ text: `d. Cidade que o militar residirá após a movimentação: ${dadosFormularioAtual.cidadeResidira}` }),
          new Paragraph({ text: `e. Previsão da data de desligamento: ${dadosFormularioAtual.dataDesligamento}`, spacing: { after: 200 } }),
          new Paragraph({ text: "3. Informações Complementares:", bold: true }),
          new Paragraph({ text: `a. CPF: ${dadosFormularioAtual.cpf}` }),
          new Paragraph({ text: `b. Identidade: ${dadosFormularioAtual.idt}` }),
          new Paragraph({ text: `c. Prec CP: ${dadosFormularioAtual.preccp}` }),
          new Paragraph({ text: `d. Banco: ${dadosFormularioAtual.banco} Agência: ${dadosFormularioAtual.agencia} Conta corrente: ${dadosFormularioAtual.conta}` }),
          new Paragraph({ text: "e. Data do Ajuste de Contas: 30 dias após a data de desligamento" }),
          new Paragraph({ text: `f. Telefone contato: ${dadosFormularioAtual.telefone}`, spacing: { after: 200 } }),
          new Paragraph({ text: "3. Dependentes:", bold: true }),
          new Paragraph({ text: `Possui dependentes ${dadosFormularioAtual.possuiDepStr}` }),
          new Paragraph({ text: `Se SIM, os dependentes acompanharão o militar? ${dadosFormularioAtual.acompanhamStr}` }),
          new Paragraph({ text: "Relacione os dependentes que acompanharão:" }),
          tabelaDep,
          new Paragraph({ text: "4. Dados do Veículo:", bold: true, spacing: { before: 200 } }),
          new Paragraph({ text: "Automóvel" }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
            new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "Marca / modelo" })] }), new TableCell({ children: [new Paragraph({ text: "Cor" })] })] }),
            new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: dadosFormularioAtual.carro?.marca || "XXXXXXX" })] }), new TableCell({ children: [new Paragraph({ text: dadosFormularioAtual.carro?.cor || "XXXXXXX" })] })] }),
            new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "Placa" })] }), new TableCell({ children: [new Paragraph({ text: "Ano/modelo" })] })] }),
            new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: dadosFormularioAtual.carro?.placa || "XXXXXXX" })] }), new TableCell({ children: [new Paragraph({ text: dadosFormularioAtual.carro?.ano || "XXXXXXX" })] })] })
          ]}),
          new Paragraph({ text: "Motocicleta", spacing: { before: 100 } }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
            new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "Marca / modelo" })] }), new TableCell({ children: [new Paragraph({ text: "Cor" })] })] }),
            new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: dadosFormularioAtual.moto?.marca || "XXXXXXX" })] }), new TableCell({ children: [new Paragraph({ text: dadosFormularioAtual.moto?.cor || "XXXXXXX" })] })] }),
            new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "Placa" })] }), new TableCell({ children: [new Paragraph({ text: "Ano/modelo" })] })] }),
            new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: dadosFormularioAtual.moto?.placa || "XXXXXXX" })] }), new TableCell({ children: [new Paragraph({ text: dadosFormularioAtual.moto?.ano || "XXXXXXX" })] })] })
          ]}),
          new Paragraph({ text: "- Declaro que as informações aqui prestadas são verdadeiras e autênticas, e que tenho conhecimento da pena prevista no artigo 312 do Código Penal Militar (CPM).", spacing: { before: 200 } }),
          new Paragraph({ text: "- Declaro ainda que tenho conhecimento da Portaria nº 290-DGP, de 9 de dezembro de 2013.", spacing: { after: 400 } }),
          new Paragraph({ alignment: AlignmentType.CENTER, text: `${dadosFormularioAtual.nome} - ${dadosFormularioAtual.posto}`, bold: true }),
          new Paragraph({ alignment: AlignmentType.CENTER, text: `Idt militar ${dadosFormularioAtual.idt}` })
        ]
      }]
    });

    let txtIndenizacoes = [];
    if (dadosFormularioAtual.indAjudaCusto) txtIndenizacoes.push("ajuda de custo");
    if (dadosFormularioAtual.indBagagem) txtIndenizacoes.push("transporte de bagagem");
    if (dadosFormularioAtual.temCarro) txtIndenizacoes.push("transporte de automóveis");
    if (dadosFormularioAtual.temMoto) txtIndenizacoes.push("transporte de motocicletas");
    if (dadosFormularioAtual.indPassagens) txtIndenizacoes.push("passagens");
    
    let txtDependentes = dadosFormularioAtual.dependentes.length > 0 ? dadosFormularioAtual.dependentes.map(d => `${d.nome} (${d.parentesco})`).join("; ") : "XXXXXXX";
    let txtAuto = dadosFormularioAtual.temCarro ? `${dadosFormularioAtual.carro.marca} - Placa: ${dadosFormularioAtual.carro.placa}` : "XXXXXXX";
    let txtMoto = dadosFormularioAtual.temMoto ? `${dadosFormularioAtual.moto.marca} - Placa: ${dadosFormularioAtual.moto.placa}` : "XXXXXXX";

    const docBAR = new Document({
      sections: [{
        properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
        children: [
          new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 }, children: [new TextRun({ text: `Solicitou ao Chefe da Divisão Administrativa do Batalhão a Indenização de ${txtIndenizacoes.join(", ")}, em virtude de sua movimentação para o ${dadosFormularioAtual.omDestino}, ${dadosFormularioAtual.cidadeResidira}, conforme o publicado no ${dadosFormularioAtual.adtDcem}.` })]}),
          new Paragraph({ text: "1. Tipo de Movimentação: Com desligamento;" }),
          new Paragraph({ text: "2. Motivo da Movimentação: Transferência por Necessidade do Serviço;" }),
          new Paragraph({ text: "3. OM de Origem: 5º BIL Guarnição: Lorena - SP;" }),
          new Paragraph({ text: `4. OM de Destino: ${dadosFormularioAtual.omDestino} Guarnição: ${dadosFormularioAtual.guarnicao};` }),
          new Paragraph({ text: `5. Documento que autorizou a movimentação: ${dadosFormularioAtual.adtDcem};` }),
          new Paragraph({ text: `6. Data de desligamento: ${dadosFormularioAtual.dataDesligamento};` }),
          new Paragraph({ text: "7. Data de ajuste de contas: 30 dias após a data de desligamento;" }),
          new Paragraph({ text: "8. Tipo de Pagamento: todas as indenizações pedidas no item 4;" }),
          new Paragraph({ text: `9. Dependentes que acompanharão o militar na movimentação: ${txtDependentes};` }),
          new Paragraph({ text: `10. Dados dos veículos: Automóvel: ${txtAuto} Motocicleta: ${txtMoto};` }),
          new Paragraph({ text: `11. CPF: ${dadosFormularioAtual.cpf}; e` }),
          new Paragraph({ text: `12. Domicílio Bancário: - Banco: ${dadosFormularioAtual.banco} Agência: ${dadosFormularioAtual.agencia} Conta: ${dadosFormularioAtual.conta}.` }),
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
          new Paragraph({ text: `- Banco: ${dadosFormularioAtual.banco} Agência: ${dadosFormularioAtual.agencia} Conta: ${dadosFormularioAtual.conta}` }),
          new Paragraph({ text: "6. Indenizações:", spacing: { before: 100 } }),
          new Paragraph({ text: "- Ajuda de Custo: R$ XXXXX;" }),
          new Paragraph({ text: "- Indenização de Transporte: R$ XXXXX;" }),
          new Paragraph({ text: "7. Total das Indenizações: R$ XXXXX (VALOR POR EXTENSO);", spacing: { before: 100 } }),
          new Paragraph({ text: `8. Documento que autorizou o pagamento: ${dadosFormularioAtual.adtDcem};` }),
          new Paragraph({ text: "9. Nº da NC 2026NC XXXXX: - DATA (Ajuda de Custo) e Nº da NC 2026NC XXXXX: - DATA (Indz Transp);" }),
          new Paragraph({ text: "10. Cotista: DCEM; e" }),
          new Paragraph({ text: `11. Motivo da indenização: Transferência por Necessidade do Serviço para ${dadosFormularioAtual.omDestino} Guarnição: ${dadosFormularioAtual.guarnicao}.`, spacing: { after: 400 } }),
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
    const nomePasta = `Movimentacao - ${dadosFormularioAtual.posto} ${dadosFormularioAtual.nome}`;
    
    await subirArquivoParaServidor(blobPdf, `Checklist_Movimentacao_${nomeBase}.pdf`, nomePasta);
    await subirArquivoParaServidor(blobDIEx, `DIEx_Movimentacao_${nomeBase}.docx`, nomePasta);
    await subirArquivoParaServidor(blobBAR, `NotaBAR_Movimentacao_${nomeBase}.docx`, nomePasta);
    await subirArquivoParaServidor(blobOrdPagto, `OrdPagto_Movimentacao_${nomeBase}.docx`, nomePasta);

    // MÁGICA DO PROTOCOLO ADMIN (Sem Arquivos Pesados)
    const payloadReq = {
      id: 'MOV-' + Date.now().toString().slice(-6),
      dataCriacao: new Date().toLocaleDateString('pt-BR'),
      modalidade: 'Movimentacao',
      posto: dadosFormularioAtual.posto,
      nomeCompleto: dadosFormularioAtual.nome,
      cpf: dadosFormularioAtual.cpf
    };

    const resDb = await fetch('/api/solicitacoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadReq) });
    if (!resDb.ok) throw new Error('Falha ao registrar protocolo no painel.');

    window.saveAs(blobDIEx, `DIEx_Movimentacao_${nomeBase}.docx`);
    window.saveAs(blobBAR, `NotaBAR_Movimentacao_${nomeBase}.docx`);
    window.saveAs(blobOrdPagto, `OrdPagto_Movimentacao_${nomeBase}.docx`);

    document.getElementById('modal-sucesso').classList.remove('hidden');

  } catch (erro) {
    alert('Erro: ' + erro.message);
  } finally {
    btnSubmit.innerHTML = txtOriginalBtn;
    btnSubmit.disabled = false;
    if (window.lucide) lucide.createIcons();
  }
}

function atualizarListaAnexosModal(temCarro, temMoto) {
  const lista = document.getElementById('lista-anexos-final');
  let html = `<li>Cópia autenticada do Adt DCEM</li><li>Cópia do BI da transcrição do Adt DCEM</li><li>Cópia do último contracheque</li><li>Declaração de Beneficiários</li>`;
  if (temCarro) html += `<li>Cópia autenticada do CRLV do automóvel</li>`;
  if (temMoto) html += `<li>Cópia autenticada do CRLV da motocicleta</li>`;
  lista.innerHTML = html;
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
  if (dados.temCarro) { doc.text('[   ] 01 (uma) cópia autenticada do CRLV do automóvel', 20, y); y += 8; }
  if (dados.temMoto) { doc.text('[   ] 01 (uma) cópia autenticada do CRLV da motocicleta', 20, y); y += 8; }
  return doc;
}

function baixarPDFChecklist() {
  if (!dadosFormularioAtual) return;
  const doc = criarInstanciaPDF(dadosFormularioAtual);
  doc.save(`Checklist_Movimentacao_${dadosFormularioAtual.posto}_${dadosFormularioAtual.nome.replace(/\s+/g, '_')}.pdf`);
}
