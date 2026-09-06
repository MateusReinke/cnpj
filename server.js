const express = require('express');
const path = require('path');
const { sugerirLocalmente } = require('./shared/notaKnowledgeBase');

const PORT = process.env.PORT || 8080;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const app = express();
app.use(express.json());

async function sugerirComOpenAI(descricaoServico, apiKey, model) {
  const prompt = `Você é um especialista em emissão de notas fiscais para MEI (Microempreendedor Individual) no Brasil, seguindo a Lei Complementar 116/2003.
Analise a descrição do serviço abaixo e responda SOMENTE com um JSON no formato:
{"tipoNota": "NFS-e ou NF-e", "codigoServico": "código LC 116/2003", "descricao": "descrição curta do serviço", "aliquotaISS": número (percentual estimado), "observacoes": "alertas ou observações relevantes para o MEI"}

Descrição do serviço: "${descricaoServico}"`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  let response;
  try {
    response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detalhe = await response.text().catch(() => '');
    throw new Error(`OpenAI respondeu ${response.status}: ${detalhe.slice(0, 300)}`);
  }

  const payload = await response.json();
  const conteudo = payload.choices?.[0]?.message?.content;
  if (!conteudo) {
    throw new Error('Resposta da OpenAI sem conteúdo.');
  }

  const sugestao = JSON.parse(conteudo);
  if (!sugestao.tipoNota || !sugestao.codigoServico) {
    throw new Error('JSON da OpenAI incompleto.');
  }

  return {
    tipoNota: String(sugestao.tipoNota),
    codigoServico: String(sugestao.codigoServico),
    descricao: String(sugestao.descricao || ''),
    aliquotaISS: Number(sugestao.aliquotaISS) || 0,
    observacoes: String(sugestao.observacoes || ''),
  };
}

app.get('/api/ai/status', (req, res) => {
  res.json({ openaiConfigurado: Boolean(OPENAI_API_KEY), modelo: OPENAI_MODEL });
});

app.post('/api/ai/sugestao-nota', async (req, res) => {
  const { descricao, apiKey, model } = req.body || {};

  if (!descricao || !String(descricao).trim()) {
    res.status(400).json({ error: 'Descreva o serviço prestado.' });
    return;
  }

  const chaveEfetiva = apiKey || OPENAI_API_KEY;
  const modeloEfetivo = model || OPENAI_MODEL;

  if (!chaveEfetiva) {
    res.json({ fonte: 'local', sugestao: sugerirLocalmente(descricao) });
    return;
  }

  try {
    const sugestao = await sugerirComOpenAI(descricao, chaveEfetiva, modeloEfetivo);
    res.json({ fonte: 'openai', sugestao });
  } catch (erro) {
    console.error('Falha ao consultar a OpenAI, usando sugestão local:', erro.message);
    res.json({
      fonte: 'local',
      sugestao: sugerirLocalmente(descricao),
      aviso: 'Não foi possível usar a OpenAI agora (verifique a chave e o modelo). Sugestão baseada em regras locais.',
    });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));

// Fallback de SPA: qualquer rota não-API cai no index.html.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    next();
    return;
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MEI Manager rodando na porta ${PORT}`);
  console.log(`IA da OpenAI ${OPENAI_API_KEY ? 'configurada' : 'NÃO configurada'} (modelo padrão: ${OPENAI_MODEL})`);
});
