import { MenuItem } from '@openng/optimus-ui/api';

export interface IAsideMenuItem extends MenuItem {
  id?: string;
  route?: string;
  tooltip?: string;
  children?: IAsideMenuItem[];
  disabled?: boolean;
  hidden?: boolean;
  external?: boolean;
  url?: string;
  permissions?: string[];
}

export interface IAsideMenuSection {
  label: string;
  items: IAsideMenuItem[];
}
