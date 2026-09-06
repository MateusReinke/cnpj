import { CNPJ } from '../types';

const BRASIL_API_URL = 'https://brasilapi.com.br/api/cnpj/v1/';
const RECEITA_WS_URL = 'https://www.receitaws.com.br/v1/cnpj/';

export type DadosCNPJ = Omit<CNPJ, 'id'>;

function montarEndereco(partes: Array<string | undefined | null>): string {
  return partes.filter((p) => p && String(p).trim().length > 0).join(', ');
}

// A Brasil API retorna `situacao_cadastral` como código numérico e
// `descricao_situacao_cadastral` como o texto ("ATIVA", "BAIXADA", ...).
// A atividade principal vem em `cnae_fiscal_descricao` (string única),
// não em `atividade_principal[0].descricao` (isso não existe na Brasil API).
function normalizarBrasilAPI(dados: any, cnpjDigitado: string): DadosCNPJ {
  const situacao = String(dados.descricao_situacao_cadastral || '').toUpperCase();

  return {
    cnpj: dados.cnpj || cnpjDigitado,
    razaoSocial: dados.razao_social || '',
    nomeFantasia: dados.nome_fantasia || '',
    atividadePrincipal: dados.cnae_fiscal_descricao || '',
    atividadesSecundarias: Array.isArray(dados.cnaes_secundarios)
      ? dados.cnaes_secundarios.map((a: any) => a.descricao).filter(Boolean)
      : undefined,
    faturamentoAnual: 0,
    status: situacao === 'ATIVA' ? 'ativo' : situacao === 'BAIXADA' ? 'baixado' : 'suspenso',
    dataAbertura: dados.data_inicio_atividade,
    naturezaJuridica: dados.natureza_juridica || dados.descricao_natureza_juridica,
    endereco: montarEndereco([
      [dados.descricao_tipo_de_logradouro, dados.logradouro].filter(Boolean).join(' '),
      dados.numero,
      dados.bairro,
      dados.municipio && dados.uf ? `${dados.municipio}/${dados.uf}` : dados.municipio,
      dados.cep,
    ]),
  };
}

// A ReceitaWS retorna o texto da atividade em `text` (não `texto`), e a
// situação já como string ("ATIVA").
function normalizarReceitaWS(dados: any, cnpjDigitado: string): DadosCNPJ {
  const situacao = String(dados.situacao || '').toUpperCase();

  return {
    cnpj: dados.cnpj || cnpjDigitado,
    razaoSocial: dados.nome || '',
    nomeFantasia: dados.fantasia || '',
    atividadePrincipal: dados.atividade_principal?.[0]?.text || '',
    atividadesSecundarias: Array.isArray(dados.atividades_secundarias)
      ? dados.atividades_secundarias.map((a: any) => a.text).filter(Boolean)
      : undefined,
    faturamentoAnual: 0,
    status: situacao === 'ATIVA' ? 'ativo' : situacao === 'BAIXADA' ? 'baixado' : 'suspenso',
    dataAbertura: dados.abertura,
    naturezaJuridica: dados.natureza_juridica,
    endereco: montarEndereco([
      dados.logradouro,
      dados.numero,
      dados.bairro,
      dados.municipio && dados.uf ? `${dados.municipio}/${dados.uf}` : dados.municipio,
      dados.cep,
    ]),
  };
}

export async function consultarCNPJ(cnpjDigitado: string): Promise<DadosCNPJ> {
  const cnpjLimpo = cnpjDigitado.replace(/\D/g, '');

  try {
    const response = await fetch(`${BRASIL_API_URL}${cnpjLimpo}`);
    if (!response.ok) {
      throw new Error(`Brasil API respondeu ${response.status}`);
    }
    const dados = await response.json();
    return normalizarBrasilAPI(dados, cnpjLimpo);
  } catch (erroBrasilAPI) {
    try {
      const response = await fetch(`${RECEITA_WS_URL}${cnpjLimpo}`);
      const dados = await response.json();
      if (dados.status === 'ERROR') {
        throw new Error(dados.message || 'CNPJ não encontrado na Receita WS');
      }
      return normalizarReceitaWS(dados, cnpjLimpo);
    } catch (erroReceitaWS) {
      throw new Error('Não foi possível consultar o CNPJ em nenhuma das fontes disponíveis. Preencha manualmente.');
    }
  }
}

export function formatarCNPJ(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 14);
  return digitos
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}
