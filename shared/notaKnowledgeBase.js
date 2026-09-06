// Base de conhecimento local de códigos de serviço (LC 116/2003).
// Usada como fallback gratuito quando a OpenAI não está configurada,
// ou quando a chamada à IA falha por qualquer motivo.
const BASE_CONHECIMENTO = [
  {
    palavras: ['desenvolvimento', 'software', 'programação', 'aplicativo', 'site', 'web'],
    codigo: '01.01',
    tipo: 'NFS-e',
    descricao: 'Análise e desenvolvimento de sistemas',
    aliquota: 2.5,
    observacoes: 'Sujeito a retenção de ISS na fonte. Verificar alíquota do município.',
  },
  {
    palavras: ['consultoria', 'assessoria', 'consultor', 'gestão'],
    codigo: '17.01',
    tipo: 'NFS-e',
    descricao: 'Consultoria em gestão empresarial',
    aliquota: 2.5,
    observacoes: 'Verificar necessidade de registro no conselho de classe.',
  },
  {
    palavras: ['design', 'grafico', 'gráfico', 'identidade', 'logo', 'logotipo'],
    codigo: '01.07',
    tipo: 'NFS-e',
    descricao: 'Design gráfico',
    aliquota: 2.5,
    observacoes: 'Inclui criação de logotipos, identidade visual e materiais gráficos.',
  },
  {
    palavras: ['marketing', 'publicidade', 'propaganda', 'mídia', 'social media'],
    codigo: '17.10',
    tipo: 'NFS-e',
    descricao: 'Marketing e publicidade',
    aliquota: 2.5,
    observacoes: 'Gestão de mídias sociais e campanhas publicitárias.',
  },
  {
    palavras: ['tradução', 'tradutor', 'interprete', 'intérprete'],
    codigo: '17.08',
    tipo: 'NFS-e',
    descricao: 'Tradução e interpretação',
    aliquota: 2.5,
    observacoes: 'Serviços de tradução de documentos e interpretação simultânea.',
  },
  {
    palavras: ['aula', 'curso', 'treinamento', 'ensino', 'professor', 'instrutor'],
    codigo: '08.02',
    tipo: 'NFS-e',
    descricao: 'Instrução e treinamento',
    aliquota: 2.5,
    observacoes: 'Cursos presenciais ou online. MEI pode atuar como instrutor.',
  },
  {
    palavras: ['manutenção', 'conserto', 'reparo', 'instalação', 'técnico'],
    codigo: '14.01',
    tipo: 'NFS-e',
    descricao: 'Manutenção e reparação de equipamentos',
    aliquota: 2.5,
    observacoes: 'Verificar se há fornecimento de peças (pode exigir nota de produto).',
  },
  {
    palavras: ['limpeza', 'faxina', 'zeladoria', 'conservação'],
    codigo: '17.13',
    tipo: 'NFS-e',
    descricao: 'Limpeza e conservação',
    aliquota: 2.5,
    observacoes: 'Limpeza de imóveis, escritórios e áreas comuns.',
  },
  {
    palavras: ['fotografia', 'foto', 'filmagem', 'vídeo', 'imagem'],
    codigo: '17.11',
    tipo: 'NFS-e',
    descricao: 'Fotografia e filmagem',
    aliquota: 2.5,
    observacoes: 'Ensaios fotográficos, eventos e produção de vídeos.',
  },
  {
    palavras: ['contabilidade', 'contador', 'escrita', 'fiscal'],
    codigo: '17.03',
    tipo: 'NFS-e',
    descricao: 'Contabilidade',
    aliquota: 2.5,
    observacoes: 'Atenção: Contador não pode ser MEI, precisa ser ME ou outro regime.',
  },
];

function sugerirLocalmente(descricaoServico) {
  const textoNormalizado = descricaoServico.toLowerCase();

  let melhorMatch = null;
  let maiorScore = 0;

  for (const item of BASE_CONHECIMENTO) {
    const score = item.palavras.filter((p) => textoNormalizado.includes(p)).length;
    if (score > maiorScore) {
      maiorScore = score;
      melhorMatch = item;
    }
  }

  if (melhorMatch && maiorScore > 0) {
    return {
      tipoNota: melhorMatch.tipo,
      codigoServico: melhorMatch.codigo,
      descricao: melhorMatch.descricao,
      aliquotaISS: melhorMatch.aliquota,
      observacoes: melhorMatch.observacoes,
    };
  }

  return {
    tipoNota: 'NFS-e',
    codigoServico: '17.99',
    descricao: 'Outros serviços não especificados',
    aliquotaISS: 2.5,
    observacoes: 'Código genérico. Consulte o município para código específico.',
  };
}

module.exports = { BASE_CONHECIMENTO, sugerirLocalmente };
