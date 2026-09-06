import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Alert, Modal, ScrollView, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Configuração da porta via variável de ambiente (Coolify)
const PORT = process.env.PORT || '8080';

// APIs Oficiais
const RECEITA_WS_URL = 'https://www.receitaws.com.br/v1/cnpj/';
const BRASIL_API_URL = 'https://brasilapi.com.br/api/cnpj/v1/';

// Types
interface CNPJ {
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

interface ContaPagar {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  pago: boolean;
  cnpjId: string;
}

interface NotaFiscal {
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

interface SugestaoNota {
  tipoNota: string;
  codigoServico: string;
  descricao: string;
  aliquotaISS: number;
  observacoes: string;
}

export default function App() {
  const [cnpjs, setCnpjs] = useState<CNPJ[]>([]);
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([]);
  
  const [telaAtual, setTelaAtual] = useState<'home' | 'cnpjs' | 'contas' | 'notas' | 'ia'>('home');
  const [modalCnpjVisivel, setModalCnpjVisivel] = useState(false);
  const [modalContaVisivel, setModalContaVisivel] = useState(false);
  const [modalNotaVisivel, setModalNotaVisivel] = useState(false);
  
  // Estados para consulta de CNPJ
  const [cnpjConsulta, setCnpjConsulta] = useState('');
  const [carregandoCnpj, setCarregandoCnpj] = useState(false);
  
  // Estados para IA de sugestão de nota
  const [descricaoServico, setDescricaoServico] = useState('');
  const [sugestaoNota, setSugestaoNota] = useState<SugestaoNota | null>(null);
  const [carregandoIA, setCarregandoIA] = useState(false);
  
  // Form states
  const [novoCnpj, setNovoCnpj] = useState({
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    atividadePrincipal: '',
    faturamentoAnual: 0,
    status: 'ativo' as const,
  });
  
  const [novaConta, setNovaConta] = useState({
    descricao: '',
    valor: 0,
    vencimento: '',
    cnpjId: '',
  });
  
  const [novaNota, setNovaNota] = useState({
    numero: '',
    serie: '1',
    valor: 0,
    cliente: '',
    cnpjId: '',
    tipoNota: 'NFS-e',
    codigoServico: '',
    descricaoServico: '',
  });

  const gerarId = () => Math.random().toString(36).substr(2, 9);

  // Função para consultar CNPJ na API oficial
  const consultarCNPJ = async () => {
    if (!cnpjConsulta || cnpjConsulta.length < 14) {
      Alert.alert('Erro', 'Digite um CNPJ válido com 14 dígitos');
      return;
    }

    setCarregandoCnpj(true);
    
    try {
      // Tenta primeiro a Brasil API (mais completa)
      const response = await fetch(`${BRASIL_API_URL}${cnpjConsulta.replace(/\D/g, '')}`);
      
      if (!response.ok) {
        throw new Error('CNPJ não encontrado');
      }
      
      const dados = await response.json();
      
      setNovoCnpj({
        cnpj: dados.cnpj || cnpjConsulta,
        razaoSocial: dados.razao_social || '',
        nomeFantasia: dados.nome_fantasia || '',
        atividadePrincipal: dados.atividade_principal?.[0]?.descricao || '',
        faturamentoAnual: 0,
        status: dados.situacao_cadastral === 'ATIVA' ? 'ativo' : 'suspenso',
      });
      
      Alert.alert('Sucesso', `CNPJ encontrado: ${dados.razao_social}`);
      setModalCnpjVisivel(true);
    } catch (error) {
      // Tenta fallback para Receita WS
      try {
        const response = await fetch(`${RECEITA_WS_URL}${cnpjConsulta.replace(/\D/g, '')}`);
        const dados = await response.json();
        
        if (dados.status === 'ERROR') {
          throw new Error(dados.message || 'Erro na consulta');
        }
        
        setNovoCnpj({
          cnpj: dados.cnpj || cnpjConsulta,
          razaoSocial: dados.nome || '',
          nomeFantasia: dados.fantasia || '',
          atividadePrincipal: dados.atividade_principal?.[0]?.texto || '',
          faturamentoAnual: 0,
          status: dados.situacao === 'REGULAR' ? 'ativo' : 'suspenso',
        });
        
        Alert.alert('Sucesso', `CNPJ encontrado: ${dados.nome}`);
        setModalCnpjVisivel(true);
      } catch (error2) {
        Alert.alert('Erro', 'Não foi possível consultar o CNPJ. Preencha manualmente.');
      }
    } finally {
      setCarregandoCnpj(false);
    }
  };

  // Função de IA para sugerir tipo de nota fiscal
  const sugerirTipoNota = async () => {
    if (!descricaoServico.trim()) {
      Alert.alert('Erro', 'Descreva o serviço prestado');
      return;
    }

    setCarregandoIA(true);
    
    // Base de conhecimento de códigos de serviço LC 116/2003
    const baseConhecimento = [
      {
        palavras: ['desenvolvimento', 'software', 'programação', 'aplicativo', 'site', 'web'],
        codigo: '01.01',
        tipo: 'NFS-e',
        descricao: 'Análise e desenvolvimento de sistemas',
        aliquota: 2.5,
        observacoes: 'Sujeito a retenção de ISS na fonte. Verificar alíquota do município.'
      },
      {
        palavras: ['consultoria', 'assessoria', 'consultor', 'gestão'],
        codigo: '17.01',
        tipo: 'NFS-e',
        descricao: 'Consultoria em gestão empresarial',
        aliquota: 2.5,
        observacoes: 'Verificar necessidade de registro no conselho de classe.'
      },
      {
        palavras: ['design', 'grafico', 'gráfico', 'identidade', 'logo', 'logotipo'],
        codigo: '01.07',
        tipo: 'NFS-e',
        descricao: 'Design gráfico',
        aliquota: 2.5,
        observacoes: 'Inclui criação de logotipos, identidade visual e materiais gráficos.'
      },
      {
        palavras: ['marketing', 'publicidade', 'propaganda', 'mídia', 'social media'],
        codigo: '17.10',
        tipo: 'NFS-e',
        descricao: 'Marketing e publicidade',
        aliquota: 2.5,
        observacoes: 'Gestão de mídias sociais e campanhas publicitárias.'
      },
      {
        palavras: ['tradução', 'tradutor', 'interprete', 'intérprete'],
        codigo: '17.08',
        tipo: 'NFS-e',
        descricao: 'Tradução e interpretação',
        aliquota: 2.5,
        observacoes: 'Serviços de tradução de documentos e interpretação simultânea.'
      },
      {
        palavras: ['aula', 'curso', 'treinamento', 'ensino', 'professor', 'instrutor'],
        codigo: '08.02',
        tipo: 'NFS-e',
        descricao: 'Instrução e treinamento',
        aliquota: 2.5,
        observacoes: 'Cursos presenciais ou online. MEI pode atuar como instrutor.'
      },
      {
        palavras:['manutenção', 'conserto', 'reparo', 'instalação', 'técnico'],
        codigo: '14.01',
        tipo: 'NFS-e',
        descricao: 'Manutenção e reparação de equipamentos',
        aliquota: 2.5,
        observacoes: 'Verificar se há fornecimento de peças (pode exigir nota de produto).'
      },
      {
        palavras: ['limpeza', 'faxina', 'zeladoria', 'conservação'],
        codigo: '17.13',
        tipo: 'NFS-e',
        descricao: 'Limpeza e conservação',
        aliquota: 2.5,
        observacoes: 'Limpeza de imóveis, escritórios e áreas comuns.'
      },
      {
        palavras: ['fotografia', 'foto', 'filmagem', 'vídeo', 'imagem'],
        codigo: '17.11',
        tipo: 'NFS-e',
        descricao: 'Fotografia e filmagem',
        aliquota: 2.5,
        observacoes: 'Ensaios fotográficos, eventos e produção de vídeos.'
      },
      {
        palavras: ['contabilidade', 'contador', 'escrita', 'fiscal'],
        codigo: '17.03',
        tipo: 'NFS-e',
        descricao: 'Contabilidade',
        aliquota: 2.5,
        observacoes: 'Atenção: Contador não pode ser MEI, precisa ser ME ou outro regime.'
      },
    ];

    // Simula processamento de IA (na prática usaria uma API de LLM)
    setTimeout(() => {
      const textoNormalizado = descricaoServico.toLowerCase();
      
      // Encontra a melhor correspondência
      let melhorMatch = null;
      let maiorScore = 0;
      
      for (const item of baseConhecimento) {
        const score = item.palavras.filter(p => textoNormalizado.includes(p)).length;
        if (score > maiorScore) {
          maiorScore = score;
          melhorMatch = item;
        }
      }
      
      if (melhorMatch && maiorScore > 0) {
        setSugestaoNota({
          tipoNota: melhorMatch.tipo,
          codigoServico: melhorMatch.codigo,
          descricao: melhorMatch.descricao,
          aliquotaISS: melhorMatch.aliquota,
          observacoes: melhorMatch.observacoes,
        });
      } else {
        setSugestaoNota({
          tipoNota: 'NFS-e',
          codigoServico: '17.99',
          descricao: 'Outros serviços não especificados',
          aliquotaISS: 2.5,
          observacoes: 'Código genérico. Consulte o município para código específico.',
        });
      }
      
      setCarregandoIA(false);
    }, 1500);
  };

  const aplicarSugestaoNota = () => {
    if (sugestaoNota) {
      setNovaNota({
        ...novaNota,
        tipoNota: sugestaoNota.tipoNota,
        codigoServico: sugestaoNota.codigoServico,
        descricaoServico: sugestaoNota.descricao,
      });
      setModalNotaVisivel(true);
      setDescricaoServico('');
      setSugestaoNota(null);
    }
  };

  const adicionarCNPJ = () => {
    if (!novoCnpj.cnpj || !novoCnpj.razaoSocial) {
      Alert.alert('Erro', 'Preencha pelo menos CNPJ e Razão Social');
      return;
    }
    
    const cnpj: CNPJ = {
      id: gerarId(),
      ...novoCnpj,
    };
    
    setCnpjs([...cnpjs, cnpj]);
    setNovoCnpj({
      cnpj: '',
      razaoSocial: '',
      nomeFantasia: '',
      atividadePrincipal: '',
      faturamentoAnual: 0,
      status: 'ativo',
    });
    setModalCnpjVisivel(false);
    Alert.alert('Sucesso', 'CNPJ cadastrado com sucesso!');
  };

  const adicionarConta = () => {
    if (!novaConta.descricao || !novaConta.vencimento) {
      Alert.alert('Erro', 'Preencha descrição e vencimento');
      return;
    }
    
    const conta: ContaPagar = {
      id: gerarId(),
      ...novaConta,
      pago: false,
    };
    
    setContasPagar([...contasPagar, conta]);
    setNovaConta({
      descricao: '',
      valor: 0,
      vencimento: '',
      cnpjId: '',
    });
    setModalContaVisivel(false);
    Alert.alert('Sucesso', 'Conta a pagar adicionada!');
  };

  const marcarContaComoPaga = (id: string) => {
    setContasPagar(contasPagar.map(conta => 
      conta.id === id ? { ...conta, pago: true } : conta
    ));
  };

  const emitirNota = () => {
    if (!novaNota.numero || !novaNota.cliente) {
      Alert.alert('Erro', 'Preencha número e cliente');
      return;
    }
    
    const nota: NotaFiscal = {
      id: gerarId(),
      ...novaNota,
      dataEmissao: new Date().toLocaleDateString('pt-BR'),
      status: 'emitida',
    };
    
    setNotasFiscais([...notasFiscais, nota]);
    setNovaNota({
      numero: '',
      serie: '1',
      valor: 0,
      cliente: '',
      cnpjId: '',
    });
    setModalNotaVisivel(false);
    Alert.alert('Sucesso', 'Nota fiscal emitida com sucesso!');
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getTotalContasPagar = () => {
    return contasPagar.filter(c => !c.pago).reduce((acc, c) => acc + c.valor, 0);
  };

  const getTotalNotasEmitidas = () => {
    return notasFiscais.filter(n => n.status === 'emitida').reduce((acc, n) => acc + n.valor, 0);
  };

  const renderHome = () => (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>MEI Manager</Text>
      <Text style={styles.subtitulo}>Gestão completa para MEI • Porta: {PORT}</Text>
      
      <View style={styles.cardsContainer}>
        <View style={[styles.card, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.cardTitulo}>CNPJs Ativos</Text>
          <Text style={styles.cardValor}>{cnpjs.filter(c => c.status === 'ativo').length}</Text>
        </View>
        
        <View style={[styles.card, { backgroundColor: '#FF9800' }]}>
          <Text style={styles.cardTitulo}>Contas a Pagar</Text>
          <Text style={styles.cardValor}>{formatarMoeda(getTotalContasPagar())}</Text>
        </View>
        
        <View style={[styles.card, { backgroundColor: '#2196F3' }]}>
          <Text style={styles.cardTitulo}>Notas Emitidas</Text>
          <Text style={styles.cardValor}>{formatarMoeda(getTotalNotasEmitidas())}</Text>
        </View>
      </View>

      <Text style={styles.secaoTitulo}>Resumo</Text>
      
      <View style={styles.resumoItem}>
        <Text style={styles.resumoLabel}>Total de CNPJs:</Text>
        <Text style={styles.resumoValor}>{cnpjs.length}</Text>
      </View>
      
      <View style={styles.resumoItem}>
        <Text style={styles.resumoLabel}>Contas Pendentes:</Text>
        <Text style={styles.resumoValor}>{contasPagar.filter(c => !c.pago).length}</Text>
      </View>
      
      <View style={styles.resumoItem}>
        <Text style={styles.resumoLabel}>Notas Fiscais Emitidas:</Text>
        <Text style={styles.resumoValor}>{notasFiscais.filter(n => n.status === 'emitida').length}</Text>
      </View>
    </ScrollView>
  );

  const renderIA = () => (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>🤖 IA - Sugestão de Nota Fiscal</Text>
      <Text style={styles.subtitulo}>Descreva seu serviço e receba a melhor opção de emissão</Text>
      
      <View style={styles.iaCard}>
        <Text style={styles.iaCardTitulo}>Como funciona?</Text>
        <Text style={styles.iaCardTexto}>
          Digite uma descrição do serviço que você prestou e nossa IA vai analisar e sugerir:
        </Text>
        <Text style={styles.iaCardItem}>✓ Tipo de nota fiscal adequada</Text>
        <Text style={styles.iaCardItem}>✓ Código de serviço (LC 116/2003)</Text>
        <Text style={styles.iaCardItem}>✓ Alíquota de ISS estimada</Text>
        <Text style={styles.iaCardItem}>✓ Observações importantes</Text>
      </View>

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Ex: Desenvolvimento de site institucional para loja de roupas..."
        value={descricaoServico}
        onChangeText={setDescricaoServico}
        multiline
        numberOfLines={4}
      />
      
      <TouchableOpacity 
        style={[styles.botaoSalvar, carregandoIA && styles.botaoDisabled]} 
        onPress={sugerirTipoNota}
        disabled={carregandoIA}
      >
        {carregandoIA ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botaoSalvarTexto}>🔍 Analisar Serviço</Text>
        )}
      </TouchableOpacity>

      {sugestaoNota && (
        <View style={styles.sugestaoCard}>
          <Text style={styles.sugestaoTitulo}>✨ Sugestão da IA</Text>
          
          <View style={styles.sugestaoItem}>
            <Text style={styles.sugestaoLabel}>Tipo de Nota:</Text>
            <Text style={styles.sugestaoValor}>{sugestaoNota.tipoNota}</Text>
          </View>
          
          <View style={styles.sugestaoItem}>
            <Text style={styles.sugestaoLabel}>Código de Serviço:</Text>
            <Text style={styles.sugestaoValor}>{sugestaoNota.codigoServico}</Text>
          </View>
          
          <View style={styles.sugestaoItem}>
            <Text style={styles.sugestaoLabel}>Descrição:</Text>
            <Text style={styles.sugestaoValor}>{sugestaoNota.descricao}</Text>
          </View>
          
          <View style={styles.sugestaoItem}>
            <Text style={styles.sugestaoLabel}>Alíquota ISS:</Text>
            <Text style={styles.sugestaoValor}>{sugestaoNota.aliquotaISS}%</Text>
          </View>
          
          <View style={styles.sugestaoObservacoes}>
            <Text style={styles.sugestaoLabel}>⚠️ Observações:</Text>
            <Text style={styles.sugestaoObservacoesTexto}>{sugestaoNota.observacoes}</Text>
          </View>
          
          <TouchableOpacity style={styles.botaoAplicar} onPress={aplicarSugestaoNota}>
            <Text style={styles.botaoAplicarTexto}>✅ Usar esta Sugestão</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  const renderCNPJs = () => (
    <View style={styles.container}>
      <Text style={styles.titulo}>Meus CNPJs</Text>
      
      <View style={styles.consultaContainer}>
        <TextInput
          style={[styles.input, styles.cnpjInput]}
          placeholder="Digite o CNPJ (14 dígitos)"
          value={cnpjConsulta}
          onChangeText={setCnpjConsulta}
          keyboardType="numeric"
          maxLength={14}
        />
        <TouchableOpacity 
          style={[styles.botaoConsultar, carregandoCnpj && styles.botaoDisabled]} 
          onPress={consultarCNPJ}
          disabled={carregandoCnpj}
        >
          {carregandoCnpj ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.botaoConsultarTexto}>🔍 Consultar</Text>
          )}
        </TouchableOpacity>
      </View>
      <Text style={styles.consultaInfo}>Consulta automática na Receita Federal</Text>
      
      <TouchableOpacity style={styles.botaoAdicionar} onPress={() => setModalCnpjVisivel(true)}>
        <Text style={styles.botaoTexto}>+ Novo CNPJ Manual</Text>
      </TouchableOpacity>
      
      <FlatList
        data={cnpjs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text style={styles.itemTitulo}>{item.razaoSocial}</Text>
            <Text style={styles.itemSubtitulo}>Nome Fantasia: {item.nomeFantasia || 'N/A'}</Text>
            <Text style={styles.itemDetalhe}>CNPJ: {item.cnpj}</Text>
            <Text style={styles.itemDetalhe}>Atividade: {item.atividadePrincipal}</Text>
            <Text style={styles.itemDetalhe}>Faturamento: {formatarMoeda(item.faturamentoAnual)}</Text>
            {item.dataAbertura && <Text style={styles.itemDetalhe}>Abertura: {item.dataAbertura}</Text>}
            <Text style={[styles.statusBadge, { backgroundColor: item.status === 'ativo' ? '#4CAF50' : '#f44336' }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.vazioTexto}>Nenhum CNPJ cadastrado. Consulte ou adicione um novo!</Text>
        }
      />
    </View>
  );

  const renderContas = () => (
    <View style={styles.container}>
      <Text style={styles.titulo}>Contas a Pagar</Text>
      
      <TouchableOpacity style={styles.botaoAdicionar} onPress={() => setModalContaVisivel(true)}>
        <Text style={styles.botaoTexto}>+ Nova Conta</Text>
      </TouchableOpacity>
      
      <FlatList
        data={contasPagar}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, item.pago && styles.itemPago]}>
            <Text style={styles.itemTitulo}>{item.descricao}</Text>
            <Text style={styles.itemDetalhe}>Valor: {formatarMoeda(item.valor)}</Text>
            <Text style={styles.itemDetalhe}>Vencimento: {item.vencimento}</Text>
            {!item.pago && (
              <TouchableOpacity style={styles.botaoPagar} onPress={() => marcarContaComoPaga(item.id)}>
                <Text style={styles.botaoPagarTexto}>Marcar como Paga</Text>
              </TouchableOpacity>
            )}
            {item.pago && (
              <Text style={styles.pagoBadge}>PAGO</Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.vazioTexto}>Nenhuma conta cadastrada.</Text>
        }
      />
    </View>
  );

  const renderNotas = () => (
    <View style={styles.container}>
      <Text style={styles.titulo}>Notas Fiscais</Text>
      
      <TouchableOpacity style={styles.botaoAdicionar} onPress={() => setModalNotaVisivel(true)}>
        <Text style={styles.botaoTexto}>+ Emitir Nota</Text>
      </TouchableOpacity>
      
      <FlatList
        data={notasFiscais}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text style={styles.itemTitulo}>Nota #{item.numero}</Text>
            <Text style={styles.itemSubtitulo}>Série: {item.serie}</Text>
            <Text style={styles.itemDetalhe}>Cliente: {item.cliente}</Text>
            <Text style={styles.itemDetalhe}>Valor: {formatarMoeda(item.valor)}</Text>
            <Text style={styles.itemDetalhe}>Data: {item.dataEmissao}</Text>
            <Text style={[styles.statusBadge, { backgroundColor: item.status === 'emitida' ? '#4CAF50' : '#f44336' }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.vazioTexto}>Nenhuma nota fiscal emitida.</Text>
        }
      />
    </View>
  );

  return (
    <View style={styles.appContainer}>
      {telaAtual === 'home' && renderHome()}
      {telaAtual === 'cnpjs' && renderCNPJs()}
      {telaAtual === 'contas' && renderContas()}
      {telaAtual === 'notas' && renderNotas()}
      {telaAtual === 'ia' && renderIA()}

      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity 
          style={[styles.navButton, telaAtual === 'home' && styles.navButtonActive]} 
          onPress={() => setTelaAtual('home')}
        >
          <Text style={[styles.navButtonText, telaAtual === 'home' && styles.navButtonTextActive]}>🏠 Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, telaAtual === 'cnpjs' && styles.navButtonActive]} 
          onPress={() => setTelaAtual('cnpjs')}
        >
          <Text style={[styles.navButtonText, telaAtual === 'cnpjs' && styles.navButtonTextActive]}>📋 CNPJs</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, telaAtual === 'contas' && styles.navButtonActive]} 
          onPress={() => setTelaAtual('contas')}
        >
          <Text style={[styles.navButtonText, telaAtual === 'contas' && styles.navButtonTextActive]}>💰 Contas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, telaAtual === 'notas' && styles.navButtonActive]} 
          onPress={() => setTelaAtual('notas')}
        >
          <Text style={[styles.navButtonText, telaAtual === 'notas' && styles.navButtonTextActive]}>📄 Notas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, telaAtual === 'ia' && styles.navButtonActive]} 
          onPress={() => setTelaAtual('ia')}
        >
          <Text style={[styles.navButtonText, telaAtual === 'ia' && styles.navButtonTextActive]}>🤖 IA</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Novo CNPJ */}
      <Modal visible={modalCnpjVisivel} animationType="slide">
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitulo}>Novo CNPJ</Text>
          
          <TextInput
            style={styles.input}
            placeholder="CNPJ (apenas números)"
            value={novoCnpj.cnpj}
            onChangeText={(text) => setNovoCnpj({ ...novoCnpj, cnpj: text })}
            keyboardType="numeric"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Razão Social"
            value={novoCnpj.razaoSocial}
            onChangeText={(text) => setNovoCnpj({ ...novoCnpj, razaoSocial: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Nome Fantasia"
            value={novoCnpj.nomeFantasia}
            onChangeText={(text) => setNovoCnpj({ ...novoCnpj, nomeFantasia: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Atividade Principal"
            value={novoCnpj.atividadePrincipal}
            onChangeText={(text) => setNovoCnpj({ ...novoCnpj, atividadePrincipal: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Faturamento Anual"
            value={novoCnpj.faturamentoAnual.toString()}
            onChangeText={(text) => setNovoCnpj({ ...novoCnpj, faturamentoAnual: parseFloat(text) || 0 })}
            keyboardType="numeric"
          />
          
          <TouchableOpacity style={styles.botaoSalvar} onPress={adicionarCNPJ}>
            <Text style={styles.botaoSalvarTexto}>Salvar CNPJ</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalCnpjVisivel(false)}>
            <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* Modal Nova Conta */}
      <Modal visible={modalContaVisivel} animationType="slide">
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitulo}>Nova Conta a Pagar</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Descrição"
            value={novaConta.descricao}
            onChangeText={(text) => setNovaConta({ ...novaConta, descricao: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Valor"
            value={novaConta.valor.toString()}
            onChangeText={(text) => setNovaConta({ ...novaConta, valor: parseFloat(text) || 0 })}
            keyboardType="numeric"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Data de Vencimento (DD/MM/AAAA)"
            value={novaConta.vencimento}
            onChangeText={(text) => setNovaConta({ ...novaConta, vencimento: text })}
          />
          
          <TouchableOpacity style={styles.botaoSalvar} onPress={adicionarConta}>
            <Text style={styles.botaoSalvarTexto}>Salvar Conta</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalContaVisivel(false)}>
            <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* Modal Nova Nota */}
      <Modal visible={modalNotaVisivel} animationType="slide">
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitulo}>Emitir Nota Fiscal</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Número da Nota"
            value={novaNota.numero}
            onChangeText={(text) => setNovaNota({ ...novaNota, numero: text })}
            keyboardType="numeric"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Série"
            value={novaNota.serie}
            onChangeText={(text) => setNovaNota({ ...novaNota, serie: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Valor"
            value={novaNota.valor.toString()}
            onChangeText={(text) => setNovaNota({ ...novaNota, valor: parseFloat(text) || 0 })}
            keyboardType="numeric"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Cliente"
            value={novaNota.cliente}
            onChangeText={(text) => setNovaNota({ ...novaNota, cliente: text })}
          />
          
          <TouchableOpacity style={styles.botaoSalvar} onPress={emitirNota}>
            <Text style={styles.botaoSalvarTexto}>Emitir Nota</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalNotaVisivel(false)}>
            <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    flexWrap: 'wrap',
  },
  card: {
    width: '30%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitulo: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  cardValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  secaoTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  resumoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
  },
  resumoLabel: {
    fontSize: 16,
    color: '#666',
  },
  resumoValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  botaoAdicionar: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  botaoTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
  },
  itemPago: {
    opacity: 0.6,
  },
  itemTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  itemSubtitulo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  itemDetalhe: {
    fontSize: 14,
    color: '#444',
    marginBottom: 3,
  },
  statusBadge: {
    marginTop: 10,
    padding: 5,
    borderRadius: 5,
    color: '#fff',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
  },
  botaoPagar: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  botaoPagarTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },
  pagoBadge: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    padding: 5,
    borderRadius: 5,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: 'bold',
  },
  vazioTexto: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 50,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingBottom: 20,
  },
  navButton: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
  },
  navButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  navButtonText: {
    fontSize: 12,
    color: '#666',
  },
  navButtonTextActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  modalTitulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  botaoSalvar: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  botaoSalvarTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botaoCancelar: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  botaoCancelarTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Estilos para consulta de CNPJ
  consultaContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },
  cnpjInput: {
    flex: 1,
  },
  botaoConsultar: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    justifyContent: 'center',
    minWidth: 120,
  },
  botaoConsultarTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  consultaInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  // Estilos para IA
  iaCard: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  iaCardTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
  },
  iaCardTexto: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
  },
  iaCardItem: {
    fontSize: 14,
    color: '#444',
    marginBottom: 5,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  botaoDisabled: {
    opacity: 0.6,
  },
  sugestaoCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  sugestaoTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 15,
    textAlign: 'center',
  },
  sugestaoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sugestaoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  sugestaoValor: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  sugestaoObservacoes: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 15,
  },
  sugestaoObservacoesTexto: {
    fontSize: 14,
    color: '#E65100',
    marginTop: 5,
    lineHeight: 20,
  },
  botaoAplicar: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  botaoAplicarTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
