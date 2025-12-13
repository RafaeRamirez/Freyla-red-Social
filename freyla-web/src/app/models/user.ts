export class User {
  _id?: string;
  name: string;
  surname: string;
  nick: string;
  email: string;
  password?: string;
  role: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;

  constructor(
    name: string,
    surname: string,
    nick: string,
    email: string,
    password?: string,
    role: string = 'ROLE_USER',
    image?: string,
    _id?: string,
    createdAt?: string,
    updatedAt?: string
  ) {
    this.name = name;
    this.surname = surname;
    this.nick = nick;
    this.email = email;
    this.password = password;
    this.role = role;
    this.image = image;
    this._id = _id;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
