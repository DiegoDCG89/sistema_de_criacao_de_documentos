// =========================================================================
// SisDoc - Gerador de DIEx e Nota p/ BAR de Movimentação (Transferência)
// =========================================================================

// Formata data por extenso: ex: "17 de setembro de 2026"
function formatarDataPorExtenso() {
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = meses[hoje.getMonth()];
  const ano = hoje.getFullYear();
  return `${dia} de ${mes} de ${ano}`;
}

// Cria uma linha dinâmica de dependente (Nome e Grau de Parentesco)
function adicionarLinhaDependenteMov() {
  const listaDep = document.getElementById('lista-dependentes-mov') || document.getElementById('lista-dependentes');
  if (!listaDep) return;

  const divLinha = document.createElement('div');
  divLinha.className = 'grid grid-cols-1 sm:grid-cols-5 gap-3 p-3 bg-stone-50 rounded-lg border border-stone-200 relative item-dependente items-end';
  
  divLinha.innerHTML = `
    <div class="sm:col-span-3">
      <label class="block text-[11px] font-semibold text-stone-600 mb-1">Nome Completo *</label>
      <input type="text" class="dep-nome w-full border border-stone-300 rounded px-2 py-1.5 text-xs uppercase" placeholder="NOME DO DEPENDENTE" required>
    </div>
    <div class="sm:col-span-2 flex items-end gap-2">
      <div class="flex-grow">
        <label class="block text-[11px] font-semibold text-stone-600 mb-1">Grau de Parentesco *</label>
        <select class="dep-parentesco w-full border border-stone-300 rounded px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-[#2c3b2c] focus:outline-none" required>
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
      <button type="button" class="btn-remover-dep px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded border border-red-300 text-xs transition cursor-pointer" title="Remover Dependente">
        ✕
      </button>
    </div>
  `;

  divLinha.querySelector('.btn-remover-dep').addEventListener('click', () => {
    divLinha.remove();
  });

  listaDep.appendChild(divLinha);
}

// Inicialização dos eventos do DOM
document.addEventListener('DOMContentLoaded', () => {
  // 1. Toggle de exibição dos campos de veículos de acordo com as opções do Item 1
  const radAutoSim = document.querySelector('input[name="opt_auto"][value="sim"]');
  const radAutoNao = document.querySelector('input[name="opt_auto"][value="nao"]');
  const boxAuto = document.getElementById('box-dados-auto');

  const radMotoSim = document.querySelector('input[name="opt_moto"][value="sim"]');
  const radMotoNao = document.querySelector('input[name="opt_moto"][value="nao"]');
  const boxMoto = document.getElementById('box-dados-moto');

  function atualizarVisibilidadeVeiculos() {
    if (boxAuto) boxAuto.style.display = (radAutoSim && radAutoSim.checked) ? 'block' : 'none';
    if (boxMoto) boxMoto.style.display = (radMotoSim && radMotoSim.checked) ? 'block' : 'none';
  }

  [radAutoSim, radAutoNao, radMotoSim, radMotoNao].forEach(el => {
    if (el) el.addEventListener('change', atualizarVisibilidadeVeiculos);
  });
  atualizarVisibilidadeVeiculos();

  // 2. Toggle de Dependentes
  const radDepSim = document.querySelector('input[name="opt_dependentes"][value="sim"]');
  const radDepNao = document.querySelector('input[name="opt_dependentes"][value="nao"]');
  const caixaInclusao = document.getElementById('caixa-inclusao-dependentes');

  function atualizarVisibilidadeDep() {
    if (!caixaInclusao) return;
    caixaInclusao.style.display = (radDepSim && radDepSim.checked) ? 'block' : 'none';
  }

  if (radDepSim) radDepSim.addEventListener('change', atualizarVisibilidadeDep);
  if (radDepNao) radDepNao.addEventListener('change', atualizarVisibilidadeDep);
  atualizarVisibilidadeDep();

  // Botão Adicionar Dependente
  const btnAddDep = document.getElementById('btn-add-dep-mov') || document.getElementById('btn-add-dep');
  if (btnAddDep) {
    btnAddDep.onclick = (e) => {
      e.preventDefault();
      adicionarLinhaDependenteMov();
    };
  }

  // Intercepta envio do formulário de movimentação
  const form = document.getElementById('form-movimentacao') || document.querySelector('form');
  if (form) {
    form.addEventListener('submit', processarEnvioMovimentacao);
  }
});

// Coleta a lista de dependentes
function coletarDependentesMov() {
  const radDepSim = document.querySelector('input[name="opt_dependentes"][value="sim"]');
  if (!radDepSim || !radDepSim.checked) return [];

  const itens = document.querySelectorAll('.item-dependente');
  const dependentes = [];

  itens.forEach((el) => {
    const nome = el.querySelector('.dep-nome')?.value.trim().toUpperCase() || '';
    const parentesco = el.querySelector('.dep-parentesco')?.value.trim() || '';
    if (nome && parentesco) {
      dependentes.push({ NOME: nome, PARENTESCO: parentesco });
    }
  });

  return dependentes;
}

// Renderizador Office genérico em memória
async function renderizarDocx(caminhoTemplate, payload, PizZipLib, DocxLib) {
  const res = await fetch(caminhoTemplate);
  if (!res.ok) {
    throw new Error(`Não foi possível carregar o modelo '${caminhoTemplate}' (Status HTTP ${res.status}).`);
  }
  const buffer = await res.arrayBuffer();
  const zip = new PizZipLib(buffer);
  const doc = new DocxLib(zip, { paragraphLoop: true, linebreaks: true });

  try {
    doc.render(payload);
  } catch (err) {
    if (err.properties && err.properties.errors) {
      const msgs = err.properties.errors.map(e => e.properties?.explanation || e.message).join(' | ');
      throw new Error(`Erro de sintaxe no template '${caminhoTemplate}': ${msgs}`);
    }
    throw err;
  }

  return doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
}

// Processador Principal de Movimentação
async function processarEnvioMovimentacao(e) {
  e.preventDefault();

  const btnSubmit = document.getElementById('btn-submit');
  const textoOriginal = btnSubmit ? btnSubmit.innerHTML : 'Confirmar e Gerar Documentos';

  try {
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<span class="animate-pulse">Processando documentos de movimentação...</span>`;
    }

    const getVal = (id) => document.getElementById(id)?.value.trim() || '';
    const isChecked = (selector) => Boolean(document.querySelector(selector)?.checked);

    // 1. Coleta das opções do Item 1 (Indenizações Optadas)
    const optAuto = isChecked('input[name="opt_auto"][value="sim"]') || isChecked('#chk_auto');
    const optMoto = isChecked('input[name="opt_moto"][value="sim"]') || isChecked('#chk_moto');
    const optBagagem = isChecked('input[name="opt_bagagem"][value="sim"]') || isChecked('#chk_bagagem');
    const optPassagens = isChecked('input[name="opt_passagens"][value="sim"]') || isChecked('#chk_passagens');
    const optAjuda = isChecked('input[name="opt_ajuda"][value="sim"]') || isChecked('#chk_ajuda');

    const marcar = (cond) => ({ SIM: cond ? 'X' : ' ', NAO: !cond ? 'X' : ' ' });

    const mAuto = marcar(optAuto);
    const mMoto = marcar(optMoto);
    const mBag = marcar(optBagagem);
    const mPass = marcar(optPassagens);
    const mAjuda = marcar(optAjuda);

    // 2. Dependentes
    const possuiDep = isChecked('input[name="opt_dependentes"][value="sim"]');
    const dependentesAcompanham = isChecked('input[name="opt_dep_acompanham"][value="sim"]');
    const dependentes = possuiDep ? coletarDependentesMov() : [];

    const dados = {
      DATA_ATUAL: formatarDataPorExtenso(),
      POSTO_GRAD: getVal('posto') || getVal('posto_graduacao'),
      NOME_COMPLETO: (getVal('nome') || getVal('nome_completo')).toUpperCase(),
      CPF: getVal('cpf'),
      IDENTIDADE: getVal('idt') || getVal('identidade'),
      PREC_CP: getVal('preccp') || getVal('prec_cp'),
      TELEFONE: getVal('telefone'),
      
      // Movimentação
      OM_DESTINO: (getVal('omDestino') || getVal('om_destino')).toUpperCase(),
      OM_destino: (getVal('omDestino') || getVal('om_destino')).toUpperCase(),
      OM_origem: (getVal('omOrigem') || getVal('om_origem') || '5º BIL').toUpperCase(),
      GUARNICAO: (getVal('guarnicao') || getVal('guarnicao_destino')).toUpperCase(),
      ADT_DCEM: getVal('adtDcem') || getVal('adt_dcem'),
      Cidade_reside: getVal('cidadeReside') || getVal('cidade_reside'),
      Cidade_destino: getVal('cidadeDestino') || getVal('cidade_destino'),
      desligamento: getVal('dataDesligamento') || getVal('desligamento'),
      data_desligamento: getVal('dataDesligamento') || getVal('desligamento'),

      // Bancários
      BANCO: getVal('banco'),
      AGENCIA: getVal('agencia'),
      CONTA_CORRENTE: getVal('conta') || getVal('conta_corrente'),

      // Item 1 - Marcadores Dinâmicos
      AUTO_SIM: mAuto.SIM,
      AUTO_NAO: mAuto.NAO,
      MOTO_SIM: mMoto.SIM,
      MOTO_NAO: mMoto.NAO,
      BAG_SIM: mBag.SIM,
      BAG_NAO: mBag.NAO,
      PASS_SIM: mPass.SIM,
      PASS_NAO: mPass.NAO,
      AJUDA_SIM: mAjuda.SIM,
      AJUDA_NAO: mAjuda.NAO,

      // Item 3 - Dependentes
      MARC_DEP_SIM: possuiDep ? 'X' : ' ',
      MARC_DEP_NAO: !possuiDep ? 'X' : ' ',
      MARC_ACOMP_SIM: (possuiDep && dependentesAcompanham) ? 'X' : ' ',
      MARC_ACOMP_NAO: (!possuiDep || !dependentesAcompanham) ? 'X' : ' ',
      TEM_DEPENDENTES: possuiDep && dependentesAcompanham && dependentes.length > 0,
      DEPENDENTES: dependentes,

      // Item 4 - Veículos
      TEM_VEICULO: Boolean(optAuto || optMoto),
      AUTO_MODELO: optAuto ? (getVal('auto_modelo') || '-') : '-',
      AUTO_COR: optAuto ? (getVal('auto_cor') || '-') : '-',
      AUTO_PLACA: optAuto ? (getVal('auto_placa') || '-') : '-',
      AUTO_ANO: optAuto ? (getVal('auto_ano') || '-') : '-',

      MOTO_MODELO: optMoto ? (getVal('moto_modelo') || '-') : '-',
      MOTO_COR: optMoto ? (getVal('moto_cor') || '-') : '-',
      MOTO_PLACA: optMoto ? (getVal('moto_placa') || '-') : '-',
      MOTO_ANO: optMoto ? (getVal('moto_ano') || '-') : '-'
    };

    if (!dados.POSTO_GRAD || !dados.NOME_COMPLETO) {
      alert("Por favor, preencha o Posto/Graduação e o Nome Completo.");
      return;
    }

    const PizZipConstructor = window.PizZip || window.pizzip || (typeof PizZip !== 'undefined' ? PizZip : null);
    const DocxtemplaterConstructor = window.docxtemplater || window.Docxtemplater || (typeof docxtemplater !== 'undefined' ? docxtemplater : null);

    if (!PizZipConstructor || !DocxtemplaterConstructor) {
      throw new Error("Bibliotecas Word (PizZip/Docxtemplater) não disponíveis no navegador.");
    }

    const sufixoNome = `${dados.POSTO_GRAD.replace(/\s+/g, '_')}_${dados.NOME_COMPLETO.replace(/\s+/g, '_')}.docx`;
    const pastaDestinoDrive = `Movimentacao_${dados.NOME_COMPLETO.replace(/\s+/g, '_')}`;

    // 1. GERAÇÃO DO DIEX PRINCIPAL (Baixado para o militar + enviado ao Drive)
    const blobDiex = await renderizarDocx('/templates/diex_opcao_movimentacao.docx', dados, PizZipConstructor, DocxtemplaterConstructor);
    const nomeArquivoDiex = `DIEx_Opcao_Movimentacao_${sufixoNome}`;

    const urlDownload = URL.createObjectURL(blobDiex);
    const link = document.createElement('a');
    link.href = urlDownload;
    link.download = nomeArquivoDiex;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(urlDownload);

    // 2. GERAÇÃO DA NOTA P/ BAR (Apenas para o Google Drive)
    if (btnSubmit) btnSubmit.innerHTML = `<span class="animate-pulse">Gerando Nota para BAR...</span>`;

    const blobBar = await renderizarDocx('/templates/nota_diex_opção_movimentacao.docx', dados, PizZipConstructor, DocxtemplaterConstructor);
    const nomeArquivoBar = `Nota_p_BAR_Movimentacao_${sufixoNome}`;

    // 3. UPLOAD SEQUENCIAL (Garante a criação de 1 pasta única no Drive)
    if (btnSubmit) btnSubmit.innerHTML = `<span class="animate-pulse">Enviando arquivos para a pasta ${pastaDestinoDrive}...</span>`;

    const enviarParaDrive = async (blob, nomeArquivo) => {
      const url = `/api/upload?filename=${encodeURIComponent(nomeArquivo)}&folder=${encodeURIComponent(pastaDestinoDrive)}`;
      return fetch(url, { method: 'POST', body: blob });
    };

    const listaEnvios = [
      { blob: blobDiex, nome: nomeArquivoDiex },
      { blob: blobBar, nome: nomeArquivoBar }
    ];

    for (const item of listaEnvios) {
      try {
        await enviarParaDrive(item.blob, item.nome);
      } catch (errDrive) {
        console.warn(`Aviso no upload de ${item.nome}:`, errDrive);
      }
    }

    // Registra protocolo no banco
    try {
      await fetch('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Date.now(),
          data: new Date().toISOString(),
          requerente: `${dados.POSTO_GRAD} ${dados.NOME_COMPLETO}`,
          tipo: 'DIEx Opção - Movimentação (com Nota BAR)',
          arquivo: nomeArquivoDiex,
          pasta: pastaDestinoDrive,
          dependentesQtd: dependentes.length
        })
      });
    } catch (eProtocolo) {
      console.warn("Aviso ao registrar protocolo:", eProtocolo);
    }

    // Modal de confirmação
    const modalSucesso = document.getElementById('modal-sucesso');
    if (modalSucesso) {
      modalSucesso.classList.remove('hidden');
    }

  } catch (err) {
    console.error("Erro no processamento:", err);
    alert(`Erro ao processar documentos: ${err.message}`);
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = textoOriginal;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }
}
