import { SugestaoNota } from '../types';

export function sugerirLocalmente(descricaoServico: string): SugestaoNota;
export const BASE_CONHECIMENTO: Array<{
  palavras: string[];
  codigo: string;
  tipo: string;
  descricao: string;
  aliquota: number;
  observacoes: string;
}>;
