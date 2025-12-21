import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { UserService } from './services/user.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'freyla';
  identity: unknown = null;
  menuOpen = false;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadSession();
  }

  get isLogged(): boolean {
    return !!this.userService.getToken();
  }

  loadSession(): void {
    this.identity = this.userService.getIdentity();
  }

  logout(): void {
    this.userService.clearSession();
    this.identity = null;
    this.menuOpen = false;
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }
}
