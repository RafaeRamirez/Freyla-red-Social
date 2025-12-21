import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { User } from '../../models/user';
import { UserService } from '../../services/user.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit {
  public title: string;
  public user: User;
  public loading = false;
  public nickTaken = false;
  public emailTaken = false;

  constructor(private userService: UserService) {
    this.title = 'Registrate aqui';
    this.user = new User('', '', '', '', '', 'ROLE_USER', '', '', '', '');

  }

  ngOnInit() {
    console.log('Component register Cargando ');
  }

  onSubmit(form: NgForm) {
    if (form.invalid || this.loading) {
      return;
    }
    this.nickTaken = false;
    this.emailTaken = false;
    this.loading = true;
    this.userService.register(this.user).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Registro exitoso',
          text: 'Tu cuenta se ha creado correctamente.',
        });
        form.resetForm();
        this.user = new User('', '', '', '', '', 'ROLE_USER', '', '', '', '');
        this.nickTaken = false;
        this.emailTaken = false;
      },
      error: (err) => {
        const isConflict = err?.status === 409;
        const emailTaken = !!err?.error?.emailTaken;
        const nickTaken = !!err?.error?.nickTaken;
        const message =
          err?.error?.message ||
          (isConflict
            ? 'El email o nick ya esta en uso. Intenta con otro.'
            : 'No se pudo completar el registro.');
        this.nickTaken = nickTaken;
        this.emailTaken = emailTaken;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: message,
        });
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }


}
