import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { CNPJ, ConfiguracaoIA, ContaPagar, NotaFiscal, SugestaoNota } from './types';
import { colors, MAX_CONTENT_WIDTH, MEI_LIMITE_FATURAMENTO_ANUAL, radius, shadow, spacing } from './theme';
import { carregar, salvar } from './services/storage';
import { consultarCNPJ, formatarCNPJ } from './services/cnpjApi';
import { sugerirTipoNota as consultarSugestaoIA } from './services/aiSugestao';
import { ToastProvider, useToast } from './components/Toast';

type Tela = 'home' | 'cnpjs' | 'contas' | 'notas' | 'ia';

const CONFIG_IA_PADRAO: ConfiguracaoIA = { apiKey: '', model: '' };

function gerarId() {
  return Math.random().toString(36).substr(2, 9);
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parsarDataBR(data: string): Date | null {
  const partes = data.split('/');
  if (partes.length !== 3) return null;
  const [dia, mes, ano] = partes.map(Number);
  if (!dia || !mes || !ano) return null;
  return new Date(ano, mes - 1, dia);
}

function progressoFaturamento(valor: number) {
  return Math.min(100, Math.round((valor / MEI_LIMITE_FATURAMENTO_ANUAL) * 100));
}

function corProgresso(percentual: number) {
  if (percentual >= 95) return colors.danger;
  if (percentual >= 70) return colors.warning;
  return colors.success;
}

function AppContent() {
  const { mostrarToast } = useToast();

  const [pronto, setPronto] = useState(false);
  const [cnpjs, setCnpjs] = useState<CNPJ[]>([]);
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([]);
  const [configIA, setConfigIA] = useState<ConfiguracaoIA>(CONFIG_IA_PADRAO);
  const [statusServidorIA, setStatusServidorIA] = useState<{ openaiConfigurado: boolean; modelo: string } | null>(
    null
  );

  const [telaAtual, setTelaAtual] = useState<Tela>('home');
  const [modalCnpjVisivel, setModalCnpjVisivel] = useState(false);
  const [modalContaVisivel, setModalContaVisivel] = useState(false);
  const [modalNotaVisivel, setModalNotaVisivel] = useState(false);

  const [cnpjConsulta, setCnpjConsulta] = useState('');
  const [carregandoCnpj, setCarregandoCnpj] = useState(false);

  const [descricaoServico, setDescricaoServico] = useState('');
  const [sugestaoNota, setSugestaoNota] = useState<SugestaoNota | null>(null);
  const [fonteSugestao, setFonteSugestao] = useState<'openai' | 'local' | null>(null);
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [apiKeyRascunho, setApiKeyRascunho] = useState('');
  const [modelRascunho, setModelRascunho] = useState('');

  const cnpjVazio = {
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    atividadePrincipal: '',
    atividadesSecundarias: undefined as string[] | undefined,
    faturamentoAnual: 0,
    status: 'ativo' as const,
    dataAbertura: undefined as string | undefined,
    naturezaJuridica: undefined as string | undefined,
    endereco: undefined as string | undefined,
  };
  const [novoCnpj, setNovoCnpj] = useState<Omit<CNPJ, 'id'>>(cnpjVazio);

  const [novaConta, setNovaConta] = useState({ descricao: '', valor: 0, vencimento: '', cnpjId: '' });

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

  // Carrega os dados salvos localmente assim que o app abre.
  useEffect(() => {
    (async () => {
      const [c, cp, nf, ia] = await Promise.all([
        carregar<CNPJ[]>('cnpjs', []),
        carregar<ContaPagar[]>('contasPagar', []),
        carregar<NotaFiscal[]>('notasFiscais', []),
        carregar<ConfiguracaoIA>('configIA', CONFIG_IA_PADRAO),
      ]);
      setCnpjs(c);
      setContasPagar(cp);
      setNotasFiscais(nf);
      setConfigIA(ia);
      setApiKeyRascunho(ia.apiKey);
      setModelRascunho(ia.model);
      setPronto(true);
    })();

    fetch('/api/ai/status')
      .then((r) => r.json())
      .then(setStatusServidorIA)
      .catch(() => {});
  }, []);

  // Persiste automaticamente a cada mudança, depois que os dados iniciais já carregaram.
  useEffect(() => {
    if (pronto) salvar('cnpjs', cnpjs);
  }, [cnpjs, pronto]);
  useEffect(() => {
    if (pronto) salvar('contasPagar', contasPagar);
  }, [contasPagar, pronto]);
  useEffect(() => {
    if (pronto) salvar('notasFiscais', notasFiscais);
  }, [notasFiscais, pronto]);
  useEffect(() => {
    if (pronto) salvar('configIA', configIA);
  }, [configIA, pronto]);

  const handleConsultarCNPJ = async () => {
    const limpo = cnpjConsulta.replace(/\D/g, '');
    if (limpo.length !== 14) {
      mostrarToast('Digite um CNPJ válido com 14 dígitos', 'erro');
      return;
    }

    setCarregandoCnpj(true);
    try {
      const dados = await consultarCNPJ(limpo);
      setNovoCnpj({ ...cnpjVazio, ...dados });
      mostrarToast(`CNPJ encontrado: ${dados.razaoSocial || limpo}`, 'sucesso');
      setModalCnpjVisivel(true);
    } catch (erro: any) {
      mostrarToast(erro?.message || 'Não foi possível consultar o CNPJ. Preencha manualmente.', 'erro');
    } finally {
      setCarregandoCnpj(false);
    }
  };

  const handleSugerirTipoNota = async () => {
    if (!descricaoServico.trim()) {
      mostrarToast('Descreva o serviço prestado', 'erro');
      return;
    }

    setCarregandoIA(true);
    setSugestaoNota(null);
    const resultado = await consultarSugestaoIA(descricaoServico, {
      apiKey: configIA.apiKey || undefined,
      model: configIA.model || undefined,
    });
    setSugestaoNota(resultado.sugestao);
    setFonteSugestao(resultado.fonte);
    if (resultado.aviso) mostrarToast(resultado.aviso, 'info');
    setCarregandoIA(false);
  };

  const salvarConfigIA = () => {
    setConfigIA({ apiKey: apiKeyRascunho.trim(), model: modelRascunho.trim() });
    mostrarToast('Configuração de IA salva neste navegador', 'sucesso');
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
      mostrarToast('Preencha pelo menos CNPJ e Razão Social', 'erro');
      return;
    }

    const cnpj: CNPJ = { id: gerarId(), ...novoCnpj };
    setCnpjs([...cnpjs, cnpj]);
    setNovoCnpj(cnpjVazio);
    setModalCnpjVisivel(false);
    mostrarToast('CNPJ cadastrado com sucesso!', 'sucesso');
  };

  const removerCNPJ = (id: string) => {
    setCnpjs(cnpjs.filter((c) => c.id !== id));
    mostrarToast('CNPJ removido', 'info');
  };

  const adicionarConta = () => {
    if (!novaConta.descricao || !novaConta.vencimento) {
      mostrarToast('Preencha descrição e vencimento', 'erro');
      return;
    }

    const conta: ContaPagar = { id: gerarId(), ...novaConta, pago: false };
    setContasPagar([...contasPagar, conta]);
    setNovaConta({ descricao: '', valor: 0, vencimento: '', cnpjId: '' });
    setModalContaVisivel(false);
    mostrarToast('Conta a pagar adicionada!', 'sucesso');
  };

  const marcarContaComoPaga = (id: string) => {
    setContasPagar(contasPagar.map((conta) => (conta.id === id ? { ...conta, pago: true } : conta)));
  };

  const emitirNota = () => {
    if (!novaNota.numero || !novaNota.cliente) {
      mostrarToast('Preencha número e cliente', 'erro');
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
      tipoNota: 'NFS-e',
      codigoServico: '',
      descricaoServico: '',
    });
    setModalNotaVisivel(false);
    mostrarToast('Nota fiscal emitida com sucesso!', 'sucesso');
  };

  const getTotalContasPagar = () => contasPagar.filter((c) => !c.pago).reduce((acc, c) => acc + c.valor, 0);
  const getTotalNotasEmitidas = () =>
    notasFiscais.filter((n) => n.status === 'emitida').reduce((acc, n) => acc + n.valor, 0);

  const hoje = new Date();
  const contasAtrasadas = contasPagar.filter((c) => {
    if (c.pago) return false;
    const venc = parsarDataBR(c.vencimento);
    return venc !== null && venc < hoje;
  });
  const cnpjsPertoDoLimite = cnpjs.filter((c) => progressoFaturamento(c.faturamentoAnual) >= 70);

  const renderHome = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.containerConteudo}>
      <Text style={styles.titulo}>MEI Manager</Text>
      <Text style={styles.subtitulo}>Gestão completa para o seu MEI</Text>

      <View style={styles.cardsContainer}>
        <View style={[styles.card, { backgroundColor: colors.success }]}>
          <Text style={styles.cardTitulo}>CNPJs Ativos</Text>
          <Text style={styles.cardValor}>{cnpjs.filter((c) => c.status === 'ativo').length}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.warning }]}>
          <Text style={styles.cardTitulo}>Contas a Pagar</Text>
          <Text style={styles.cardValor}>{formatarMoeda(getTotalContasPagar())}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.info }]}>
          <Text style={styles.cardTitulo}>Notas Emitidas</Text>
          <Text style={styles.cardValor}>{formatarMoeda(getTotalNotasEmitidas())}</Text>
        </View>
      </View>

      {(contasAtrasadas.length > 0 || cnpjsPertoDoLimite.length > 0) && (
        <View style={styles.alertasContainer}>
          <Text style={styles.secaoTitulo}>⚠️ Alertas</Text>
          {contasAtrasadas.map((c) => (
            <View key={c.id} style={styles.alertaItem}>
              <Text style={styles.alertaTexto}>
                Conta <Text style={styles.alertaDestaque}>{c.descricao}</Text> venceu em {c.vencimento} e ainda não
                foi paga.
              </Text>
            </View>
          ))}
          {cnpjsPertoDoLimite.map((c) => {
            const pct = progressoFaturamento(c.faturamentoAnual);
            return (
              <View key={c.id} style={styles.alertaItem}>
                <Text style={styles.alertaTexto}>
                  <Text style={styles.alertaDestaque}>{c.razaoSocial || c.cnpj}</Text> está em {pct}% do limite anual
                  de faturamento do MEI ({formatarMoeda(MEI_LIMITE_FATURAMENTO_ANUAL)}).
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <Text style={styles.secaoTitulo}>Resumo</Text>

      <View style={styles.resumoItem}>
        <Text style={styles.resumoLabel}>Total de CNPJs:</Text>
        <Text style={styles.resumoValor}>{cnpjs.length}</Text>
      </View>

      <View style={styles.resumoItem}>
        <Text style={styles.resumoLabel}>Contas Pendentes:</Text>
        <Text style={styles.resumoValor}>{contasPagar.filter((c) => !c.pago).length}</Text>
      </View>

      <View style={styles.resumoItem}>
        <Text style={styles.resumoLabel}>Notas Fiscais Emitidas:</Text>
        <Text style={styles.resumoValor}>{notasFiscais.filter((n) => n.status === 'emitida').length}</Text>
      </View>
    </ScrollView>
  );

  const renderIA = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.containerConteudo}>
      <Text style={styles.titulo}>🤖 IA - Sugestão de Nota Fiscal</Text>
      <Text style={styles.subtitulo}>Descreva seu serviço e receba a melhor opção de emissão</Text>

      <View style={styles.configIACard}>
        <Text style={styles.configIATitulo}>⚙️ Configuração da IA (opcional)</Text>
        <Text style={styles.configIATexto}>
          Sem chave configurada, o app usa uma base de regras local (grátis, sem IA). Para respostas mais precisas,
          informe sua própria chave da OpenAI — ela é enviada só para o servidor deste app, nunca fica exposta no
          código do site.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Chave da OpenAI (sk-...)"
          value={apiKeyRascunho}
          onChangeText={setApiKeyRascunho}
          secureTextEntry
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Modelo (padrão: gpt-4o-mini)"
          value={modelRascunho}
          onChangeText={setModelRascunho}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.botaoSalvarPequeno} onPress={salvarConfigIA}>
          <Text style={styles.botaoSalvarTexto}>Salvar configuração</Text>
        </TouchableOpacity>

        <Text style={styles.configIAStatus}>
          {configIA.apiKey
            ? `🔑 Usando sua chave da OpenAI (modelo: ${configIA.model || 'gpt-4o-mini'})`
            : statusServidorIA?.openaiConfigurado
            ? `🔑 Servidor já configurado com OpenAI (modelo: ${statusServidorIA.modelo})`
            : '💡 Usando sugestões baseadas em regras locais (grátis)'}
        </Text>
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
        onPress={handleSugerirTipoNota}
        disabled={carregandoIA}
      >
        {carregandoIA ? <ActivityIndicator color={colors.white} /> : <Text style={styles.botaoSalvarTexto}>🔍 Analisar Serviço</Text>}
      </TouchableOpacity>

      {sugestaoNota && (
        <View style={styles.sugestaoCard}>
          <Text style={styles.sugestaoTitulo}>✨ Sugestão {fonteSugestao === 'openai' ? '(OpenAI)' : '(regras locais)'}</Text>

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
          placeholder="00.000.000/0000-00"
          value={formatarCNPJ(cnpjConsulta)}
          onChangeText={(texto) => setCnpjConsulta(texto.replace(/\D/g, '').slice(0, 14))}
          keyboardType="numeric"
        />
        <TouchableOpacity
          style={[styles.botaoConsultar, carregandoCnpj && styles.botaoDisabled]}
          onPress={handleConsultarCNPJ}
          disabled={carregandoCnpj}
        >
          {carregandoCnpj ? <ActivityIndicator color={colors.white} /> : <Text style={styles.botaoConsultarTexto}>🔍 Consultar</Text>}
        </TouchableOpacity>
      </View>
      <Text style={styles.consultaInfo}>Consulta automática na Receita Federal (Brasil API / ReceitaWS)</Text>

      <TouchableOpacity
        style={styles.botaoAdicionar}
        onPress={() => {
          setNovoCnpj(cnpjVazio);
          setModalCnpjVisivel(true);
        }}
      >
        <Text style={styles.botaoTexto}>+ Novo CNPJ Manual</Text>
      </TouchableOpacity>

      <FlatList
        data={cnpjs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listaConteudo}
        renderItem={({ item }) => {
          const pct = progressoFaturamento(item.faturamentoAnual);
          return (
            <View style={styles.itemCard}>
              <View style={styles.itemCabecalho}>
                <Text style={styles.itemTitulo}>{item.razaoSocial}</Text>
                <TouchableOpacity onPress={() => removerCNPJ(item.id)}>
                  <Text style={styles.removerTexto}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.itemSubtitulo}>Nome Fantasia: {item.nomeFantasia || 'N/A'}</Text>
              <Text style={styles.itemDetalhe}>CNPJ: {formatarCNPJ(item.cnpj)}</Text>
              <Text style={styles.itemDetalhe}>Atividade: {item.atividadePrincipal || 'N/A'}</Text>
              {item.endereco && <Text style={styles.itemDetalhe}>Endereço: {item.endereco}</Text>}
              {item.dataAbertura && <Text style={styles.itemDetalhe}>Abertura: {item.dataAbertura}</Text>}
              {item.naturezaJuridica && <Text style={styles.itemDetalhe}>Natureza Jurídica: {item.naturezaJuridica}</Text>}
              <Text style={styles.itemDetalhe}>Faturamento: {formatarMoeda(item.faturamentoAnual)}</Text>

              <View style={styles.barraProgressoFundo}>
                <View style={[styles.barraProgressoPreenchida, { width: `${pct}%`, backgroundColor: corProgresso(pct) }]} />
              </View>
              <Text style={styles.progressoTexto}>{pct}% do limite anual do MEI</Text>

              <Text style={[styles.statusBadge, { backgroundColor: item.status === 'ativo' ? colors.success : colors.danger }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.vazioTexto}>Nenhum CNPJ cadastrado. Consulte ou adicione um novo!</Text>}
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
        contentContainerStyle={styles.listaConteudo}
        renderItem={({ item }) => {
          const venc = parsarDataBR(item.vencimento);
          const atrasada = !item.pago && venc !== null && venc < hoje;
          return (
            <View style={[styles.itemCard, item.pago && styles.itemPago]}>
              <Text style={styles.itemTitulo}>{item.descricao}</Text>
              <Text style={styles.itemDetalhe}>Valor: {formatarMoeda(item.valor)}</Text>
              <Text style={styles.itemDetalhe}>Vencimento: {item.vencimento}</Text>
              {atrasada && <Text style={styles.atrasadaBadge}>ATRASADA</Text>}
              {!item.pago && (
                <TouchableOpacity style={styles.botaoPagar} onPress={() => marcarContaComoPaga(item.id)}>
                  <Text style={styles.botaoPagarTexto}>Marcar como Paga</Text>
                </TouchableOpacity>
              )}
              {item.pago && <Text style={styles.pagoBadge}>PAGO</Text>}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.vazioTexto}>Nenhuma conta cadastrada.</Text>}
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
        contentContainerStyle={styles.listaConteudo}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text style={styles.itemTitulo}>Nota #{item.numero}</Text>
            <Text style={styles.itemSubtitulo}>Série: {item.serie}</Text>
            <Text style={styles.itemDetalhe}>Cliente: {item.cliente}</Text>
            <Text style={styles.itemDetalhe}>Valor: {formatarMoeda(item.valor)}</Text>
            <Text style={styles.itemDetalhe}>Data: {item.dataEmissao}</Text>
            <Text style={[styles.statusBadge, { backgroundColor: item.status === 'emitida' ? colors.success : colors.danger }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.vazioTexto}>Nenhuma nota fiscal emitida.</Text>}
      />
    </View>
  );

  if (!pronto) {
    return (
      <View style={styles.telaCarregando}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.appContainer}>
      <StatusBar style="dark" />
      <View style={styles.phoneFrame}>
        {telaAtual === 'home' && renderHome()}
        {telaAtual === 'cnpjs' && renderCNPJs()}
        {telaAtual === 'contas' && renderContas()}
        {telaAtual === 'notas' && renderNotas()}
        {telaAtual === 'ia' && renderIA()}

        <View style={styles.navBar}>
          {([
            { chave: 'home', label: '🏠 Home' },
            { chave: 'cnpjs', label: '📋 CNPJs' },
            { chave: 'contas', label: '💰 Contas' },
            { chave: 'notas', label: '📄 Notas' },
            { chave: 'ia', label: '🤖 IA' },
          ] as { chave: Tela; label: string }[]).map((item) => (
            <TouchableOpacity
              key={item.chave}
              style={[styles.navButton, telaAtual === item.chave && styles.navButtonActive]}
              onPress={() => setTelaAtual(item.chave)}
            >
              <Text style={[styles.navButtonText, telaAtual === item.chave && styles.navButtonTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Modal visible={modalCnpjVisivel} animationType="slide">
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitulo}>Novo CNPJ</Text>

          <TextInput
            style={styles.input}
            placeholder="00.000.000/0000-00"
            value={formatarCNPJ(novoCnpj.cnpj)}
            onChangeText={(texto) => setNovoCnpj({ ...novoCnpj, cnpj: texto.replace(/\D/g, '').slice(0, 14) })}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Razão Social"
            value={novoCnpj.razaoSocial}
            onChangeText={(texto) => setNovoCnpj({ ...novoCnpj, razaoSocial: texto })}
          />

          <TextInput
            style={styles.input}
            placeholder="Nome Fantasia"
            value={novoCnpj.nomeFantasia}
            onChangeText={(texto) => setNovoCnpj({ ...novoCnpj, nomeFantasia: texto })}
          />

          <TextInput
            style={styles.input}
            placeholder="Atividade Principal"
            value={novoCnpj.atividadePrincipal}
            onChangeText={(texto) => setNovoCnpj({ ...novoCnpj, atividadePrincipal: texto })}
          />

          <TextInput
            style={styles.input}
            placeholder="Faturamento Anual"
            value={novoCnpj.faturamentoAnual ? String(novoCnpj.faturamentoAnual) : ''}
            onChangeText={(texto) => setNovoCnpj({ ...novoCnpj, faturamentoAnual: parseFloat(texto) || 0 })}
            keyboardType="numeric"
          />

          {(novoCnpj.endereco || novoCnpj.dataAbertura || novoCnpj.naturezaJuridica) && (
            <View style={styles.infoAdicionalCard}>
              <Text style={styles.infoAdicionalTitulo}>Dados encontrados na consulta</Text>
              {novoCnpj.endereco && <Text style={styles.infoAdicionalTexto}>📍 {novoCnpj.endereco}</Text>}
              {novoCnpj.dataAbertura && <Text style={styles.infoAdicionalTexto}>📅 Abertura: {novoCnpj.dataAbertura}</Text>}
              {novoCnpj.naturezaJuridica && <Text style={styles.infoAdicionalTexto}>🏛️ {novoCnpj.naturezaJuridica}</Text>}
            </View>
          )}

          <TouchableOpacity style={styles.botaoSalvar} onPress={adicionarCNPJ}>
            <Text style={styles.botaoSalvarTexto}>Salvar CNPJ</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalCnpjVisivel(false)}>
            <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      <Modal visible={modalContaVisivel} animationType="slide">
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitulo}>Nova Conta a Pagar</Text>

          <TextInput
            style={styles.input}
            placeholder="Descrição"
            value={novaConta.descricao}
            onChangeText={(texto) => setNovaConta({ ...novaConta, descricao: texto })}
          />

          <TextInput
            style={styles.input}
            placeholder="Valor"
            value={novaConta.valor ? String(novaConta.valor) : ''}
            onChangeText={(texto) => setNovaConta({ ...novaConta, valor: parseFloat(texto) || 0 })}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Data de Vencimento (DD/MM/AAAA)"
            value={novaConta.vencimento}
            onChangeText={(texto) => setNovaConta({ ...novaConta, vencimento: texto })}
          />

          <TouchableOpacity style={styles.botaoSalvar} onPress={adicionarConta}>
            <Text style={styles.botaoSalvarTexto}>Salvar Conta</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botaoCancelar} onPress={() => setModalContaVisivel(false)}>
            <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      <Modal visible={modalNotaVisivel} animationType="slide">
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitulo}>Emitir Nota Fiscal</Text>

          <TextInput
            style={styles.input}
            placeholder="Número da Nota"
            value={novaNota.numero}
            onChangeText={(texto) => setNovaNota({ ...novaNota, numero: texto })}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Série"
            value={novaNota.serie}
            onChangeText={(texto) => setNovaNota({ ...novaNota, serie: texto })}
          />

          <TextInput
            style={styles.input}
            placeholder="Valor"
            value={novaNota.valor ? String(novaNota.valor) : ''}
            onChangeText={(texto) => setNovaNota({ ...novaNota, valor: parseFloat(texto) || 0 })}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Cliente"
            value={novaNota.cliente}
            onChangeText={(texto) => setNovaNota({ ...novaNota, cliente: texto })}
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

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  telaCarregando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  appContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: spacing.xl,
    paddingTop: 50,
  },
  containerConteudo: {
    paddingBottom: spacing.xxl,
  },
  titulo: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    flexGrow: 1,
    flexBasis: '30%',
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    ...shadow.card,
  },
  cardTitulo: {
    fontSize: 12,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  cardValor: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  alertasContainer: {
    marginBottom: spacing.lg,
  },
  alertaItem: {
    backgroundColor: colors.warningLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  alertaTexto: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  alertaDestaque: {
    fontWeight: '700',
  },
  secaoTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  resumoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  resumoLabel: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  resumoValor: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  botaoAdicionar: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  botaoTexto: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  listaConteudo: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  itemCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  itemCabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  removerTexto: {
    color: colors.textMuted,
    fontSize: 16,
    paddingHorizontal: spacing.sm,
  },
  itemPago: {
    opacity: 0.6,
  },
  itemTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    flexShrink: 1,
  },
  itemSubtitulo: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  itemDetalhe: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  barraProgressoFundo: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  barraProgressoPreenchida: {
    height: '100%',
    borderRadius: radius.pill,
  },
  progressoTexto: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  statusBadge: {
    marginTop: spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    color: colors.white,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    alignSelf: 'flex-start',
  },
  atrasadaBadge: {
    marginTop: spacing.sm,
    color: colors.danger,
    fontWeight: '700',
    fontSize: 12,
  },
  botaoPagar: {
    backgroundColor: colors.info,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  botaoPagarTexto: {
    color: colors.white,
    fontWeight: '700',
  },
  pagoBadge: {
    backgroundColor: colors.success,
    color: colors.white,
    padding: spacing.sm,
    borderRadius: radius.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontWeight: '700',
    alignSelf: 'flex-start',
  },
  vazioTexto: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 15,
    marginTop: 50,
    paddingHorizontal: spacing.xl,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 18,
    paddingTop: spacing.xs,
  },
  navButton: {
    flex: 1,
    padding: spacing.sm,
    marginHorizontal: 4,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  navButtonActive: {
    backgroundColor: colors.primaryLight,
  },
  navButtonText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  navButtonTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    padding: spacing.xl,
    paddingTop: 50,
    backgroundColor: colors.surface,
  },
  modalTitulo: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  infoAdicionalCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoAdicionalTitulo: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  infoAdicionalTexto: {
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 3,
  },
  botaoSalvar: {
    backgroundColor: colors.success,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  botaoSalvarPequeno: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  botaoSalvarTexto: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  botaoCancelar: {
    backgroundColor: colors.danger,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  botaoCancelarTexto: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  consultaContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginTop: 50,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cnpjInput: {
    flex: 1,
    marginBottom: 0,
  },
  botaoConsultar: {
    backgroundColor: colors.info,
    padding: spacing.md,
    borderRadius: radius.md,
    justifyContent: 'center',
    minWidth: 120,
  },
  botaoConsultarTexto: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  consultaInfo: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: spacing.md,
    marginHorizontal: spacing.xl,
    textAlign: 'center',
  },
  configIACard: {
    backgroundColor: colors.primaryLight,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  configIATitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: spacing.sm,
  },
  configIATexto: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  configIAStatus: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  botaoDisabled: {
    opacity: 0.6,
  },
  sugestaoCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginTop: spacing.xl,
    borderWidth: 2,
    borderColor: colors.success,
    ...shadow.card,
  },
  sugestaoTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.success,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  sugestaoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sugestaoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sugestaoValor: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
  sugestaoObservacoes: {
    backgroundColor: colors.warningLight,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sugestaoObservacoesTexto: {
    fontSize: 13,
    color: colors.warning,
    marginTop: spacing.xs,
    lineHeight: 19,
  },
  botaoAplicar: {
    backgroundColor: colors.success,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  botaoAplicarTexto: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
