export class User {
  _id?: string;
  name: string;
  surname: string;
  nick: string;
  email: string;
  password?: string;
  role: string;
  image?: string;
  cover?: string;
  createdAt?: string;
  updatedAt?: string;
  lastActive?: string;

  constructor(
    name: string,
    surname: string,
    nick: string,
    email: string,
    password?: string,
    role: string = 'ROLE_USER',
    image?: string,
    cover?: string,
    _id?: string,
    createdAt?: string,
    updatedAt?: string,
    lastActive?: string
  ) {
    this.name = name;
    this.surname = surname;
    this.nick = nick;
    this.email = email;
    this.password = password;
    this.role = role;
    this.image = image;
    this.cover = cover;
    this._id = _id;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.lastActive = lastActive;
  }
}
