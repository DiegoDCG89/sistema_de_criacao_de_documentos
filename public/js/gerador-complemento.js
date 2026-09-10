// public/js/gerador-complemento.js

import { mascaraCPF, mascaraIdt, mascaraPrecCP, mascaraTelefone, mascaraData } from './utils.js';

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
  
  document.getElementById('cursoDataInicio').addEventListener('input', e => e.target.value = mascaraData(e.target.value));
  document.getElementById('cursoDataTermino').addEventListener('input', e => e.target.value = mascaraData(e.target.value));
  document.getElementById('transfDataDesligamento').addEventListener('input', e => e.target.value = mascaraData(e.target.value));

  document.getElementById('btn-add-dep').addEventListener('click', addDependente);
  document.getElementById('form-complemento').addEventListener('submit', processarFormulario);
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
// 3. COMUNICAÇÃO COM O SERVIDOR E IMAGENS
// ==========================================
async function subirArquivoParaServidor(blob, nomeArquivo) {
  const res = await fetch(`/api/upload?filename=${encodeURIComponent(nomeArquivo)}`, { method: 'POST', body: blob });
  if (!res.ok) throw new Error(`Falha no upload: ${nomeArquivo}`);
  return (await res.json()).url;
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

// ==========================================
// 4. PROCESSAMENTO DO FORMULÁRIO E ANEXOS
// ==========================================
async function processarFormulario(e) {
  e.preventDefault();

  const btnSubmit = document.querySelector('button[type="submit"]');
  const txtOriginalBtn = btnSubmit.innerHTML;
  btnSubmit.innerHTML = '<i data-lucide="loader" class="w-6 h-6 animate-spin"></i> Preparando documentos...';
  btnSubmit.disabled = true;

  try {
    const arrayBufferBrasao = await obterImagemBrasao();
    
    const modalidade = document.querySelector('input[name="modalidade_comp"]:checked').value;
    const temDependentes = document.querySelector('input[name="opt_dependentes"]:checked')?.value === 'sim';
    const temCarro = document.querySelector('input[name="opt_carro"]:checked')?.value === 'sim';
    const temMoto = document.querySelector('input[name="opt_moto"]:checked')?.value === 'sim';

    dadosFormularioAtual = {
      modalidade,
      posto: document.getElementById('posto').value.trim(),
      nome: document.getElementById('nome').value.trim().toUpperCase(),
      cpf: document.getElementById('cpf').value.trim(),
      idt: document.getElementById('idt').value.trim(),
      preccp: document.getElementById('preccp').value.trim(),
      telefone: document.getElementById('telefone').value.trim(),
      banco: document.getElementById('banco').value.trim(),
      agencia: document.getElementById('agencia').value.trim(),
      conta: document.getElementById('conta').value.trim(),
      
      // Dados Curso
      cursoNome: document.getElementById('cursoNome').value.trim().toUpperCase(),
      cursoCidade: document.getElementById('cursoCidade').value.trim().toUpperCase(),
      cursoGuarnicao: document.getElementById('cursoGuarnicao').value.trim().toUpperCase(),
      cursoAdt: document.getElementById('cursoAdt').value.trim(),
      cursoMotivo: document.getElementById('cursoMotivo').value.trim(),
      cursoDataInicio: document.getElementById('cursoDataInicio').value.trim(),
      cursoDataTermino: document.getElementById('cursoDataTermino').value.trim(),
      cursoBolHomologacao: document.getElementById('cursoBolHomologacao').value.trim(),
      
      // Dados Transferência
      transfOm: document.getElementById('transfOm').value.trim().toUpperCase(),
      transfCidade: document.getElementById('transfCidade').value.trim().toUpperCase(),
      transfGuarnicao: document.getElementById('transfGuarnicao').value.trim().toUpperCase(),
      transfMotivo: document.getElementById('transfMotivo').value.trim(),
      transfAdt: document.getElementById('transfAdt').value.trim(),
      transfDataDesligamento: document.getElementById('transfDataDesligamento').value.trim(),

      dependentes: temDependentes ? [...dependentes] : [],
      carro: temCarro ? {
        marca: document.getElementById('carro_marca').value.trim() || 'NÃO HÁ',
        placa: document.getElementById('carro_placa').value.trim().toUpperCase() || 'NÃO HÁ',
        cor: document.getElementById('carro_cor').value.trim() || 'NÃO HÁ',
        ano: document.getElementById('carro_ano').value.trim() || 'NÃO HÁ'
      } : null,
      moto: temMoto ? {
        marca: document.getElementById('moto_marca').value.trim() || 'NÃO HÁ',
        placa: document.getElementById('moto_placa').value.trim().toUpperCase() || 'NÃO HÁ',
        cor: document.getElementById('moto_cor').value.trim() || 'NÃO HÁ',
        ano: document.getElementById('moto_ano').value.trim() || 'NÃO HÁ'
      } : null,
    };

    const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, ImageRun } = window.docx;

    // --- CABEÇALHO ---
    const elementosCabecalho = [];
    if (arrayBufferBrasao) {
      elementosCabecalho.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: arrayBufferBrasao, transformation: { width: 70, height: 70 } })] }));
    }
    elementosCabecalho.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MINISTÉRIO DA DEFESA\nEXÉRCITO BRASILEIRO\nREGIMENTO ITORORÓ\n5º BATALHÃO DE INFANTARIA LEVE\n(Terço da Bahia/1631)", bold: true })] }));

    // --- TABELAS ---
    const gerarLinhaDep = (nome, grau, dtnasc, idade) => new TableRow({ children: [
      new TableCell({ children: [new Paragraph({ text: nome })] }),
      new TableCell({ children: [new Paragraph({ text: grau })] }),
      new TableCell({ children: [new Paragraph({ text: dtnasc })] }),
      new TableCell({ children: [new Paragraph({ text: idade })] })
    ]});
    
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
    let txtAuto = dadosFormularioAtual.carro ? `${dadosFormularioAtual.carro.marca} - Placa: ${dadosFormularioAtual.carro.placa}` : "NÃO HÁ";
    let txtMoto = dadosFormularioAtual.moto ? `${dadosFormularioAtual.moto.marca} - Placa: ${dadosFormularioAtual.moto.placa}` : "NÃO HÁ";

    let docDIEx, docBAR, docOrdPagto;

    // ==============================================================
    // LÓGICA: SE FOR COMPLEMENTO DE CURSO
    // ==============================================================
    if (modalidade === 'curso') {
      docDIEx = new Document({
        sections: [{ properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } }, children: [
            ...elementosCabecalho,
            new Paragraph({ text: "DIEx S/Nº", bold: true, spacing: { before: 200, after: 200 } }),
            new Paragraph({ alignment: AlignmentType.RIGHT, text: `Lorena - SP, ${dataAtual}.`, spacing: { after: 200 } }),
            new Paragraph({ text: `Do ${dadosFormularioAtual.posto} ${dadosFormularioAtual.nome}` }),
            new Paragraph({ text: "Ao Sr Chefe da Divisão Administrativa" }),
            new Paragraph({ text: "Assunto: Solicitação de Complemento de Ajuda de Custo", spacing: { before: 100, after: 100 } }),
            new Paragraph({ text: "Anexos: 1) 01(uma) cópia autenticada do Aditamento que gerou o benefício;" }),
            new Paragraph({ indent: { left: 900 }, text: "2) 01(uma) cópia autenticada do BI de transcrição do Aditamento;" }),
            new Paragraph({ indent: { left: 900 }, text: "3) 01 (uma) cópia autenticada do contracheque do mês que solicitou a ajuda de custo;" }),
            new Paragraph({ indent: { left: 900 }, text: "4) 01 (uma) cópia autenticada do contracheque atual (com reajuste salarial);" }),
            new Paragraph({ indent: { left: 900 }, text: "5) 01 (uma) cópia autenticada do BAR que publicou a transcrição da DIEx de Opção;" }),
            new Paragraph({ indent: { left: 900 }, text: "6) 01 (uma) cópia autenticada do BAR que publicou o pagamento da Ajuda de Custo; e" }),
            new Paragraph({ indent: { left: 900 }, text: "7) 01 (uma) cópia autenticada da Declaração de Beneficiários.", spacing: { after: 200 } }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, text: `1. Tendo em vista a minha designação para o ${dadosFormularioAtual.cursoNome}, ${dadosFormularioAtual.cursoCidade} - ${dadosFormularioAtual.cursoGuarnicao}, conforme publicado no ${dadosFormularioAtual.cursoAdt}, solicito complemento de Ajuda de Custo, tendo em vista ${dadosFormularioAtual.cursoMotivo}, opto pelas indenizações abaixo:`, spacing: { after: 100 } }),
            new Paragraph({ text: `a. Transporte de Automóvel\t( X ) Não\t(   ) Sim` }),
            new Paragraph({ text: `b. Transporte de Motocicleta\t( X ) Não\t(   ) Sim` }),
            new Paragraph({ text: `c. Ajuda de Custo\t\t(   ) Não\t( X ) Sim`, spacing: { after: 200 } }),
            new Paragraph({ text: "2. Informações Complementares:" }),
            new Paragraph({ text: `a. Data de Término: ${dadosFormularioAtual.cursoDataTermino}` }),
            new Paragraph({ text: `b. CPF: ${dadosFormularioAtual.cpf}` }),
            new Paragraph({ text: `c. Identidade: ${dadosFormularioAtual.idt}` }),
            new Paragraph({ text: `d. Prec CP: ${dadosFormularioAtual.preccp}` }),
            new Paragraph({ text: `e. Banco: ${dadosFormularioAtual.banco} Agência: ${dadosFormularioAtual.agencia} Conta corrente: ${dadosFormularioAtual.conta}` }),
            new Paragraph({ text: "f. Data do Ajuste de Contas: 30 dias após a data de desligamento" }),
            new Paragraph({ text: `g. Telefone contato: ${dadosFormularioAtual.telefone}`, spacing: { after: 200 } }),
            new Paragraph({ text: "3. Dependentes:" }),
            new Paragraph({ text: "NÃO HÁ", spacing: { after: 200 } }),
            new Paragraph({ text: "4. Dados do Veículo:" }),
            new Paragraph({ text: "NÃO HÁ", spacing: { after: 200 } }),
            new Paragraph({ text: "OBS: De acordo com a Port nº 290-DGP, de 9 Dez 13 e sob a pena prevista no Art 312 do Código Penal Militar (CPM).", spacing: { after: 400 } }),
            new Paragraph({ alignment: AlignmentType.CENTER, text: `${dadosFormularioAtual.nome} - ${dadosFormularioAtual.posto}`, bold: true }),
            new Paragraph({ alignment: AlignmentType.CENTER, text: `Identidade Militar ${dadosFormularioAtual.idt} / MD` })
        ]}]
      });

      docBAR = new Document({
        sections: [{ properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } }, children: [
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 }, children: [
              new TextRun({ text: `Solicitou ao Chefe da Divisão Administrativa do Batalhão, o complemento de Ajuda de Custo, em virtude de sua designação para o ${dadosFormularioAtual.cursoNome}, conforme o publicado no ${dadosFormularioAtual.cursoAdt}, tendo em vista ${dadosFormularioAtual.cursoMotivo}, fazendo jus ao referido complemento.` })
            ]}),
            new Paragraph({ text: "1. Tipo de Movimentação: Sem desligamento;" }),
            new Paragraph({ text: `2. Motivo da indenização: ${dadosFormularioAtual.cursoNome};` }),
            new Paragraph({ text: "3. OM de Origem: 5º BIL Guarnição: Lorena - SP;" }),
            new Paragraph({ text: `4. OM de Destino: ${dadosFormularioAtual.cursoCidade} Guarnição: ${dadosFormularioAtual.cursoGuarnicao};` }),
            new Paragraph({ text: `5. Documento que autorizou a movimentação: ${dadosFormularioAtual.cursoAdt};` }),
            new Paragraph({ text: `6. Data de início do Curso: ${dadosFormularioAtual.cursoDataInicio};` }),
            new Paragraph({ text: `7. Data de término do Curso: ${dadosFormularioAtual.cursoDataTermino};` }),
            new Paragraph({ text: "8. Data de Ajuste de Contas: Após o recebimento da Nota de Crédito;" }),
            new Paragraph({ text: "9. Tipo de Pagamento: Complemento de Ajuda de Custo;" }),
            new Paragraph({ text: `10. Dependentes: NÃO HÁ;` }),
            new Paragraph({ text: `11. CPF: ${dadosFormularioAtual.cpf};` }),
            new Paragraph({ text: `12. Domicílio Bancário: - Banco: ${dadosFormularioAtual.banco} Agência: ${dadosFormularioAtual.agencia} Conta: ${dadosFormularioAtual.conta}.`, spacing: { after: 200 } }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, text: "Em consequência, a Divisão Administrativa elabore o processo de pagamento do Complemento de Ajuda de Custo e os demais interessados tomem as providências decorrentes.", spacing: { after: 400 } }),
            new Paragraph({ alignment: AlignmentType.RIGHT, text: `(Nota p/ BAR nº - DA.5, ${dataAtual})` })
        ]}]
      });

      docOrdPagto = new Document({
        sections: [{ properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } }, children: [
            new Paragraph({ text: "ASSUNTO: INDENIZAÇÃO DE TRANSPORTE E AJUDA DE CUSTO - Pagamento", bold: true, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
            new Paragraph({ text: "Faz jus ao pagamento da indenização prevista na Portaria nº 290, de 9 DEZ 13:", spacing: { after: 200 } }),
            new Paragraph({ text: "1. Processo de Pagamento de Indenização;" }),
            new Paragraph({ text: `2. Favorecido: ${dadosFormularioAtual.nome};` }),
            new Paragraph({ text: `3. Posto/Graduação: ${dadosFormularioAtual.posto};` }),
            new Paragraph({ text: `4. Identidade: ${dadosFormularioAtual.idt};` }),
            new Paragraph({ text: `5. CPF: ${dadosFormularioAtual.cpf};` }),
            new Paragraph({ text: "6. Dados Bancários:" }),
            new Paragraph({ text: `- Banco: ${dadosFormularioAtual.banco} Agência: ${dadosFormularioAtual.agencia} Conta: ${dadosFormularioAtual.conta}` }),
            new Paragraph({ text: "7. Indenizações:", spacing: { before: 100 } }),
            new Paragraph({ text: `- Complemento em virtude de ${dadosFormularioAtual.cursoMotivo}: R$ XXXXXXXX;` }),
            new Paragraph({ text: "8. Total das Indenizações: R$ XXXXXXXX (VALOR POR EXTENSO);", spacing: { before: 100 } }),
            new Paragraph({ text: `9. Documento que autorizou o pagamento: ${dadosFormularioAtual.cursoAdt};` }),
            new Paragraph({ text: "10. Nº da NC: 2026NCXXXX - DATA (Complemento);" }),
            new Paragraph({ text: "11. Cotista: DCEM; e" }),
            new Paragraph({ text: `12. Motivo da indenização: Complemento de Ajuda de Custo, em virtude de sua designação para o ${dadosFormularioAtual.cursoNome}, conforme o publicado no ${dadosFormularioAtual.cursoAdt}, tendo em vista ${dadosFormularioAtual.cursoMotivo}.`, spacing: { after: 400 } }),
            new Paragraph({ text: "Em consequência, a SALC providencie o empenho e o Setor Financeiro efetue o pagamento das referidas indenizações." }),
            new Paragraph({ text: `(Nota Nr - DA.5, ${dataAtual})`, alignment: AlignmentType.RIGHT, spacing: { top: 400 } })
        ]}]
      });
    } 
    
    // ==============================================================
    // LÓGICA: SE FOR COMPLEMENTO DE TRANSFERÊNCIA
    // ==============================================================
    else {
      docDIEx = new Document({
        sections: [{ properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } }, children: [
            ...elementosCabecalho,
            new Paragraph({ text: "DIEx S/Nº", bold: true, spacing: { before: 200, after: 200 } }),
            new Paragraph({ alignment: AlignmentType.RIGHT, text: `Lorena - SP, ${dataAtual}.`, spacing: { after: 200 } }),
            new Paragraph({ text: `Do ${dadosFormularioAtual.posto} ${dadosFormularioAtual.nome}` }),
            new Paragraph({ text: "Ao Sr Chefe da Divisão Administrativa" }),
            new Paragraph({ text: "Assunto: Solicitação de Complemento de Indenização de Transporte e Ajuda de Custo", spacing: { before: 100, after: 100 } }),
            new Paragraph({ text: "Anexos: 1) 01(uma) cópia autenticada do Adt que gerou o benefício;" }),
            new Paragraph({ indent: { left: 900 }, text: "2) 01(uma) cópia autenticada do BI da transcrição do Adt que gerou o benefício;" }),
            new Paragraph({ indent: { left: 900 }, text: "3) 01 (uma) cópia do contracheque com remuneração antiga;" }),
            new Paragraph({ indent: { left: 900 }, text: "4) 01 (uma) cópia do contracheque com remuneração atual;" }),
            new Paragraph({ indent: { left: 900 }, text: "5) 01 (uma) cópia do BI/BAR da solicitação inicial de Indenização;", spacing: { after: 200 } }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, text: `1. Tendo em vista a minha transferência para a ${dadosFormularioAtual.transfOm}, ${dadosFormularioAtual.transfCidade} - ${dadosFormularioAtual.transfGuarnicao}, conforme publicado no ${dadosFormularioAtual.transfAdt}, solicito complemento de Ajuda de Custo tendo em vista ${dadosFormularioAtual.transfMotivo} fazendo jus ao referido complemento.`, spacing: { after: 100 } }),
            new Paragraph({ text: "2. Informações Complementares:" }),
            new Paragraph({ text: `a. Data de desligamento: ${dadosFormularioAtual.transfDataDesligamento}` }),
            new Paragraph({ text: `b. CPF: ${dadosFormularioAtual.cpf}` }),
            new Paragraph({ text: `c. Identidade: ${dadosFormularioAtual.idt}` }),
            new Paragraph({ text: `d. Prec CP: ${dadosFormularioAtual.preccp}` }),
            new Paragraph({ text: `e. Banco: ${dadosFormularioAtual.banco} Agência: ${dadosFormularioAtual.agencia} Conta corrente: ${dadosFormularioAtual.conta}` }),
            new Paragraph({ text: "f. Data do Ajuste de Contas: 30 dias após a data de desligamento" }),
            new Paragraph({ text: `g. Telefone contato: ${dadosFormularioAtual.telefone}`, spacing: { after: 200 } }),
            new Paragraph({ text: "3. Dependentes:" }),
            tabelaDep,
            new Paragraph({ text: "4. Veículos:", spacing: { before: 200 } }),
            new Paragraph({ text: `Automóvel: ${txtAuto}` }),
            new Paragraph({ text: `Motocicleta: ${txtMoto}`, spacing: { after: 200 } }),
            new Paragraph({ text: "OBS: De acordo com a Port nº 290-DGP, de 9 Dez 13 e sob a pena prevista no Art 312 do Código Penal Militar (CPM).", spacing: { after: 400 } }),
            new Paragraph({ alignment: AlignmentType.CENTER, text: `${dadosFormularioAtual.nome} - ${dadosFormularioAtual.posto}`, bold: true }),
            new Paragraph({ alignment: AlignmentType.CENTER, text: `Identidade Militar ${dadosFormularioAtual.idt} / MD` })
        ]}]
      });

      docBAR = new Document({
        sections: [{ properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } }, children: [
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 }, children: [
              new TextRun({ text: `Solicitou ao Chefe da Divisão Administrativa do Batalhão, o complemento da Ajuda de Custo, em virtude de sua movimentação para a ${dadosFormularioAtual.transfCidade} ${dadosFormularioAtual.transfGuarnicao}, conforme o publicado no ${dadosFormularioAtual.transfAdt}, tendo em vista ${dadosFormularioAtual.transfMotivo}, fazendo jus ao referido complemento.` })
            ]}),
            new Paragraph({ text: "1. Tipo de Movimentação: Com desligamento;" }),
            new Paragraph({ text: "2. Motivo da Movimentação: Transferência por Necessidade do Serviço;" }),
            new Paragraph({ text: "3. OM de Origem: 5º BIL Guarnição: Lorena - SP;" }),
            new Paragraph({ text: `4. OM de Destino: ${dadosFormularioAtual.transfOm} Guarnição: ${dadosFormularioAtual.transfGuarnicao};` }),
            new Paragraph({ text: `5. Documento que autorizou a movimentação: ${dadosFormularioAtual.transfAdt};` }),
            new Paragraph({ text: `6. Data de desligamento: ${dadosFormularioAtual.transfDataDesligamento};` }),
            new Paragraph({ text: "7. Data de ajuste de contas: Após o recebimento da nota de crédito;" }),
            new Paragraph({ text: "8. Tipo de Pagamento: Complemento de Ajuda de Custo;" }),
            new Paragraph({ text: `9. Dependentes que acompanharão o militar na movimentação: ${txtDependentes};` }),
            new Paragraph({ text: `10. Dados do Veículo: Auto: ${txtAuto} / Moto: ${txtMoto};` }),
            new Paragraph({ text: `11. CPF: ${dadosFormularioAtual.cpf};` }),
            new Paragraph({ text: `12. Domicílio Bancário: - Banco: ${dadosFormularioAtual.banco} Agência: ${dadosFormularioAtual.agencia} Conta: ${dadosFormularioAtual.conta}.`, spacing: { after: 200 } }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, text: "Em consequência, o Ch Div Adm elabore o processo de pagamento do Complemento de Ajuda de Custo e os demais interessados tomem as providências decorrentes.", spacing: { after: 400 } }),
            new Paragraph({ alignment: AlignmentType.RIGHT, text: `(Nota p/ BAR nº - DA.5, ${dataAtual})` })
        ]}]
      });

      docOrdPagto = new Document({
        sections: [{ properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } }, children: [
            new Paragraph({ text: "ASSUNTO: INDENIZAÇÃO DE TRANSPORTE E AJUDA DE CUSTO - Pagamento", bold: true, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
            new Paragraph({ text: "Faz jus ao pagamento da indenização prevista na Portaria nº 290, de 9 DEZ 13:", spacing: { after: 200 } }),
            new Paragraph({ text: "1. Processo de Pagamento de Indenização;" }),
            new Paragraph({ text: `2. Favorecido: ${dadosFormularioAtual.nome};` }),
            new Paragraph({ text: `3. Posto/Graduação: ${dadosFormularioAtual.posto};` }),
            new Paragraph({ text: `4. Identidade: ${dadosFormularioAtual.idt};` }),
            new Paragraph({ text: `5. CPF: ${dadosFormularioAtual.cpf};` }),
            new Paragraph({ text: "6. Dados Bancários:" }),
            new Paragraph({ text: `- Banco: ${dadosFormularioAtual.banco} Agência: ${dadosFormularioAtual.agencia} Conta: ${dadosFormularioAtual.conta}` }),
            new Paragraph({ text: "7. Indenizações:", spacing: { before: 100 } }),
            new Paragraph({ text: `- Complemento em virtude de ${dadosFormularioAtual.transfMotivo}: R$ XXXXXXXX;` }),
            new Paragraph({ text: "8. Total das Indenizações: R$ XXXXXXXX (VALOR POR EXTENSO);", spacing: { before: 100 } }),
            new Paragraph({ text: `9. Documento que autorizou o pagamento: ${dadosFormularioAtual.transfAdt};` }),
            new Paragraph({ text: "10. Nº da NC: 2026NCXXXX - DATA (Complemento);" }),
            new Paragraph({ text: "11. Cotista: DCEM; e" }),
            new Paragraph({ text: `12. Motivo da indenização: Movimentação para ${dadosFormularioAtual.transfOm}, ${dadosFormularioAtual.transfCidade} - ${dadosFormularioAtual.transfGuarnicao}, Transferência por Necessidade do Serviço.`, spacing: { after: 400 } }),
            new Paragraph({ text: "Em consequência, a SALC providencie o empenho e o Setor Financeiro efetue o pagamento das referidas indenizações." }),
            new Paragraph({ text: `(Nota Nr - DA.5, ${dataAtual})`, alignment: AlignmentType.RIGHT, spacing: { top: 400 } })
        ]}]
      });
    }

    // --- UPLOADS E CONCLUSÃO ---
    const blobDIEx = await window.docx.Packer.toBlob(docDIEx);
    const blobBAR = await window.docx.Packer.toBlob(docBAR);
    const blobOrdPagto = await window.docx.Packer.toBlob(docOrdPagto);
    
    const nomeBase = `${dadosFormularioAtual.posto}_${dadosFormularioAtual.nome.replace(/\s+/g, '_')}_${Date.now()}`;
    const urlDiex = await subirArquivoParaServidor(blobDIEx, `DIEx_Complemento_${modalidade}_${nomeBase}.docx`);
    const urlNotaBar = await subirArquivoParaServidor(blobBAR, `NotaBAR_Complemento_${modalidade}_${nomeBase}.docx`);
    const urlOrdPagto = await subirArquivoParaServidor(blobOrdPagto, `OrdPagto_Complemento_${modalidade}_${nomeBase}.docx`);

    const payloadReq = {
      id: 'COMP-' + Date.now().toString().slice(-6),
      dataCriacao: new Date().toLocaleDateString('pt-BR'),
      modalidade: `Complemento (${modalidade})`,
      omDestino: modalidade === 'curso' ? dadosFormularioAtual.cursoCidade : dadosFormularioAtual.transfOm,
      posto: dadosFormularioAtual.posto,
      nomeCompleto: dadosFormularioAtual.nome,
      cpf: dadosFormularioAtual.cpf,
      urlPdfDocs: '', // PDF removido conforme combinado
      urlDiex: urlDiex,
      urlNotaBar: urlNotaBar,
      urlOp: urlOrdPagto
    };

    const resDb = await fetch('/api/solicitacoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadReq) });
    if (!resDb.ok) throw new Error('Falha ao registrar no painel.');

    window.saveAs(blobDIEx, `DIEx_Complemento_${modalidade}_${nomeBase}.docx`);
    window.saveAs(blobBAR, `NotaBAR_Complemento_${modalidade}_${nomeBase}.docx`);
    window.saveAs(blobOrdPagto, `OrdPagto_Complemento_${modalidade}_${nomeBase}.docx`);

    document.getElementById('modal-sucesso').classList.remove('hidden');

  } catch (erro) {
    alert('Erro: ' + erro.message);
  } finally {
    btnSubmit.innerHTML = txtOriginalBtn;
    btnSubmit.disabled = false;
    if (window.lucide) lucide.createIcons();
  }
}

// Remover o checklist do Complemento já que a lista de anexos estará apenas na tela final
function baixarPDFChecklist() {
  alert("Por favor, consulte a lista de documentos na tela. Os documentos exigidos podem variar conforme o motivo do complemento.");
}
