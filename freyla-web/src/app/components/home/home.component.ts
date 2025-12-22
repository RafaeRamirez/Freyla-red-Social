import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  title = 'Bienvenido a Freyla';
  stats: { following: number; followed: number; publications: number } | null = null;

  constructor(private userService: UserService, private router: Router) {}

  ngOnInit(): void {
    const cachedStats = this.userService.getStats();
    if (cachedStats) {
      this.stats = cachedStats;
    }
    this.loadCounters();
  }

  logout(): void {
    this.userService.clearSession();
    this.router.navigate(['/login']);
  }

  loadCounters(): void {
    this.userService.getCounters().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.userService.setStats(stats);
      },
      error: (error) => {
        console.log(error);
      },
    });
  }
}
