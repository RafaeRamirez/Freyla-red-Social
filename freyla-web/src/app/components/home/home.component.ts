import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { User } from '../../models/user';
import { Publication, PublicationComment, PublicationReaction } from '../../models/publication';
import { UserService } from '../../services/user.service';
import { PublicationService } from '../../services/publication.service';
import { FollowService } from '../../services/follow.service';
import { global } from '../../services/global';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('mediaInput') mediaInput?: ElementRef<HTMLInputElement>;
  title = 'Bienvenido a Freyla';
  subtitle = 'Comparte lo que estas haciendo y descubre a nuevas personas.';
  stats: { following: number; followed: number; publications: number } | null = null;
  identity: User | null = null;
  token: string | null = null;
  publicationText = '';
  publicationLoading = false;
  publicationError = '';
  publicationSuccess = '';
  publicationMedia: File | null = null;
  publicationMediaPreview: string | null = null;
  publicationMediaError = '';
  timeline: (Publication & { user: User })[] = [];
  timelineLoading = false;
  timelineError = '';
  timelinePage = 1;
  timelinePages = 1;
  editingId: string | null = null;
  editingText = '';
  editLoading = false;
  editError = '';
  editMediaFile: File | null = null;
  editMediaPreview: string | null = null;
  editMediaIsVideo = false;
  editMediaError = '';
  editRemoveFile = false;
  deleteLoadingId: string | null = null;
  reactionLoadingId: string | null = null;
  openReactionId: string | null = null;
  commentText: Record<string, string> = {};
  commentError: Record<string, string> = {};
  commentLoadingId: string | null = null;
  deleteCommentLoadingId: string | null = null;
  shareLoadingId: string | null = null;

  emojiReactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];
  stickerReactions = ['🔥', '🎉', '😎', '🤯', '😍'];

  quickLinks = [
    { label: 'Inicio', icon: 'bi-house-door', route: '/home' },
    { label: 'Timeline', icon: 'bi-clock-history', route: '/timeline' },
    { label: 'Usuarios', icon: 'bi-people', route: '/gente' },
    { label: 'Mis datos', icon: 'bi-gear', route: '/mis-datos' },
  ];

  trends = [
    { tag: '#Freyla', posts: '12k' },
    { tag: '#Angular', posts: '8.4k' },
    { tag: '#NodeJS', posts: '6.9k' },
    { tag: '#Diseno', posts: '4.1k' },
  ];

  followingContacts: User[] = [];
  contactsLoading = false;
  contactsError = '';
  private readonly onlineThresholdMs = 30 * 1000;
  private readonly videoExtensions = new Set(['mp4', 'webm', 'ogg', 'mov', 'm4v']);

  constructor(
    private userService: UserService,
    private publicationService: PublicationService,
    private followService: FollowService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.identity = this.userService.getIdentity<User>();
    this.token = this.userService.getToken();

    const cachedStats = this.userService.getStats();
    if (cachedStats) {
      this.stats = cachedStats;
    }
    this.loadCounters();
    this.loadTimeline(this.timelinePage);
    this.loadFollowingContacts();
  }

  ngOnDestroy(): void {
    this.revokeMediaPreview();
    this.revokeEditMediaPreview();
  }

  logout(): void {
    this.userService.clearSession();
    this.router.navigate(['/login']);
  }

  getAvatarUrl(image?: string): string | null {
    if (!image) {
      return null;
    }
    return `${global.url}/get-image-user/${image}`;
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

  onSubmitPublication(form: NgForm): void {
    if (form.invalid || this.publicationLoading) {
      return;
    }

    const token = this.token;
    const text = this.publicationText.trim();
    const hasMedia = !!this.publicationMedia;
    if (!token) {
      this.publicationError = 'Debes iniciar sesion para publicar.';
      return;
    }
    if (!text && !hasMedia) {
      this.publicationError = 'Escribe algo o adjunta un archivo antes de publicar.';
      return;
    }

    this.publicationLoading = true;
    this.publicationError = '';
    this.publicationSuccess = '';

    this.publicationService.addPublication(text, token, hasMedia).subscribe({
      next: (resp) => {
        const publicationId = resp?.publication?._id;
        if (hasMedia && publicationId && this.publicationMedia) {
          const file = this.publicationMedia;
          this.publicationService.uploadPublicationMedia(publicationId, file, token).subscribe({
            next: () => {
              this.finishPublicationSuccess(form, true);
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

        this.finishPublicationSuccess(form, false);
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

  addComposerReaction(value: string): void {
    if (!value) {
      return;
    }
    const trimmed = this.publicationText.trim();
    if (!trimmed) {
      this.publicationText = value;
      return;
    }
    this.publicationText = `${this.publicationText} ${value}`.trim();
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
    if (this.mediaInput?.nativeElement) {
      this.mediaInput.nativeElement.value = '';
    }
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

  loadTimeline(page: number): void {
    const token = this.token;
    if (!token) {
      this.timelineError = 'Debes iniciar sesion para ver el timeline.';
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
        this.timelineError = err?.error?.message || 'No se pudieron cargar las publicaciones.';
      },
      complete: () => {
        this.timelineLoading = false;
      },
    });
  }

  loadFollowingContacts(): void {
    const token = this.token;
    if (!token) {
      this.contactsError = 'Debes iniciar sesion para ver contactos.';
      return;
    }

    this.contactsLoading = true;
    this.contactsError = '';

    this.followService.getMyFollows(token).subscribe({
      next: (resp) => {
        const follows = resp?.follows ?? [];
        this.followingContacts = follows
          .map((follow) => follow.followed)
          .filter((user): user is User => !!user);
      },
      error: (err) => {
        this.followingContacts = [];
        this.contactsError = err?.error?.message || 'No se pudieron cargar los contactos.';
      },
      complete: () => {
        this.contactsLoading = false;
      },
    });
  }

  isContactOnline(user: User): boolean {
    const lastActive = user?.lastActive ? new Date(user.lastActive).getTime() : 0;
    if (!lastActive) {
      return false;
    }
    return Date.now() - lastActive <= this.onlineThresholdMs;
  }

  get timelinePrevPage(): number {
    return this.timelinePage > 1 ? this.timelinePage - 1 : 1;
  }

  get timelineNextPage(): number {
    return this.timelinePage < this.timelinePages ? this.timelinePage + 1 : this.timelinePages;
  }

  isOwner(publication: Publication & { user: User }): boolean {
    const identityId = this.getIdentityId(this.identity);
    const userId = this.getIdentityId(publication?.user ?? null);
    return !!identityId && identityId === userId;
  }

  startEdit(publication: Publication & { user: User }): void {
    if (!publication?._id) {
      return;
    }
    this.editingId = publication._id;
    this.editingText = publication.text ?? '';
    this.editError = '';
    this.clearEditMediaState();
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editingText = '';
    this.editError = '';
    this.clearEditMediaState();
  }

  saveEdit(publication: Publication & { user: User }): void {
    const token = this.token;
    const publicationId = publication?._id;
    if (!token || !publicationId) {
      return;
    }

    const text = this.editingText.trim();
    const removeFile = this.editRemoveFile && !this.editMediaFile;

    this.editLoading = true;
    this.editError = '';
    this.editMediaError = '';

    this.publicationService.updatePublication(publicationId, text, token, removeFile).subscribe({
      next: (resp) => {
        const updated = resp?.publication;
        if (updated) {
          publication.text = updated.text;
          if (removeFile) {
            publication.file = undefined;
          } else if (typeof updated.file === 'string') {
            publication.file = updated.file;
          }
        }
        if (!this.editMediaFile) {
          this.cancelEdit();
          return;
        }

        const file = this.editMediaFile;
        this.publicationService.uploadPublicationMedia(publicationId, file, token).subscribe({
          next: (mediaResp) => {
            publication.file = mediaResp?.publication?.file ?? publication.file;
            this.cancelEdit();
          },
          error: (err) => {
            this.editMediaError =
              err?.error?.message || 'No se pudo subir el archivo.';
          },
          complete: () => {
            this.editLoading = false;
          },
        });
      },
      error: (err) => {
        this.editError = err?.error?.message || 'No se pudo actualizar la publicacion.';
      },
      complete: () => {
        if (!this.editMediaFile) {
          this.editLoading = false;
        }
      },
    });
  }

  deletePublication(publication: Publication & { user: User }): void {
    const token = this.token;
    const publicationId = publication?._id;
    if (!token || !publicationId) {
      return;
    }

    Swal.fire({
      title: 'Eliminar publicacion?',
      text: 'Esta accion no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }

      this.deleteLoadingId = publicationId;

      this.publicationService.deletePublication(publicationId, token).subscribe({
        next: () => {
          this.timeline = this.timeline.filter((item) => item._id !== publicationId);
          this.loadCounters();
        },
        error: (err) => {
          this.timelineError = err?.error?.message || 'No se pudo eliminar la publicacion.';
        },
        complete: () => {
          this.deleteLoadingId = null;
        },
      });
    });
  }

  toggleReactions(publicationId?: string): void {
    if (!publicationId) {
      return;
    }
    this.openReactionId = this.openReactionId === publicationId ? null : publicationId;
  }

  reactToPublication(
    publication: Publication & { user: User },
    type: PublicationReaction['type'],
    value: string
  ): void {
    const token = this.token;
    const publicationId = publication?._id;
    if (!token || !publicationId) {
      return;
    }

    const existing = this.getUserReaction(publication);
    if (existing && existing.type === type && existing.value === value) {
      this.removeReaction(publication);
      return;
    }

    this.reactionLoadingId = publicationId;
    this.publicationService.addReaction(publicationId, type, value, token).subscribe({
      next: (resp) => {
        publication.reactions = resp?.reactions ?? [];
        this.openReactionId = null;
      },
      error: (err) => {
        this.timelineError = err?.error?.message || 'No se pudo reaccionar.';
      },
      complete: () => {
        this.reactionLoadingId = null;
      },
    });
  }

  removeReaction(publication: Publication & { user: User }): void {
    const token = this.token;
    const publicationId = publication?._id;
    if (!token || !publicationId) {
      return;
    }

    this.reactionLoadingId = publicationId;
    this.publicationService.removeReaction(publicationId, token).subscribe({
      next: (resp) => {
        publication.reactions = resp?.reactions ?? [];
      },
      error: (err) => {
        this.timelineError = err?.error?.message || 'No se pudo eliminar la reaccion.';
      },
      complete: () => {
        this.reactionLoadingId = null;
      },
    });
  }

  getReactionSummary(publication: Publication & { user: User }): Array<{ value: string; count: number }> {
    const map = new Map<string, number>();
    (publication.reactions ?? []).forEach((reaction) => {
      const value = reaction.value;
      if (!value) {
        return;
      }
      map.set(value, (map.get(value) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }

  getUserReaction(publication: Publication & { user: User }): PublicationReaction | null {
    const identityId = this.getIdentityId(this.identity);
    if (!identityId) {
      return null;
    }
    return (
      publication.reactions?.find((reaction) => this.getUserId(reaction.user) === identityId) ?? null
    );
  }

  isReactionActive(
    publication: Publication & { user: User },
    type: PublicationReaction['type'],
    value: string
  ): boolean {
    const reaction = this.getUserReaction(publication);
    return !!reaction && reaction.type === type && reaction.value === value;
  }

  addComment(publication: Publication & { user: User }): void {
    const token = this.token;
    const publicationId = publication?._id;
    if (!token || !publicationId) {
      return;
    }

    const text = (this.commentText[publicationId] ?? '').trim();
    if (!text) {
      this.commentError[publicationId] = 'Escribe un comentario.';
      return;
    }

    this.commentLoadingId = publicationId;
    this.commentError[publicationId] = '';

    this.publicationService.addComment(publicationId, text, token).subscribe({
      next: (resp) => {
        publication.comments = resp?.comments ?? [];
        this.commentText[publicationId] = '';
      },
      error: (err) => {
        this.commentError[publicationId] = err?.error?.message || 'No se pudo comentar.';
      },
      complete: () => {
        this.commentLoadingId = null;
      },
    });
  }

  deleteComment(publication: Publication & { user: User }, comment: PublicationComment): void {
    const token = this.token;
    const publicationId = publication?._id;
    const commentId = comment?._id;
    if (!token || !publicationId || !commentId) {
      return;
    }

    Swal.fire({
      title: 'Eliminar comentario?',
      text: 'Esta accion no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }

      this.deleteCommentLoadingId = commentId;
      this.publicationService.deleteComment(publicationId, commentId, token).subscribe({
        next: (resp) => {
          publication.comments = resp?.comments ?? [];
        },
        error: (err) => {
          this.timelineError = err?.error?.message || 'No se pudo eliminar el comentario.';
        },
        complete: () => {
          this.deleteCommentLoadingId = null;
        },
      });
    });
  }

  isCommentOwner(comment: PublicationComment): boolean {
    const identityId = this.getIdentityId(this.identity);
    const userId = this.getUserId(comment.user);
    return !!identityId && !!userId && identityId === userId;
  }

  getCommentUser(comment: PublicationComment): User | null {
    if (!comment?.user || typeof comment.user === 'string') {
      return null;
    }
    return comment.user;
  }

  sharePublication(publication: Publication & { user: User }): void {
    const token = this.token;
    const publicationId = publication?._id;
    if (!token || !publicationId) {
      return;
    }

    Swal.fire({
      title: 'Compartir publicacion?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Compartir',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }

      this.shareLoadingId = publicationId;

      this.publicationService.sharePublication(publicationId, '', token).subscribe({
        next: () => {
          this.loadCounters();
          this.loadTimeline(1);
          Swal.fire({
            icon: 'success',
            title: 'Compartido',
            text: 'La publicacion se compartio correctamente.',
            timer: 1500,
            showConfirmButton: false,
          });
        },
        error: (err) => {
          this.timelineError = err?.error?.message || 'No se pudo compartir la publicacion.';
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: this.timelineError,
          });
        },
        complete: () => {
          this.shareLoadingId = null;
        },
      });
    });
  }

  getSharedPublication(publication: Publication & { user: User }): (Publication & { user: User }) | null {
    const shared = publication.shared_from;
    if (!shared || typeof shared === 'string') {
      return null;
    }
    return shared as Publication & { user: User };
  }

  onEditMediaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      this.editMediaError = 'Solo se permiten imagenes o videos.';
      input.value = '';
      return;
    }

    this.revokeEditMediaPreview();
    this.editMediaFile = file;
    this.editMediaIsVideo = isVideo;
    this.editMediaError = '';
    this.editRemoveFile = false;

    if (isImage) {
      this.editMediaPreview = URL.createObjectURL(file);
    } else {
      this.editMediaPreview = null;
    }

    input.value = '';
  }

  clearEditMediaSelection(): void {
    this.revokeEditMediaPreview();
    this.editMediaFile = null;
    this.editMediaIsVideo = false;
    this.editMediaError = '';
  }

  markRemoveFile(): void {
    this.editRemoveFile = true;
    this.clearEditMediaSelection();
  }

  undoRemoveFile(): void {
    this.editRemoveFile = false;
  }

  private finishPublicationSuccess(form: NgForm, withMedia: boolean): void {
    this.publicationSuccess = withMedia
      ? 'Publicacion creada con archivo.'
      : 'Publicacion creada correctamente.';
    this.publicationText = '';
    form.resetForm({ text: '' });
    this.clearMedia();
    this.loadCounters();
    this.loadTimeline(1);
  }

  private clearEditMediaState(): void {
    this.revokeEditMediaPreview();
    this.editMediaFile = null;
    this.editMediaPreview = null;
    this.editMediaIsVideo = false;
    this.editMediaError = '';
    this.editRemoveFile = false;
  }

  private revokeMediaPreview(): void {
    if (this.publicationMediaPreview) {
      URL.revokeObjectURL(this.publicationMediaPreview);
      this.publicationMediaPreview = null;
    }
  }

  private revokeEditMediaPreview(): void {
    if (this.editMediaPreview) {
      URL.revokeObjectURL(this.editMediaPreview);
      this.editMediaPreview = null;
    }
  }

  private getIdentityId(identity: User | null): string | null {
    if (!identity) {
      return null;
    }
    const withId = identity as User & { id?: string; sub?: string };
    return withId._id ?? withId.id ?? withId.sub ?? null;
  }

  private getUserId(user: User | string | null | undefined): string | null {
    if (!user) {
      return null;
    }
    if (typeof user === 'string') {
      return user;
    }
    return this.getIdentityId(user);
  }
}
