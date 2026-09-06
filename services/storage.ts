import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIXO = '@mei-manager:';

export async function carregar<T>(chave: string, valorPadrao: T): Promise<T> {
  try {
    const bruto = await AsyncStorage.getItem(PREFIXO + chave);
    if (!bruto) return valorPadrao;
    return JSON.parse(bruto) as T;
  } catch {
    return valorPadrao;
  }
}

export async function salvar<T>(chave: string, valor: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
  } catch {
    // Armazenamento indisponível (ex: modo privado do navegador); os dados
    // continuam funcionando na sessão atual, só não persistem no reload.
  }
}
