import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Publication } from '../../models/publication';
import { User } from '../../models/user';
import { PublicationService } from '../../services/publication.service';
import { UserService } from '../../services/user.service';
import { PreferenceService } from '../../services/preference.service';
import { global } from '../../services/global';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.css'],
})
export class TimelineComponent implements OnInit {
  title = 'Reels';
  subtitle = 'Videos cortos y recientes de tu comunidad.';
  identity: User | null = null;
  token: string | null = null;
  timeline: (Publication & { user: User })[] = [];
  timelineLoading = false;
  timelineError = '';
  timelinePage = 1;
  timelinePages = 1;
  private readonly videoExtensions = new Set(['mp4', 'webm', 'ogg', 'mov', 'm4v']);
  private viewedPublications = new Set<string>();

  constructor(
    private userService: UserService,
    private publicationService: PublicationService,
    private preferenceService: PreferenceService
  ) {}

  ngOnInit(): void {
    this.identity = this.userService.getIdentity<User>();
    this.token = this.userService.getToken();
    this.loadTimeline(this.timelinePage);
  }

  loadTimeline(page: number): void {
    const token = this.token;
    if (!token) {
      this.timelineError = 'Debes iniciar sesion para ver los reels.';
      return;
    }

    this.timelineLoading = true;
    this.timelineError = '';

    this.publicationService.getPublications(page, token).subscribe({
      next: (resp) => {
        this.timeline = (resp?.publications ?? []) as (Publication & { user: User })[];
        this.timelinePage = resp?.page ?? page;
        this.timelinePages = resp?.pages ?? 1;
      },
      error: (err) => {
        this.timeline = [];
        this.timelineError = err?.error?.message || 'No se pudieron cargar los reels.';
      },
      complete: () => {
        this.timelineLoading = false;
      },
    });
  }

  get videoTimeline(): (Publication & { user: User })[] {
    return this.timeline.filter((publication) => !!publication.file && this.isVideoFile(publication.file));
  }

  getAvatarUrl(image?: string): string | null {
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

  onVideoTimeUpdate(publication: Publication & { user: User }, event: Event): void {
    const token = this.token;
    const publicationId = publication?._id;
    if (!token || !publicationId || this.viewedPublications.has(publicationId)) {
      return;
    }
    const target = event.target as HTMLVideoElement | null;
    if (!target) {
      return;
    }
    if (target.currentTime >= 5) {
      this.viewedPublications.add(publicationId);
      this.preferenceService
        .track('view', token, { publicationId })
        .subscribe({ error: () => {} });
    }
  }

  getPublicationDateMs(publication: Publication): number | null {
    const raw = publication?.created_at;
    if (!raw) {
      return null;
    }
    const numeric = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isNaN(numeric)) {
      return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
    }
    const parsed = Date.parse(String(raw));
    return Number.isNaN(parsed) ? null : parsed;
  }

  formatRelativeTime(timestampMs: number): string {
    const diffMs = Date.now() - timestampMs;
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    if (diffSec < 60) {
      return `hace ${diffSec}s`;
    }
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      return `hace ${diffMin} min`;
    }
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) {
      return `hace ${diffHours} h`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `hace ${diffDays} d`;
  }

  get timelinePrevPage(): number {
    return this.timelinePage > 1 ? this.timelinePage - 1 : 1;
  }

  get timelineNextPage(): number {
    return this.timelinePage < this.timelinePages ? this.timelinePage + 1 : this.timelinePages;
  }
}
