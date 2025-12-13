import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  public title: string;

  constructor() {
    this.title = 'Inicia sesion aqui';
  }

  ngOnInit() {
    console.log('Component login Cargando ');
  }
}
