import { useStore } from '../store/useStore';

export function useDark() {
  return useStore((s) => s.theme === 'dark');
}
