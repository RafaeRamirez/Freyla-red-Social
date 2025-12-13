export class Message {
  _id?: string;
  text: string;
  viewed?: string;
  created_at?: string;
  emitter: string; // ObjectId del usuario emisor
  receiver: string; // ObjectId del usuario receptor

  constructor(
    text: string,
    emitter: string,
    receiver: string,
    viewed?: string,
    created_at?: string,
    _id?: string
  ) {
    this.text = text;
    this.emitter = emitter;
    this.receiver = receiver;
    this.viewed = viewed;
    this.created_at = created_at;
    this._id = _id;
  }
}
