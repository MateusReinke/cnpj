import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

type TipoToast = 'sucesso' | 'erro' | 'info';

interface ToastState {
  mensagem: string;
  tipo: TipoToast;
}

interface ToastContextValue {
  mostrarToast: (mensagem: string, tipo?: TipoToast) => void;
}

const ToastContext = createContext<ToastContextValue>({ mostrarToast: () => {} });

export const useToast = () => useContext(ToastContext);

const CORES: Record<TipoToast, string> = {
  sucesso: colors.success,
  erro: colors.danger,
  info: colors.primary,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacidade = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarToast = useCallback(
    (mensagem: string, tipo: TipoToast = 'info') => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setToast({ mensagem, tipo });
      Animated.timing(opacidade, { toValue: 1, duration: 200, useNativeDriver: true }).start();

      timeoutRef.current = setTimeout(() => {
        Animated.timing(opacidade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
          setToast(null);
        });
      }, 3200);
    },
    [opacidade]
  );

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, { backgroundColor: CORES[toast.tipo], opacity: opacidade }]}
        >
          <Text style={styles.texto}>{toast.mensagem}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 92,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    ...shadow.raised,
  },
  texto: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
