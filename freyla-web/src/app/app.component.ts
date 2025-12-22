import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { UserService } from './services/user.service';
import { User } from './models/user';
import { global } from './services/global';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'freyla';
  menuOpen = false;
  private readonly apiUrl = global.url;

  constructor(private userService: UserService, private router: Router) {}

  get identity(): User | null {
    return this.userService.getIdentity<User>();
  }

  get isLogged(): boolean {
    return !!this.userService.getToken();
  }

  logout(): void {
    this.userService.clearSession();
    this.menuOpen = false;
    this.router.navigate(['/login']);
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  getAvatarUrl(image?: string): string | null {
    if (!image) {
      return null;
    }
    return `${this.apiUrl}/get-image-user/${image}`;
  }
}
