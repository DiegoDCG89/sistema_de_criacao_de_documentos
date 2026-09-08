// Centraliza todas as funções utilitárias e máscaras
export function mascaraCPF(valor) {
  return valor.replace(/\D/g, '')
              .replace(/(\d{3})(\d)/, '$1.$2')
              .replace(/(\d{3})(\d)/, '$1.$2')
              .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function dataExtensoMilitar() {
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const d = new Date();
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

// Inicializa os listeners genéricos
export function iniciarMascaras() {
  const inputCpf = document.getElementById('cpf');
  if (inputCpf) {
    inputCpf.addEventListener('input', e => e.target.value = mascaraCPF(e.target.value));
  }
}
