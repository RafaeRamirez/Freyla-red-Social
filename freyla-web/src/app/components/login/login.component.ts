import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  public title = 'Inicia sesion aqui';
  public email = '';
  public password = '';
  public showPassword = false;
  public loading = false;
  public errorMessage = '';
  public successMessage = '';
  public identity: unknown = null;

  constructor(private userService: UserService, private router: Router) {}

  ngOnInit(): void {
    this.identity = this.userService.getIdentity();
    if (this.identity) {
      this.successMessage = 'Sesion activa cargada.';
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(form: NgForm): void {
    if (form.invalid || this.loading) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.loading = true;

    this.userService.login(this.email, this.password, true).subscribe({
      next: (resp) => {
        const token = resp?.token;
        const identity = resp?.user || resp?.identity;
        this.userService.setSession(token, identity);
        this.identity = identity ?? null;
        this.successMessage = 'Inicio de sesion exitoso.';
        Swal.fire({
          icon: 'success',
          title: 'Bienvenido',
          text: 'Inicio de sesion exitoso.',
          timer: 1800,
          showConfirmButton: false,
        });
        this.loading = false;
        this.router.navigate(['/home']);
      },
      error: (err) => {
        const message =
          err?.error?.message ||
          (err?.status === 401
            ? 'Credenciales invalidas, verifica tu correo y contrasena.'
            : 'No se pudo iniciar sesion.');
        this.errorMessage = message;
        Swal.fire({
          icon: 'error',
          title: 'Error al iniciar sesion',
          text: message,
        });
        this.loading = false;
      },
    });
  }
}
