import { Component, OnDestroy, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { UserService } from './services/user.service';
import { User } from './models/user';
import { global } from './services/global';
import { NotificationEntry, NotificationService } from './services/notification.service';
import { FollowService } from './services/follow.service';
import { MessageEntry, MessageService } from './services/message.service';
import { PreferenceService } from './services/preference.service';

type NotificationUser = User | string;
type MessageUser = User | string;

interface MessageItem extends MessageEntry {
  emitter?: MessageUser;
  receiver?: MessageUser;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('chatMessages') chatMessages?: ElementRef<HTMLDivElement>;
  @ViewChild('chatPanel') chatPanel?: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') messageInput?: ElementRef<HTMLInputElement>;
  title = 'freyla';
  menuOpen = false;
  private readonly apiUrl = global.url;
  private heartbeatId: number | null = null;
  private notificationsId: number | null = null;
  private chatPollingId: number | null = null;
  private readonly onlineThresholdMs = 30 * 1000;
  notificationsOpen = false;
  notificationsFilter: 'all' | 'unread' = 'all';
  notifications: NotificationEntry[] = [];
  unviewedCount = 0;
  chatsOpen = false;
  chatsLoading = false;
  chatsError = '';
  chatSearch = '';
  chatContacts: User[] = [];
  selectedReceiverId: string | null = null;
  messageText = '';
  sendLoading = false;
  sendError = '';
  sendSuccess = '';
  receivedMessages: MessageItem[] = [];
  sentMessages: MessageItem[] = [];
  receivedLoading = false;
  sentLoading = false;
  receivedError = '';
  sentError = '';
  receivedPage = 1;
  sentPage = 1;
  chatUnviewedCount = 0;
  newMessagesCount = 0;
  private isAtBottom = true;
  private lastConversationTimestamp = 0;
  private readonly pollingMs = 3000;
  private isDraggingChat = false;
  private dragOffset = { x: 0, y: 0 };
  private chatPosition: { x: number; y: number } | null = null;
  private dragMoveHandler?: (event: PointerEvent) => void;
  private dragEndHandler?: (event: PointerEvent) => void;

  constructor(
    private userService: UserService,
    private notificationService: NotificationService,
    private followService: FollowService,
    private messageService: MessageService,
    private preferenceService: PreferenceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.startHeartbeat();
    this.startNotifications();
    this.startChatPolling();
  }

  ngOnDestroy(): void {
    if (this.heartbeatId !== null) {
      window.clearInterval(this.heartbeatId);
      this.heartbeatId = null;
    }
    if (this.notificationsId !== null) {
      window.clearInterval(this.notificationsId);
      this.notificationsId = null;
    }
    if (this.chatPollingId !== null) {
      window.clearInterval(this.chatPollingId);
      this.chatPollingId = null;
    }
    this.removeChatDragListeners();
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
    if (this.notificationsId !== null) {
      window.clearInterval(this.notificationsId);
      this.notificationsId = null;
    }
    this.router.navigate(['/login']);
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  toggleNotifications(): void {
    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) {
      this.chatsOpen = false;
    }
  }

  closeNotifications(): void {
    this.notificationsOpen = false;
    const token = this.userService.getToken();
    if (token && this.unviewedCount > 0) {
      this.notificationService.setNotificationsSeen(token).subscribe({
        next: () => {
          this.unviewedCount = 0;
          this.notifications = this.notifications.map((notification) => ({
            ...notification,
            seen: true,
          }));
        },
        error: () => {},
      });
    }
  }

  toggleChats(): void {
    this.chatsOpen = !this.chatsOpen;
    if (this.chatsOpen) {
      this.notificationsOpen = false;
      this.loadChatContacts();
    }
  }

  closeChats(): void {
    this.chatsOpen = false;
  }


  selectChat(contact: User): void {
    if (!contact?._id) {
      return;
    }
    this.closeChats();
    this.selectReceiver(contact);
  }

  get filteredChatContacts(): User[] {
    const term = this.chatSearch.trim().toLowerCase();
    if (!term) {
      return this.chatContacts;
    }
    return this.chatContacts.filter((contact) => {
      const name = `${contact.name || ''} ${contact.surname || ''}`.toLowerCase();
      const nick = (contact.nick || '').toLowerCase();
      return name.includes(term) || nick.includes(term);
    });
  }

  trackChatSearch(): void {
    const token = this.userService.getToken();
    const value = this.chatSearch.trim();
    if (!token || value.length < 2) {
      return;
    }
    this.preferenceService
      .track('search', token, { searchText: value })
      .subscribe({ error: () => {} });
  }

  get chatPositionStyle(): { [key: string]: string } | null {
    if (!this.chatPosition) {
      return null;
    }
    return {
      left: `${this.chatPosition.x}px`,
      top: `${this.chatPosition.y}px`,
      right: 'auto',
      bottom: 'auto',
    };
  }

  get selectedReceiver(): User | null {
    return this.chatContacts.find((contact) => contact._id === this.selectedReceiverId) ?? null;
  }

  isContactOnline(user: User): boolean {
    const lastActive = user?.lastActive ? new Date(user.lastActive).getTime() : 0;
    if (!lastActive) {
      return false;
    }
    return Date.now() - lastActive <= this.onlineThresholdMs;
  }

  get canSend(): boolean {
    return !!this.selectedReceiverId && this.messageText.trim().length > 0;
  }

  get conversationMessages(): Array<{ message: MessageItem; isSelf: boolean; time: string | null; viewed: boolean }> {
    const contactId = this.selectedReceiverId;
    if (!contactId) {
      return [];
    }
    const identityId = this.getIdentityId();
    const messages = [...this.receivedMessages, ...this.sentMessages].filter((message) => {
      const emitterId = this.getMessageUserId(message.emitter);
      const receiverId = this.getMessageUserId(message.receiver);
      return emitterId === contactId || receiverId === contactId;
    });

    return messages
      .slice()
      .sort((a, b) => this.getMessageTimestampForMessage(a) - this.getMessageTimestampForMessage(b))
      .map((message) => {
        const emitterId = this.getMessageUserId(message.emitter);
        const isSelf = identityId ? emitterId === identityId : false;
        return {
          message,
          isSelf,
          time: this.getMessageTime(message),
          viewed: isSelf ? this.isMessageViewed(message) : false,
        };
      });
  }

  setNotificationsFilter(filter: 'all' | 'unread'): void {
    this.notificationsFilter = filter;
  }

  openFromNotification(notification: NotificationEntry): void {
    this.closeNotifications();
    const actorId = this.getUserId(notification.actor);
    const publicationId =
      typeof notification.publication === 'string'
        ? notification.publication
        : notification.publication?._id || null;
    if (publicationId) {
      this.router.navigate(['/home'], { queryParams: { post: publicationId } });
      return;
    }
    if (notification.type === 'follow' && actorId) {
      this.router.navigate(['/gente']);
      return;
    }
    this.router.navigate(['/home']);
  }

  get notificationsList(): NotificationEntry[] {
    const ordered = this.notifications
      .slice()
      .sort((a, b) => this.getMessageTimestamp(b) - this.getMessageTimestamp(a));
    const filtered =
      this.notificationsFilter === 'unread'
        ? ordered.filter((notification) => !this.isNotificationSeen(notification))
        : ordered;
    return filtered.slice(0, 6);
  }

  getMessageUserName(user: NotificationUser | undefined): string {
    if (user && typeof user === 'object') {
      const typed = user as User;
      const fullName = [typed.name, typed.surname].filter(Boolean).join(' ').trim();
      return fullName || typed.nick || 'Usuario';
    }
    return 'Usuario';
  }

  getMessageAvatar(user: NotificationUser | undefined): string | null {
    if (user && typeof user === 'object') {
      const typed = user as User;
      return this.getAvatarUrl(typed.image);
    }
    return null;
  }

  getRelativeTime(notification: NotificationEntry): string {
    const timestamp = this.getMessageTimestamp(notification);
    if (!timestamp) {
      return '';
    }
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.max(1, Math.floor(diffMs / 1000));
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 0) {
      return `hace ${diffDay} d`;
    }
    if (diffHour > 0) {
      return `hace ${diffHour} h`;
    }
    if (diffMin > 0) {
      return `hace ${diffMin} min`;
    }
    return 'justo ahora';
  }

  getNotificationTitle(notification: NotificationEntry): string {
    const actor = this.getMessageUserName(notification.actor as NotificationUser);
    if (notification.type === 'follow') {
      return `${actor} comenzo a seguirte`;
    }
    if (notification.type === 'reaction') {
      return `${actor} reacciono a tu publicacion`;
    }
    if (notification.type === 'comment') {
      return `${actor} comento tu publicacion`;
    }
    return actor;
  }

  getNotificationBody(notification: NotificationEntry): string {
    if (notification.type === 'comment' && notification.content) {
      return notification.content;
    }
    if (typeof notification.publication === 'object' && notification.publication?.text) {
      return notification.publication.text;
    }
    return '';
  }

  getAvatarUrl(image?: string): string | null {
    if (!image) {
      return null;
    }
    return `${this.apiUrl}/get-image-user/${image}`;
  }

  private getUserId(user: NotificationUser | undefined): string | null {
    if (!user) {
      return null;
    }
    if (typeof user === 'string') {
      return user;
    }
    return user._id || null;
  }

  private getMessageTimestamp(notification: NotificationEntry): number {
    const raw = notification?.created_at;
    if (!raw) {
      return 0;
    }
    const numeric = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isNaN(numeric) && numeric) {
      return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
    }
    const parsed = Date.parse(String(raw));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  isNotificationSeen(notification: NotificationEntry): boolean {
    const value = notification?.seen;
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    return String(value).toLowerCase() === 'true' || String(value) === '1';
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

  private startNotifications(): void {
    const runFetch = () => {
      const token = this.userService.getToken();
      if (!token) {
        return;
      }
      this.notificationService.getNotifications(token, 10).subscribe({
        next: (resp) => {
          this.notifications = resp?.notifications ?? [];
          this.unviewedCount = resp?.unviewed ?? 0;
        },
        error: () => {
          this.notifications = [];
          this.unviewedCount = 0;
        },
      });
    };

    runFetch();
    this.notificationsId = window.setInterval(runFetch, 7000);
  }

  private loadChatContacts(): void {
    const token = this.userService.getToken();
    if (!token) {
      this.chatContacts = [];
      return;
    }
    if (this.chatsLoading) {
      return;
    }
    this.chatsLoading = true;
    this.chatsError = '';
    this.followService.getMyFollows(token).subscribe({
      next: (resp) => {
        const follows = resp?.follows ?? [];
        this.chatContacts = follows
          .map((follow) => follow.followed)
          .filter((user): user is User => !!user);
      },
      error: (err) => {
        this.chatContacts = [];
        this.chatsError = err?.error?.message || 'No se pudieron cargar los contactos.';
      },
      complete: () => {
        this.chatsLoading = false;
      },
    });
  }

  private startChatPolling(): void {
    if (this.chatPollingId !== null) {
      return;
    }
    this.chatPollingId = window.setInterval(() => {
      const token = this.userService.getToken();
      if (!token) {
        return;
      }
      this.loadReceivedMessages(this.receivedPage);
      this.loadSentMessages(this.sentPage);
      this.loadChatUnviewedCount();
    }, this.pollingMs);
  }

  private loadReceivedMessages(page: number): void {
    const token = this.userService.getToken();
    if (!token) {
      return;
    }
    this.receivedLoading = true;
    this.receivedError = '';
    this.messageService.getReceivedMessages(page, token).subscribe({
      next: (resp) => {
        this.receivedMessages = (resp?.messages ?? []) as MessageItem[];
        this.receivedPage = resp?.page ?? page;
        if (this.selectedReceiverId) {
          this.markConversationViewed(this.selectedReceiverId);
        }
        this.updateConversationState();
      },
      error: (err) => {
        if (err?.status === 404) {
          this.receivedMessages = [];
          this.receivedPage = page;
          return;
        }
        this.receivedMessages = [];
        this.receivedError = err?.error?.message || 'No se pudieron cargar los mensajes recibidos.';
      },
      complete: () => {
        this.receivedLoading = false;
      },
    });
  }

  private loadSentMessages(page: number): void {
    const token = this.userService.getToken();
    if (!token) {
      return;
    }
    this.sentLoading = true;
    this.sentError = '';
    this.messageService.getSentMessages(page, token).subscribe({
      next: (resp) => {
        this.sentMessages = (resp?.messages ?? []) as MessageItem[];
        this.sentPage = resp?.page ?? page;
        this.updateConversationState();
      },
      error: (err) => {
        if (err?.status === 404) {
          this.sentMessages = [];
          this.sentPage = page;
          return;
        }
        this.sentMessages = [];
        this.sentError = err?.error?.message || 'No se pudieron cargar los mensajes enviados.';
      },
      complete: () => {
        this.sentLoading = false;
      },
    });
  }

  private loadChatUnviewedCount(): void {
    const token = this.userService.getToken();
    if (!token) {
      return;
    }
    this.messageService.getUnviewedMessages(token).subscribe({
      next: (resp) => {
        this.chatUnviewedCount = resp?.unviewed ?? 0;
      },
      error: () => {
        this.chatUnviewedCount = 0;
      },
    });
  }

  selectReceiver(user: User): void {
    if (!user?._id) {
      return;
    }
    this.selectedReceiverId = user._id;
    this.sendError = '';
    this.sendSuccess = '';
    this.markConversationViewed(user._id);
    this.loadReceivedMessages(1);
    this.loadSentMessages(1);
    setTimeout(() => this.messageInput?.nativeElement.focus(), 0);
    this.resetConversationState();
    this.scrollChatToBottom(true);
  }

  closeChatPanel(): void {
    this.selectedReceiverId = null;
    this.newMessagesCount = 0;
    this.isAtBottom = true;
  }

  sendMessage(): void {
    const token = this.userService.getToken();
    const receiverId = this.selectedReceiverId;
    const text = this.messageText.trim();
    if (!token) {
      this.sendError = 'Debes iniciar sesion para enviar mensajes.';
      return;
    }
    if (!receiverId) {
      this.sendError = 'Selecciona un contacto antes de enviar.';
      return;
    }
    if (!text) {
      this.sendError = 'Escribe un mensaje antes de enviar.';
      return;
    }
    this.sendLoading = true;
    this.sendError = '';
    this.sendSuccess = '';
    this.messageService.sendMessage(text, receiverId, token).subscribe({
      next: () => {
        this.sendSuccess = 'Mensaje enviado correctamente.';
        this.messageText = '';
        this.loadSentMessages(1);
        this.scrollChatToBottom(true);
      },
      error: (err) => {
        this.sendError = err?.error?.message || 'No se pudo enviar el mensaje.';
      },
      complete: () => {
        this.sendLoading = false;
      },
    });
  }

  onChatScroll(): void {
    const container = this.chatMessages?.nativeElement;
    if (!container) {
      return;
    }
    const threshold = 24;
    this.isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - threshold;
    if (this.isAtBottom && this.newMessagesCount > 0) {
      this.newMessagesCount = 0;
    }
  }

  goToLatest(): void {
    this.newMessagesCount = 0;
    this.isAtBottom = true;
    this.scrollChatToBottom(true);
  }

  onChatDragStart(event: PointerEvent): void {
    if (!this.selectedReceiverId) {
      return;
    }
    const panel = this.chatPanel?.nativeElement;
    if (!panel) {
      return;
    }
    const rect = panel.getBoundingClientRect();
    this.isDraggingChat = true;
    this.dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    this.chatPosition = {
      x: rect.left,
      y: rect.top,
    };
    event.preventDefault();
    this.dragMoveHandler = (moveEvent: PointerEvent) => this.onChatDragMove(moveEvent);
    this.dragEndHandler = () => this.onChatDragEnd();
    window.addEventListener('pointermove', this.dragMoveHandler);
    window.addEventListener('pointerup', this.dragEndHandler);
  }

  private onChatDragMove(event: PointerEvent): void {
    if (!this.isDraggingChat || !this.chatPanel?.nativeElement) {
      return;
    }
    const panel = this.chatPanel.nativeElement;
    const rect = panel.getBoundingClientRect();
    const maxX = Math.max(0, window.innerWidth - rect.width);
    const maxY = Math.max(0, window.innerHeight - rect.height);
    const nextX = Math.min(Math.max(event.clientX - this.dragOffset.x, 0), maxX);
    const nextY = Math.min(Math.max(event.clientY - this.dragOffset.y, 0), maxY);
    this.chatPosition = { x: nextX, y: nextY };
  }

  private onChatDragEnd(): void {
    this.isDraggingChat = false;
    this.removeChatDragListeners();
  }

  private removeChatDragListeners(): void {
    if (this.dragMoveHandler) {
      window.removeEventListener('pointermove', this.dragMoveHandler);
      this.dragMoveHandler = undefined;
    }
    if (this.dragEndHandler) {
      window.removeEventListener('pointerup', this.dragEndHandler);
      this.dragEndHandler = undefined;
    }
  }

  private scrollChatToBottom(force = false): void {
    setTimeout(() => {
      const container = this.chatMessages?.nativeElement;
      if (container) {
        if (force || this.isAtBottom) {
          container.scrollTop = container.scrollHeight;
        }
      }
    }, 0);
  }

  private resetConversationState(): void {
    this.newMessagesCount = 0;
    this.lastConversationTimestamp = this.getConversationLastTimestamp();
  }

  private updateConversationState(): void {
    const lastTimestamp = this.getConversationLastTimestamp();
    if (lastTimestamp > this.lastConversationTimestamp) {
      if (this.isAtBottom) {
        this.scrollChatToBottom(true);
      } else {
        this.newMessagesCount += 1;
      }
      this.lastConversationTimestamp = lastTimestamp;
    }
  }

  private getConversationLastTimestamp(): number {
    const contactId = this.selectedReceiverId;
    if (!contactId) {
      return 0;
    }
    const messages = [...this.receivedMessages, ...this.sentMessages].filter((message) => {
      const emitterId = this.getMessageUserId(message.emitter);
      const receiverId = this.getMessageUserId(message.receiver);
      return emitterId === contactId || receiverId === contactId;
    });
    if (!messages.length) {
      return 0;
    }
      return messages.reduce((max, message) => Math.max(max, this.getMessageTimestampForMessage(message)), 0);
  }

  private markConversationViewed(emitterId: string): void {
    const token = this.userService.getToken();
    if (!token) {
      return;
    }
    this.messageService.setViewedMessagesByEmitter(emitterId, token).subscribe({
      next: () => {
        this.loadChatUnviewedCount();
      },
      error: () => {},
    });
  }

  private getIdentityId(): string | null {
    const identity = this.identity;
    return identity?._id || null;
  }

  private getMessageUserId(user: MessageUser | undefined): string | null {
    if (!user) {
      return null;
    }
    if (typeof user === 'string') {
      return user;
    }
    if (user._id) {
      return user._id;
    }
    return null;
  }

  private getMessageTimestampForMessage(message: MessageItem): number {
    const raw = message?.created_at;
    if (!raw) {
      return 0;
    }
    const numeric = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isNaN(numeric) && numeric) {
      return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
    }
    const parsed = Date.parse(String(raw));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private getMessageTime(message: MessageItem): string | null {
    const raw = message?.created_at;
    if (!raw) {
      return null;
    }
    const numeric = typeof raw === 'number' ? raw : Number(raw);
    const timestampMs = Number.isNaN(numeric)
      ? Date.parse(String(raw))
      : numeric < 1_000_000_000_000
        ? numeric * 1000
        : numeric;
    if (!timestampMs || Number.isNaN(timestampMs)) {
      return null;
    }
    return new Date(timestampMs).toLocaleString();
  }

  private isMessageViewed(message: MessageItem): boolean {
    const value = message?.viewed;
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    return String(value).toLowerCase() === 'true' || String(value) === '1';
  }
}
