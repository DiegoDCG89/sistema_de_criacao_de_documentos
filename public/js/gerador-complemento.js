// =========================================================================
// SisDoc - Gerador de Complementos (Curso e Movimentação)
// =========================================================================

import { mascaraCPF, mascaraIdt, mascaraPrecCP, mascaraTelefone, mascaraData } from './utils.js';

let dependentes = [];
let dadosUltimoEnvio = null;

// Funções de Data
function formatarDataPorExtenso() {
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const hoje = new Date();
  return `${String(hoje.getDate()).padStart(2, '0')} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
}

function formatarMesAno() {
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const hoje = new Date();
  return `${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
}

// Eventos e Inicialização
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  
  // Máscaras
  const inputsMascaras = [
    { id: 'cpf', fn: mascaraCPF },
    { id: 'idt', fn: mascaraIdt },
    { id: 'preccp', fn: mascaraPrecCP },
    { id: 'cursoDataInicio', fn: mascaraData },
    { id: 'telefone', fn: mascaraTelefone },
    { id: 'cursoDataTermino', fn: mascaraData },
    { id: 'transfDataDesligamento', fn: mascaraData }
  ];
  
  inputsMascaras.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) el.addEventListener('input', e => e.target.value = item.fn(e.target.value));
  });

  const btnAddDep = document.getElementById('btn-add-dep');
  if (btnAddDep) btnAddDep.addEventListener('click', addDependente);
  
  const form = document.getElementById('form-complemento');
  if (form) form.addEventListener('submit', processarFormularioComplemento);
  
  const btnPdf = document.getElementById('btn-baixar-pdf');
  if (btnPdf) btnPdf.addEventListener('click', baixarPDFChecklist);
});

// Gestão de Dependentes
function addDependente() {
  const listaDep = document.getElementById('lista-dependentes');
  if (!listaDep) return;
  const id = Date.now();
  const divLinha = document.createElement('div');
  divLinha.className = 'grid grid-cols-1 sm:grid-cols-5 gap-3 p-3 bg-stone-50 rounded-lg border border-stone-200 relative item-dependente items-end';
  divLinha.dataset.id = id;
  
  divLinha.innerHTML = `
    <div class="sm:col-span-3">
      <label class="block text-[11px] font-semibold text-stone-600 mb-1">Nome Completo *</label>
      <input type="text" class="dep-nome w-full border border-stone-300 rounded px-2 py-1.5 text-xs uppercase" required>
    </div>
    <div class="sm:col-span-2 flex items-end gap-2">
      <div class="flex-grow">
        <label class="block text-[11px] font-semibold text-stone-600 mb-1">Grau de Parentesco *</label>
        <select class="dep-parentesco w-full border border-stone-300 rounded px-2 py-1.5 text-xs bg-white" required>
          <option value="">Selecione...</option>
          <option value="Esposa / Cônjuge">Esposa / Cônjuge</option>
          <option value="Companheira(o)">Companheira(o)</option>
          <option value="Filho(a)">Filho(a)</option>
          <option value="Enteado(a)">Enteado(a)</option>
          <option value="Pai / Mãe">Pai / Mãe</option>
          <option value="Menor sob Guarda">Menor sob Guarda</option>
          <option value="Outro">Outro</option>
        </select>
      </div>
      <button type="button" class="btn-remover-dep px-3 py-1.5 bg-red-100 text-red-700 font-bold rounded border text-xs">✕</button>
    </div>
  `;
  divLinha.querySelector('.btn-remover-dep').addEventListener('click', () => divLinha.remove());
  listaDep.appendChild(divLinha);
}

function coletarDependentes() {
  const radioSim = document.querySelector('input[name="opt_dependentes"][value="sim"]');
  if (!radioSim || !radioSim.checked) return [];
  const deps = [];
  document.querySelectorAll('.item-dependente').forEach((el) => {
    const nome = el.querySelector('.dep-nome')?.value.trim().toUpperCase() || '';
    const parentesco = el.querySelector('.dep-parentesco')?.value.trim() || '';
    if (nome && parentesco) deps.push({ NOME: nome, PARENTESCO: parentesco });
  });
  return deps;
}

// Motor de Renderização (Docxtemplater)
async function renderizarDocx(caminhoTemplate, dadosPayload) {
  const res = await fetch(caminhoTemplate);
  if (!res.ok) throw new Error(`Template não encontrado: ${caminhoTemplate}`);
  const buffer = await res.arrayBuffer();
  let zip;
  try {
    zip = new window.PizZip(buffer);
  } catch (err) {
    throw new Error(`Erro ao ler o arquivo ${caminhoTemplate}. Ele pode estar corrompido.`);
  }

  let doc;
  try {
    doc = new window.docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(dadosPayload);
  } catch (errRender) {
    if (errRender.properties && errRender.properties.errors) {
      const msgs = errRender.properties.errors.map(e => e.properties?.explanation || e.message).join(' | ');
      throw new Error(`Erro de tag no template ${caminhoTemplate}: ${msgs}`);
    }
    throw errRender;
  }
  return doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

// Processamento Principal
async function processarFormularioComplemento(e) {
  e.preventDefault();
  const btnSubmit = document.querySelector('button[type="submit"]');
  const txtOriginalBtn = btnSubmit.innerHTML;
  
  try {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="animate-pulse">Gerando documentos...</span>`;

    const getVal = (id) => document.getElementById(id)?.value.trim() || '';
    const isChecked = (selector) => document.querySelector(selector)?.checked;
    
    // Identificação
    const modalidade = document.querySelector('input[name="modalidade_comp"]:checked').value; // 'curso' ou 'movimentacao'
    const posto = getVal('posto');
    const nomeCompleto = getVal('nome').toUpperCase();
    
    if (!posto || !nomeCompleto) throw new Error("Preencha Posto e Nome.");
    dadosUltimoEnvio = { posto, nomeCompleto, modalidade };

    const dependentes = coletarDependentes();
    const possuiDep = dependentes.length > 0;
    const optAuto = isChecked('input[name="opt_carro"][value="sim"]');
    const optMoto = isChecked('input[name="opt_moto"][value="sim"]');
    const marcar = (cond) => ({ SIM: cond ? 'X' : ' ', NAO: !cond ? 'X' : ' ' });

    // Payload Unificado
    const payload = {
      DATA_ATUAL: formatarDataPorExtenso(),
      MES_ANO: formatarMesAno(),
      POSTO_GRAD: posto,
      NOME_COMPLETO: nomeCompleto,
      CPF: getVal('cpf'),
      IDENTIDADE: getVal('idt'),
      PREC_CP: getVal('preccp'),
      TELEFONE: getVal('telefone'),
      
      BANCO: getVal('banco'),
      AGENCIA: getVal('agencia'),
      CONTA_CORRENTE: getVal('conta'),

      // Dependentes
      TEM_DEPENDENTES: possuiDep,
      DEPENDENTES: dependentes,
      MARC_DEP_SIM: possuiDep ? 'X' : ' ',
      MARC_DEP_NAO: !possuiDep ? 'X' : ' ',
      MARC_ACOMP_SIM: possuiDep ? 'X' : ' ',
      MARC_ACOMP_NAO: !possuiDep ? 'X' : ' '
    };

    let templates = {};

    // Adiciona dados específicos da Modalidade escolhida
    if (modalidade === 'curso') {
      Object.assign(payload, {
        NOME_CURSO: getVal('cursoNome').toUpperCase(),
        OM_REALIZACAO: getVal('cursoCidade').toUpperCase(),
        GUARNICAO: getVal('cursoGuarnicao').toUpperCase(),
        ADT_DCEM: getVal('cursoAdt'),
        DATA_DESLIGAMENTO: getVal('cursoDataTermino'),
        MOTIVO: getVal('cursoMotivo').toUpperCase()
      });
      templates = {
        diex: '/templates/diex_opcao_curso_complemento.docx',
        bar: '/templates/nota_diex_opcao_curso_bar_complemento.docx',
        ord: '/templates/ord_pagto_curso_complemento.docx'
      };
    } else {
      // Movimentação
      Object.assign(payload, {
        OM_DESTINO: getVal('transfOm').toUpperCase(),
        OM_destino: getVal('transfOm').toUpperCase(),
        OM_origem: '5º BIL',
        GUARNICAO: getVal('transfGuarnicao').toUpperCase(),
        Cidade_reside: getVal('transfCidade').toUpperCase(),
        Cidade_destino: getVal('transfCidade').toUpperCase(), // Ajuste conforme formulário
        ADT_DCEM: getVal('transfAdt'),
        desligamento: getVal('transfDataDesligamento'),
        data_desligamento: getVal('transfDataDesligamento'),
        MOTIVO: getVal('transfMotivo').toUpperCase(),
        
        TEM_VEICULO: Boolean(optAuto || optMoto),
        AUTO_MODELO: optAuto ? (getVal('carro_marca') || '-') : '-', 
        AUTO_COR: optAuto ? (getVal('carro_cor') || '-') : '-',
        AUTO_PLACA: optAuto ? (getVal('carro_placa') || '-') : '-', 
        AUTO_ANO: optAuto ? (getVal('carro_ano') || '-') : '-',
        MOTO_MODELO: optMoto ? (getVal('moto_marca') || '-') : '-', 
        MOTO_COR: optMoto ? (getVal('moto_cor') || '-') : '-',
        MOTO_PLACA: optMoto ? (getVal('moto_placa') || '-') : '-', 
        MOTO_ANO: optMoto ? (getVal('moto_ano') || '-') : '-',

        // Checkboxes (Todos marcados como Não/Sim apenas como Exemplo; Ajuste a interface de Complemento se ela exigir escolha detalhada)
        ...{AUTO_SIM: marcar(optAuto).SIM, AUTO_NAO: marcar(optAuto).NAO},
        ...{MOTO_SIM: marcar(optMoto).SIM, MOTO_NAO: marcar(optMoto).NAO},
        BAG_SIM: ' ', BAG_NAO: 'X',
        PASS_SIM: ' ', PASS_NAO: 'X',
        AJUDA_SIM: 'X', AJUDA_NAO: ' ' // Complemento geralmente é Ajuda de Custo
      });
      templates = {
        diex: '/templates/diex_opcao_movimentacao_complemento.docx',
        bar: '/templates/nota_diex_opção_movimentacao_complemento.docx',
        ord: '/templates/Ord_Pagto_Nota_movimentacao_complemento.docx'
      };
    }

    const sufixoNome = `${posto.replace(/\s+/g, '_')}_${nomeCompleto.replace(/\s+/g, '_')}`;
    const pastaDestinoDrive = `Complemento_${modalidade.toUpperCase()}_${nomeCompleto.replace(/\s+/g, '_')}`;

    // Renderiza
    const blobDiex = await renderizarDocx(templates.diex, payload);
    const blobBar = await renderizarDocx(templates.bar, payload);
    const blobOrdPagto = await renderizarDocx(templates.ord, payload);

    // Download do DIEx
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blobDiex);
    link.download = `DIEx_Complemento_${modalidade}_${sufixoNome}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Upload
    btnSubmit.innerHTML = `<span class="animate-pulse">Enviando para o Drive...</span>`;
    const enviarParaDrive = async (blob, nome) => {
      await fetch(`/api/upload?filename=${encodeURIComponent(nome)}&folder=${encodeURIComponent(pastaDestinoDrive)}`, { method: 'POST', body: blob });
    };

    await enviarParaDrive(blobDiex, `DIEx_Complemento_${modalidade}_${sufixoNome}.docx`);
    await enviarParaDrive(blobBar, `NotaBAR_Complemento_${modalidade}_${sufixoNome}.docx`);
    await enviarParaDrive(blobOrdPagto, `OrdPagto_Complemento_${modalidade}_${sufixoNome}.docx`);

    // Protocolo
    try {
      await fetch('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Date.now(),
          data: new Date().toISOString(),
          requerente: `${posto} ${nomeCompleto}`,
          tipo: `Complemento de Indenização (${modalidade})`,
          arquivo: `DIEx_Complemento_${modalidade}_${sufixoNome}.docx`,
          pasta: pastaDestinoDrive,
          dependentesQtd: dependentes.length
        })
      });
    } catch (eProtocolo) {
      console.warn("Aviso: protocolo local falhou, mas upload foi concluído.");
    }

    const modalSucesso = document.getElementById('modal-sucesso');
    if (modalSucesso) modalSucesso.classList.remove('hidden');
    else alert(`Documentos gerados com sucesso! Pasta: ${pastaDestinoDrive}`);

  } catch (erro) {
    alert('Erro: ' + erro.message);
    console.error(erro);
  } finally {
    btnSubmit.innerHTML = txtOriginalBtn;
    btnSubmit.disabled = false;
    if (window.lucide) lucide.createIcons();
  }
}

function baixarPDFChecklist() {
  if (!dadosUltimoEnvio || !window.jspdf) {
    alert("Gere os documentos primeiro para poder baixar o checklist.");
    return;
  }
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
  doc.text('Militar:', 20, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`${dadosUltimoEnvio.posto} ${dadosUltimoEnvio.nomeCompleto}`, 35, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('Modalidade:', 20, 66);
  doc.setFont('helvetica', 'normal');
  doc.text(`Complemento de Indenização (${dadosUltimoEnvio.modalidade === 'curso' ? 'Curso' : 'Transferência'})`, 45, 66);

  doc.setFillColor(254, 226, 226);
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.5);
  doc.roundedRect(20, 75, 170, 16, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  doc.text('O MILITAR DEVERÁ COMPARECER À DIVISÃO ADMINISTRATIVA', 105, 81, { align: 'center' });
  doc.text('PARA ASSINATURA E ENTREGA DE DOCUMENTOS', 105, 87, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  doc.setFont('helvetica', 'bold');
  doc.text('ANEXOS NECESSÁRIOS:', 20, 100);
  doc.setFont('helvetica', 'normal');

  // Lê a mesma lista mostrada no modal de sucesso — evita manter duas listas divergentes
  const itens = Array.from(document.querySelectorAll('#lista-anexos-final li')).map(li => li.textContent.trim());
  let y = 108;
  itens.forEach(item => {
    const linhas = doc.splitTextToSize(`[   ] ${item}`, 165);
    doc.text(linhas, 20, y);
    y += linhas.length * 6;
  });

  doc.save(`Checklist_Complemento_${dadosUltimoEnvio.posto}_${dadosUltimoEnvio.nomeCompleto.replace(/\s+/g, '_')}.pdf`);
}
