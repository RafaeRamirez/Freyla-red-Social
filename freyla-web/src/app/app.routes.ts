import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { TimelineComponent } from './components/timeline/timeline.component';
import { ProfileComponent } from './components/profile/profile.component';
import { UserEditComponent } from './components/user-edit/user-edit.component';
import { UsersComponent } from './components/users/users.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegisterComponent },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'timeline', component: TimelineComponent, canActivate: [authGuard] },
  { path: 'perfil', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'perfil/:id', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'mis-datos', component: UserEditComponent, canActivate: [authGuard] },
  { path: 'gente', component: UsersComponent, canActivate: [authGuard] },
  { path: 'gente/:page', component: UsersComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
