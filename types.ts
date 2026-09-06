export interface CNPJ {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  atividadePrincipal: string;
  atividadesSecundarias?: string[];
  faturamentoAnual: number;
  status: 'ativo' | 'suspenso' | 'baixado';
  dataAbertura?: string;
  naturezaJuridica?: string;
  endereco?: string;
}

export interface ContaPagar {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  pago: boolean;
  cnpjId: string;
}

export interface NotaFiscal {
  id: string;
  numero: string;
  serie: string;
  valor: number;
  dataEmissao: string;
  cliente: string;
  cnpjId: string;
  status: 'emitida' | 'cancelada' | 'pendente';
  tipoNota?: string;
  codigoServico?: string;
  descricaoServico?: string;
}

export interface SugestaoNota {
  tipoNota: string;
  codigoServico: string;
  descricao: string;
  aliquotaISS: number;
  observacoes: string;
}

export interface ConfiguracaoIA {
  apiKey: string;
  model: string;
}
