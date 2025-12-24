import { Component, OnDestroy, OnInit } from '@angular/core';
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
export class AppComponent implements OnInit, OnDestroy {
  title = 'freyla';
  menuOpen = false;
  private readonly apiUrl = global.url;
  private heartbeatId: number | null = null;

  constructor(private userService: UserService, private router: Router) {}

  ngOnInit(): void {
    this.startHeartbeat();
  }

  ngOnDestroy(): void {
    if (this.heartbeatId !== null) {
      window.clearInterval(this.heartbeatId);
      this.heartbeatId = null;
    }
  }

  get identity(): User | null {
    return this.userService.getIdentity<User>();
  }

  get isLogged(): boolean {
    return !!this.userService.getToken();
  }

  logout(): void {
    this.userService.clearSession();
    this.menuOpen = false;
    if (this.heartbeatId !== null) {
      window.clearInterval(this.heartbeatId);
      this.heartbeatId = null;
    }
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

  private startHeartbeat(): void {
    const runPing = () => {
      const token = this.userService.getToken();
      if (!token) {
        return;
      }
      this.userService.ping(token).subscribe({
        error: () => {},
      });
    };

    runPing();
    this.heartbeatId = window.setInterval(runPing, 20_000);
  }
}
