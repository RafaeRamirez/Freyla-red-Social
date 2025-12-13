export class Follow {
  _id?: string;
  user: string;
  followed: string;
  createdAt?: string;
  updatedAt?: string;

  constructor(
    user: string,
    followed: string,
    _id?: string,
    createdAt?: string,
    updatedAt?: string
  ) {
    this.user = user;
    this.followed = followed;
    this._id = _id;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
