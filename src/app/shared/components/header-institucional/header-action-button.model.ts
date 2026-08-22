export type HeaderActionButtonColor = 'primary' | 'success' | 'warning' | 'danger' | 'muted';

export interface HeaderActionButton {
  id: string;
  icon: string;
  color?: HeaderActionButtonColor;
  ariaLabel: string;
  label?: string;
  disabled?: boolean;
  action: () => void;
}
