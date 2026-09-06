import { SugestaoNota } from '../types';
import { sugerirLocalmente } from '../shared/notaKnowledgeBase';

export interface ResultadoSugestao {
  sugestao: SugestaoNota;
  fonte: 'openai' | 'local';
  aviso?: string;
}

interface OpcoesIA {
  apiKey?: string;
  model?: string;
}

// A API da OpenAI não permite chamadas diretas do navegador (sem CORS),
// então a chamada real acontece no nosso próprio servidor (server.js),
// que decide se usa a OpenAI ou a base de regras local. Se nem o nosso
// servidor responder, caímos na base local direto no navegador.
export async function sugerirTipoNota(descricao: string, opcoes: OpcoesIA = {}): Promise<ResultadoSugestao> {
  try {
    const response = await fetch('/api/ai/sugestao-nota', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descricao, apiKey: opcoes.apiKey, model: opcoes.model }),
    });

    if (!response.ok) {
      throw new Error(`Servidor respondeu ${response.status}`);
    }

    const dados = await response.json();
    return { sugestao: dados.sugestao, fonte: dados.fonte, aviso: dados.aviso };
  } catch {
    return {
      sugestao: sugerirLocalmente(descricao),
      fonte: 'local',
      aviso: 'Não foi possível falar com o servidor. Sugestão baseada em regras locais.',
    };
  }
}
