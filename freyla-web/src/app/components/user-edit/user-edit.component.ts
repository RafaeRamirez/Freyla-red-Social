import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { User } from '../../models/user';
import { UploadService } from '../../services/upload.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-edit.component.html',
  styleUrls: ['./user-edit.component.css'],
})
export class UserEditComponent implements OnInit {
  public title = 'Actualizar mis datos';
  public user: User;
  public identity: User | null = null;
  public token: string | null = null;
  public url: string;
  public loading = false;
  public successMessage = '';
  public errorMessage = '';
  public currentPassword = '';
  public showCurrentPassword = false;
  public showNewPassword = false;
  public selectedImageFile: File | null = null;
  public filesToUpload: File[] = [];

  constructor(
    private userService: UserService,
    private uploadService: UploadService,
    private router: Router
  ) {
    this.user = new User('', '', '', '', '', 'ROLE_USER');
    this.url = this.uploadService.url;
  }

  ngOnInit(): void {
    this.identity = this.userService.getIdentity<User>();
    this.token = this.userService.getToken();

    if (!this.identity || !this.token) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = this.mapIdentityToUser(this.identity);
  }

  toggleCurrentPassword(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0] ?? null;
    this.selectedImageFile = file;
    this.filesToUpload = file ? [file] : [];
  }

  onSubmit(form: NgForm): void {
    if (form.invalid || this.loading) {
      return;
    }

    const identity = this.identity;
    const token = this.token;
    if (!identity || !token) {
      this.errorMessage = 'Debes iniciar sesion para actualizar tus datos.';
      return;
    }

    const userId = this.getIdentityId(identity);
    if (!userId) {
      this.errorMessage = 'No se pudo identificar el usuario.';
      return;
    }

    const payload: Partial<User> = {
      name: this.user.name,
      surname: this.user.surname,
      nick: this.user.nick,
      email: this.user.email,
    };

    const currentPassword = this.currentPassword;
    if (!currentPassword) {
      this.errorMessage = 'Debes ingresar tu contrasena actual.';
      return;
    }

    (payload as Partial<User> & { currentPassword: string }).currentPassword = currentPassword;

    if (this.user.password) {
      payload.password = this.user.password;
    }

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.userService.updateUser(userId, payload, token).subscribe({
      next: (resp) => {
        this.applyUpdatedUser(resp.user, token);

        if (!this.filesToUpload.length) {
          this.finishSuccess('Datos actualizados correctamente.');
          return;
        }

        this.uploadService
          .makeFileRequest(`${this.url}/update-image-user/${userId}`, [], this.filesToUpload, token, 'image')
          .then((result) => {
            const response = result as { user?: User };
            if (response?.user) {
              this.applyUpdatedUser(response.user, token);
            }
            this.filesToUpload = [];
            this.selectedImageFile = null;
            this.finishSuccess('Datos y avatar actualizados correctamente.');
          })
          .catch(() => {
            this.loading = false;
            this.errorMessage = 'Datos actualizados, pero no se pudo subir la imagen.';
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Tus datos se guardaron, pero la imagen no se pudo subir.',
            });
          });
      },
      error: (err) => {
        this.loading = false;
        const message = err?.error?.message || 'No se pudo actualizar la informacion.';
        this.errorMessage = message;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: message,
        });
      },
    });
  }

  private finishSuccess(message: string): void {
    this.loading = false;
    this.currentPassword = '';
    this.user.password = '';
    this.successMessage = message;
    Swal.fire({
      icon: 'success',
      title: 'Listo',
      text: message,
      timer: 1800,
      showConfirmButton: false,
    });
  }

  private applyUpdatedUser(updated: User, token: string): void {
    this.userService.setSession(token, updated);
    this.identity = updated;
    this.user = this.mapIdentityToUser(updated);
  }

  private mapIdentityToUser(identity: User): User {
    return new User(
      identity?.name ?? '',
      identity?.surname ?? '',
      identity?.nick ?? '',
      identity?.email ?? '',
      '',
      identity?.role ?? 'ROLE_USER',
      identity?.image,
      this.getIdentityId(identity) ?? undefined,
      identity?.createdAt,
      identity?.updatedAt
    );
  }

  private getIdentityId(identity: User): string | null {
    const withId = identity as User & { id?: string; sub?: string };
    return withId._id ?? withId.id ?? withId.sub ?? null;
  }
}
