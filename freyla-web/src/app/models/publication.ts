// src/app/models/publication.ts
import { User } from './user';

export type PublicationReaction = {
  _id?: string;
  user: User | string;
  type: 'emoji' | 'sticker';
  value: string;
  created_at?: string;
};

export type PublicationComment = {
  _id?: string;
  user: User | string;
  text: string;
  created_at?: string;
};

export class Publication {
  _id?: string;
  text: string;
  file?: string;
  created_at?: string;
  user: string; // ObjectId del usuario que publica
  shared_from?: Publication | string;
  reactions?: PublicationReaction[];
  comments?: PublicationComment[];

  constructor(
    text: string,
    user: string,
    file?: string,
    created_at?: string,
    _id?: string,
    shared_from?: Publication | string,
    reactions?: PublicationReaction[],
    comments?: PublicationComment[]
  ) {
    this.text = text;
    this.user = user;
    this.file = file;
    this.created_at = created_at;
    this._id = _id;
    this.shared_from = shared_from;
    this.reactions = reactions;
    this.comments = comments;
  }
}
