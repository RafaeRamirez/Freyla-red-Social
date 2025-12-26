import { User } from './user';

export type Sticker = {
  _id?: string;
  name?: string;
  file: string;
  created_at?: string;
  user?: User | string;
  scope?: 'system' | 'user';
};
