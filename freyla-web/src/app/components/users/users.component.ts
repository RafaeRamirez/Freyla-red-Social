import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { User } from '../../models/user';
import { FollowService } from '../../services/follow.service';
import { UserService } from '../../services/user.service';
import { global } from '../../services/global';

type Identity = User & { id?: string; sub?: string };
type Stats = { following: number; followed: number; publications: number };

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
})
export class UsersComponent implements OnInit {
  public title = 'Usuarios';
  public users: User[] = [];
  public total = 0;
  public pages = 1;
  public page = 1;
  public identity: Identity | null = null;
  public token: string | null = null;
  public loading = false;
  public errorMessage = '';
  public followingIds: string[] = [];
  public followLoadingId: string | null = null;
  public userStats: Record<string, Stats> = {};
  public statsLoading: Record<string, boolean> = {};
  public statsError: Record<string, string> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private followService: FollowService
  ) {}

  ngOnInit(): void {
    this.identity = this.userService.getIdentity<Identity>();
    this.token = this.userService.getToken();

    if (!this.token) {
      this.router.navigate(['/login']);
      return;
    }

    this.route.paramMap.subscribe((params) => {
      const rawPage = Number(params.get('page') ?? 1);
      this.page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
      this.loadUsers(this.page);
    });
  }

  loadUsers(page: number): void {
    const token = this.token;
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.userService.getUsers(page, token).subscribe({
      next: (resp) => {
        const identityId = this.getIdentityId(this.identity);
        const list = resp?.users ?? [];
        this.users = identityId ? list.filter((user) => user._id !== identityId) : list;
        this.followingIds = resp?.users_following ?? [];
        this.total = resp?.total ?? this.users.length;
        this.pages = resp?.pages ?? 1;
        this.page = resp?.page ?? page;
        this.resetUserStats();
        this.loadUsersStats(this.users);
      },
      error: (err) => {
        this.loading = false;
        this.users = [];
        this.followingIds = [];
        this.total = 0;
        this.pages = 1;
        this.resetUserStats();

        const status = err?.status;
        if (status === 404 && page > 1) {
          this.router.navigate(['/gente', 1]);
          return;
        }

        this.errorMessage = err?.error?.message || 'No se pudieron cargar los usuarios.';
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  getAvatarUrl(image?: string): string | null {
    if (!image) {
      return null;
    }
    return `${global.url}/get-image-user/${image}`;
  }

  isFollowing(user: User): boolean {
    const userId = user?._id;
    if (!userId) {
      return false;
    }
    return this.followingIds.includes(userId);
  }

  followUser(userId?: string): void {
    const token = this.token;
    if (!userId || !token) {
      return;
    }

    this.followLoadingId = userId;
    this.followService.addFollow(userId, token).subscribe({
      next: () => {
        if (!this.followingIds.includes(userId)) {
          this.followingIds = [...this.followingIds, userId];
        }
        this.loadUserStats(userId);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'No se pudo seguir al usuario.';
      },
      complete: () => {
        this.followLoadingId = null;
      },
    });
  }

  unfollowUser(userId?: string): void {
    const token = this.token;
    if (!userId || !token) {
      return;
    }

    this.followLoadingId = userId;
    this.followService.deleteFollow(userId, token).subscribe({
      next: () => {
        this.followingIds = this.followingIds.filter((id) => id !== userId);
        this.loadUserStats(userId);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'No se pudo dejar de seguir.';
      },
      complete: () => {
        this.followLoadingId = null;
      },
    });
  }

  get prevPage(): number {
    return this.page > 1 ? this.page - 1 : 1;
  }

  get nextPage(): number {
    return this.page < this.pages ? this.page + 1 : this.pages;
  }

  getStatValue(userId: string | undefined, key: keyof Stats): string | number {
    if (!userId) {
      return '--';
    }
    const stats = this.userStats[userId];
    if (stats) {
      return stats[key];
    }
    if (this.statsLoading[userId]) {
      return '...';
    }
    return '--';
  }

  private resetUserStats(): void {
    this.userStats = {};
    this.statsLoading = {};
    this.statsError = {};
  }

  private loadUsersStats(users: User[]): void {
    users.forEach((user) => {
      const userId = user._id;
      if (userId) {
        this.loadUserStats(userId);
      }
    });
  }

  private loadUserStats(userId: string): void {
    this.statsLoading[userId] = true;
    this.statsError[userId] = '';

    this.userService.getCounters(userId).subscribe({
      next: (stats) => {
        this.userStats[userId] = stats;
      },
      error: (err) => {
        this.statsError[userId] = err?.error?.message || 'No se pudieron cargar las estadisticas.';
        this.statsLoading[userId] = false;
      },
      complete: () => {
        this.statsLoading[userId] = false;
      },
    });
  }

  private getIdentityId(identity: Identity | null): string | null {
    if (!identity) {
      return null;
    }
    return identity._id ?? identity.id ?? identity.sub ?? null;
  }
}
