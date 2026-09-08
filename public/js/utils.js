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
