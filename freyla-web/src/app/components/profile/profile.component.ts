import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { User } from '../../models/user';
import { UserService } from '../../services/user.service';
import { FollowService } from '../../services/follow.service';
import { PublicationService } from '../../services/publication.service';
import { Publication } from '../../models/publication';
import { global } from '../../services/global';

type Identity = User & { id?: string; sub?: string };

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  @ViewChild('coverInput') coverInput?: ElementRef<HTMLInputElement>;
  profileUser: User | null = null;
  profileStats: { following: number; followed: number; publications: number } | null = null;
  profilePublications: (Publication & { user: User })[] = [];
  publicationsLoading = false;
  publicationsError = '';
  publicationsPage = 1;
  publicationsPages = 1;
  activeTab: 'publicaciones' | 'reels' | 'fotos' | 'detalles' = 'publicaciones';
  loading = false;
  errorMessage = '';
  isSelf = false;
  isFollowing = false;
  followLoading = false;
  coverLoading = false;
  coverError = '';
  private identity: Identity | null = null;
  private token: string | null = null;
  private readonly videoExtensions = new Set(['mp4', 'webm', 'ogg', 'mov', 'm4v']);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private followService: FollowService,
    private publicationService: PublicationService
  ) {}

  ngOnInit(): void {
    this.identity = this.userService.getIdentity<Identity>();
    this.token = this.userService.getToken();

    if (!this.token) {
      this.router.navigate(['/login']);
      return;
    }

    this.route.paramMap.subscribe((params) => {
      const paramId = params.get('id');
      const identityId = this.getIdentityId(this.identity);
      const targetId = paramId || identityId;

      if (!targetId) {
        this.errorMessage = 'No se pudo resolver el perfil.';
        return;
      }

      this.isSelf = identityId === targetId;
      this.loadProfile(targetId);
    });
  }

  loadProfile(userId: string): void {
    const token = this.token;
    if (!token) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.userService.getUserProfile(userId, token).subscribe({
      next: (resp) => {
        this.profileUser = resp?.user ?? null;
        this.isFollowing = !!resp?.following;
        this.loadStats(userId);
        this.coverError = '';
        this.loadPublications(userId, 1);
      },
      error: (err) => {
        this.profileUser = null;
        this.errorMessage = err?.error?.message || 'No se pudo cargar el perfil.';
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  loadStats(userId: string): void {
    this.userService.getCounters(userId).subscribe({
      next: (stats) => {
        this.profileStats = stats;
      },
      error: () => {
        this.profileStats = null;
      },
    });
  }

  loadPublications(userId: string, page: number): void {
    const token = this.token;
    if (!token) {
      return;
    }
    this.publicationsLoading = true;
    this.publicationsError = '';
    this.publicationService.getUserPublications(userId, page, token).subscribe({
      next: (resp) => {
        this.profilePublications = (resp?.publications ?? []) as (Publication & { user: User })[];
        this.publicationsPage = resp?.page ?? page;
        this.publicationsPages = resp?.pages ?? 1;
      },
      error: (err: { status?: number; error?: { message?: string } }) => {
        this.profilePublications = [];
        if (err?.status === 404) {
          this.publicationsError = '';
        } else {
          this.publicationsError = err?.error?.message || 'No se pudieron cargar las publicaciones.';
        }
        this.publicationsLoading = false;
      },
      complete: () => {
        this.publicationsLoading = false;
      },
    });
  }

  setActiveTab(tab: 'publicaciones' | 'reels' | 'fotos' | 'detalles'): void {
    this.activeTab = tab;
  }

  toggleFollow(): void {
    const token = this.token;
    const userId = this.profileUser?._id;
    if (!token || !userId || this.isSelf) {
      return;
    }

    this.followLoading = true;

    if (this.isFollowing) {
      this.followService.deleteFollow(userId, token).subscribe({
        next: () => {
          this.isFollowing = false;
          this.loadStats(userId);
        },
        error: (err: { error?: { message?: string } }) => {
          this.errorMessage = err?.error?.message || 'No se pudo actualizar el seguimiento.';
        },
        complete: () => {
          this.followLoading = false;
        },
      });
      return;
    }

    this.followService.addFollow(userId, token).subscribe({
      next: () => {
        this.isFollowing = true;
        this.loadStats(userId);
      },
      error: (err: { error?: { message?: string } }) => {
        this.errorMessage = err?.error?.message || 'No se pudo actualizar el seguimiento.';
      },
      complete: () => {
        this.followLoading = false;
      },
    });
  }

  onCoverSelected(event: Event): void {
    const token = this.token;
    const userId = this.profileUser?._id;
    if (!token || !userId || !this.isSelf) {
      return;
    }
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      return;
    }
    this.coverLoading = true;
    this.coverError = '';

    this.userService.updateUserCover(userId, file, token).subscribe({
      next: (resp) => {
        if (this.profileUser && resp?.user?.cover) {
          this.profileUser.cover = resp.user.cover;
        }
      },
      error: (err: { error?: { message?: string } }) => {
        this.coverError = err?.error?.message || 'No se pudo actualizar la portada.';
      },
      complete: () => {
        this.coverLoading = false;
        if (this.coverInput?.nativeElement) {
          this.coverInput.nativeElement.value = '';
        }
      },
    });
  }

  openCoverPicker(): void {
    if (this.coverInput?.nativeElement) {
      this.coverInput.nativeElement.click();
    }
  }

  getAvatarUrl(image?: string): string | null {
    if (!image) {
      return null;
    }
    return `${global.url}/get-image-user/${image}`;
  }

  getCoverUrl(image?: string): string | null {
    if (!image) {
      return null;
    }
    return `${global.url}/get-image-user/${image}`;
  }

  getPublicationMediaUrl(file?: string | null): string | null {
    if (!file) {
      return null;
    }
    return `${global.url}/get-image-pub/${file}`;
  }

  isVideoFile(file?: string | null): boolean {
    if (!file) {
      return false;
    }
    const extension = file.split('.').pop()?.toLowerCase() ?? '';
    return this.videoExtensions.has(extension);
  }

  get filteredPublications(): (Publication & { user: User })[] {
    if (this.activeTab === 'publicaciones') {
      return this.profilePublications;
    }
    if (this.activeTab === 'reels') {
      return this.profilePublications.filter((publication) => this.isVideoFile(publication.file));
    }
    if (this.activeTab === 'fotos') {
      return this.profilePublications.filter((publication) => !!publication.file && !this.isVideoFile(publication.file));
    }
    return [];
  }

  get publicationsPrevPage(): number {
    return this.publicationsPage > 1 ? this.publicationsPage - 1 : 1;
  }

  get publicationsNextPage(): number {
    return this.publicationsPage < this.publicationsPages ? this.publicationsPage + 1 : this.publicationsPages;
  }

  private getIdentityId(identity: Identity | null): string | null {
    if (!identity) {
      return null;
    }
    return identity._id ?? identity.id ?? identity.sub ?? null;
  }
}
