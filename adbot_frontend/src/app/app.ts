import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { User, UsersResponse } from './models/user.model';
import { OrganizationalUnit, OUsResponse } from './models/ou.model';

@Component({
  selector: 'app-root',
  imports: [CommonModule, HttpClientModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  users: any[] = [];
  ous: OrganizationalUnit[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<UsersResponse>('/api/users').subscribe({
      next: (data) => {
        this.users = data.users;
      },
      error: (error) => {
        console.error('Error fetching users:', error);
      }
    });

    this.http.get<OUsResponse>('/api/organizational-units').subscribe({
      next: (data) => {
        this.ous = data.organizational_units;
      },
      error: (error) => {
        console.error('Error fetching OUs:', error);
      }
    });
  }
}