import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { User } from '../../models/user';
import { UserService } from '../../services/user.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit {
  public title: string;
  public user: User;
  public loading = false;

  constructor(private userService: UserService) {
    this.title = 'Registrate aqui';
    this.user = new User('', '', '', '', '', 'ROLE_USER', '', '', '', '');

  }

  ngOnInit() {
    console.log('Component register Cargando ');
  }

  onSubmit(form: NgForm) {
    if (form.invalid) {
      return;
    }
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
      },
      error: (err) => {
        const message = err?.error?.message || 'No se pudo completar el registro.';
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: message,
        });
      },
      complete: () => {
        this.loading = false;
      },
    });
  }


}
