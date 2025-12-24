import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { User } from '../../models/user';
import { Publication } from '../../models/publication';
import { UserService } from '../../services/user.service';
import { PublicationService } from '../../services/publication.service';
import { global } from '../../services/global';

type Identity = User & { id?: string; sub?: string };
type Stats = { following: number; followed: number; publications: number };

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit, OnDestroy {
  @ViewChild('sidebarMediaInput') sidebarMediaInput?: ElementRef<HTMLInputElement>;
  @Input() mode: 'self' | 'people' = 'self';
  @Input() profileUser: Identity | null = null;
  @Input() profileStats: Stats | null = null;
  @Input() profileLoading = false;
  @Input() profileStatus = '';

  public identity: Identity | null = null;
  public token: string | null = null;
  public url = global.url;
  public publication: Publication | null = null;
  public publicationMessage = '';
  public publicationError = '';
  public publicationLoading = false;
  public publicationMedia: File | null = null;
  public publicationMediaPreview: string | null = null;
  public publicationMediaError = '';

  private selfStats: Stats | null = null;
  private selfStatus = '';
  private selfLoading = false;

  constructor(
    private userService: UserService,
    private publicationService: PublicationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.mode !== 'self') {
      return;
    }

    this.identity = this.userService.getIdentity<Identity>();
    this.token = this.userService.getToken();
    this.selfStats = this.userService.getStats();
    this.initPublication();

    if (this.token) {
      this.loadCounters();
    }
  }

  ngOnDestroy(): void {
    this.revokeMediaPreview();
  }

  loadCounters(): void {
    this.selfLoading = true;
    this.userService.getCounters().subscribe({
      next: (stats) => {
        this.selfStats = stats;
        this.userService.setStats(stats);
        this.selfStatus = '';
      },
      error: (err) => {
        this.selfStatus = err?.error?.message || 'No se pudieron cargar las estadisticas.';
        this.selfLoading = false;
      },
      complete: () => {
        this.selfLoading = false;
      },
    });
  }

  get displayUser(): Identity | null {
    return this.mode === 'people' ? this.profileUser : this.identity;
  }

  get displayStats(): Stats | null {
    return this.mode === 'people' ? this.profileStats : this.selfStats;
  }

  get displayLoading(): boolean {
    return this.mode === 'people' ? this.profileLoading : this.selfLoading;
  }

  get displayStatus(): string {
    return this.mode === 'people' ? this.profileStatus : this.selfStatus;
  }

  get showActions(): boolean {
    return this.mode === 'self';
  }

  get emptyTitle(): string {
    return this.mode === 'people' ? 'Selecciona un usuario' : 'Inicia sesion';
  }

  get emptySubtitle(): string {
    return this.mode === 'people'
      ? 'Elige a alguien de la lista para ver su informacion.'
      : 'Accede para ver tu perfil y tus estadisticas.';
  }

  getAvatarUrl(image?: string): string | null {
    if (!image) {
      return null;
    }
    return `${this.url}/get-image-user/${image}`;
  }

  logout(): void {
    this.userService.clearSession();
    this.router.navigate(['/login']);
  }

  onSubmitPublication(form: NgForm): void {
    if (form.invalid || this.publicationLoading) {
      return;
    }

    const token = this.token;
    const publication = this.publication;
    if (!token || !publication) {
      this.publicationError = 'Debes iniciar sesion para publicar.';
      return;
    }

    const text = publication.text?.trim() ?? '';
    const hasMedia = !!this.publicationMedia;
    if (!text && !hasMedia) {
      this.publicationError = 'Escribe un texto o adjunta un archivo antes de publicar.';
      return;
    }

    this.publicationLoading = true;
    this.publicationError = '';
    this.publicationMessage = '';

    this.publicationService.addPublication(text, token, hasMedia).subscribe({
      next: (resp) => {
        const publicationId = resp?.publication?._id;
        if (hasMedia && publicationId && this.publicationMedia) {
          const file = this.publicationMedia;
          this.publicationService.uploadPublicationMedia(publicationId, file, token).subscribe({
            next: () => {
              this.finishPublicationSuccess(form, publication, true);
            },
            error: (err) => {
              this.publicationError =
                err?.error?.message || 'La publicacion se creo, pero no se pudo subir el archivo.';
            },
            complete: () => {
              this.publicationLoading = false;
            },
          });
          return;
        }

        this.finishPublicationSuccess(form, publication, false);
      },
      error: (err) => {
        this.publicationError = err?.error?.message || 'No se pudo crear la publicacion.';
      },
      complete: () => {
        if (!hasMedia) {
          this.publicationLoading = false;
        }
      },
    });
  }

  onMediaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      this.publicationMediaError = 'Solo se permiten imagenes o videos.';
      this.clearMedia();
      return;
    }

    this.revokeMediaPreview();
    this.publicationMedia = file;
    this.publicationMediaError = '';

    if (isImage) {
      this.publicationMediaPreview = URL.createObjectURL(file);
    } else {
      this.publicationMediaPreview = null;
    }
  }

  clearMedia(): void {
    this.revokeMediaPreview();
    this.publicationMedia = null;
    this.publicationMediaError = '';
    if (this.sidebarMediaInput?.nativeElement) {
      this.sidebarMediaInput.nativeElement.value = '';
    }
  }

  private initPublication(): void {
    const userId = this.getIdentityId(this.identity);
    this.publication = new Publication('', userId ?? '');
  }

  private finishPublicationSuccess(form: NgForm, publication: Publication, withMedia: boolean): void {
    this.publicationMessage = withMedia
      ? 'Publicacion creada con archivo.'
      : 'Publicacion creada correctamente.';
    publication.text = '';
    form.resetForm({ text: '' });
    this.clearMedia();
    this.loadCounters();
  }

  private revokeMediaPreview(): void {
    if (this.publicationMediaPreview) {
      URL.revokeObjectURL(this.publicationMediaPreview);
      this.publicationMediaPreview = null;
    }
  }

  private getIdentityId(identity: Identity | null): string | null {
    if (!identity) {
      return null;
    }
    return identity._id ?? identity.id ?? identity.sub ?? null;
  }
}
