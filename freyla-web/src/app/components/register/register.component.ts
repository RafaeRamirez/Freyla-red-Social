import { Component, OnInit } from '@angular/core';
import { User } from '../../models/user';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit {
  public title: string;
  public user: User;

  constructor() {
    this.title = 'Registrate aqui';
   this.user = new User('', '', '', '', '', 'ROLE_USER', '', '', '', '');

  }

  ngOnInit() {
    console.log('Component register Cargando ');
  }
}
