declare module 'payments-icons-library' {
  export interface PaymentIcon {
    icon_name: string;
    icon_url: string;
    icon_version: string;
  }

  export type PaymentIconSize = 'sm' | 'md' | 'lg' | 'svg';

  const icons: {
    getIcon(name: string, size?: PaymentIconSize): PaymentIcon;
    getIcons(names: string[], size?: PaymentIconSize): PaymentIcon[];
    getModesIcons(mode: string, size?: PaymentIconSize): PaymentIcon[];
  };

  export default icons;
}
