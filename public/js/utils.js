// public/js/utils.js

/**
 * Aplica máscara de CPF: 000.000.000-00
 */
export function mascaraCPF(v) {
  return v.replace(/\D/g, '')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
          .slice(0, 14);
}

/**
 * Aplica máscara de Identidade Militar: 000000000-0
 */
export function mascaraIdt(v) {
  return v.replace(/\D/g, '')
          .replace(/(\d+)(\d)$/, '$1-$2');
}

/**
 * Aplica máscara de Prec CP: 000.000.000
 */
export function mascaraPrecCP(v) {
  return v.replace(/\D/g, '')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,3})$/, '$1.$2')
          .slice(0, 11);
}

/**
 * Aplica máscara de Telefone: (00) 00000-0000 ou (00) 0000-0000
 */
export function mascaraTelefone(v) {
  let r = v.replace(/\D/g, '');
  if (r.length > 10) {
    r = r.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  } else if (r.length > 6) {
    r = r.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
  } else if (r.length > 2) {
    r = r.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
  }
  return r.slice(0, 15);
}

/**
 * Aplica máscara de Data: DD/MM/AAAA
 */
export function mascaraData(v) {
  return v.replace(/\D/g, '')
          .replace(/(\d{2})(\d)/, '$1/$2')
          .replace(/(\d{2})(\d)/, '$1/$2')
          .slice(0, 10);
}

/**
 * Retorna a data atual no formato militar extenso
 * Ex: 11 de agosto de 2025
 */
export function obterDataExtenso() {
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const d = new Date();
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}


/**
 * Remove acentos e caracteres inválidos para nome de arquivo.
 * Ex: "1º Sgt" -> "1o_Sgt"; "JOÃO DA SILVA" -> "JOAO_DA_SILVA"
 */
export function nomeSeguro(texto) {
  return String(texto || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Padrão único de nome dos documentos gerados:
 *   TIPO_FLUXO[_COMPLEMENTO]_POSTO_NOME.docx
 * tipo: DIEX | DIEX_SPED | NOTA_BAR | ORD_PAGTO
 * fluxo: CURSO | MOVIMENTACAO | BAGAGEM
 */
export function nomeArquivoDoc(tipo, fluxo, posto, nome, complemento = false) {
  return [tipo, fluxo, complemento ? 'COMPLEMENTO' : '', nomeSeguro(posto), nomeSeguro(nome)]
    .filter(Boolean).join('_') + '.docx';
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Ex: 07 de outubro de 2026 */
export function formatarDataPorExtenso() {
  const h = new Date();
  return `${String(h.getDate()).padStart(2, '0')} de ${MESES[h.getMonth()]} de ${h.getFullYear()}`;
}

/** Ex: outubro de 2026 */
export function formatarMesAno() {
  const h = new Date();
  return `${MESES[h.getMonth()]} de ${h.getFullYear()}`;
}

/**
 * Gera um .docx a partir de um template usando Docxtemplater (PizZip e docxtemplater
 * precisam estar carregados na página). Campos sem valor saem vazios, nunca "undefined".
 */
export async function renderizarDocx(caminhoTemplate, dadosPayload) {
  const res = await fetch(caminhoTemplate);
  if (!res.ok) throw new Error(`Template não encontrado: ${caminhoTemplate}`);
  const buffer = await res.arrayBuffer();
  let doc;
  try {
    const zip = new window.PizZip(buffer);
    doc = new window.docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => '' });
    doc.render(dadosPayload);
  } catch (erro) {
    const detalhes = erro.properties?.errors?.map(e => e.properties?.explanation).filter(Boolean).join(' | ');
    throw new Error(`Falha ao gerar ${caminhoTemplate}: ${detalhes || erro.message}`);
  }
  return doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
