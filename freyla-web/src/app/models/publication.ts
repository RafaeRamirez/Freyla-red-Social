// src/app/models/publication.ts
export class Publication {
  _id?: string;
  text: string;
  file?: string;
  created_at?: string;
  user: string; // ObjectId del usuario que publica

  constructor(
    text: string,
    user: string,
    file?: string,
    created_at?: string,
    _id?: string
  ) {
    this.text = text;
    this.user = user;
    this.file = file;
    this.created_at = created_at;
    this._id = _id;
  }
}
