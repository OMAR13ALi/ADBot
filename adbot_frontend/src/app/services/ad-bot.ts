import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdBotService {

  private apiUrl = '/api'; // FastAPI backend URL

  constructor(private http: HttpClient) { }

  // Example: Fetch users
  getUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/list_users`);
  }

  // Example: Create user
  createUser(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/create_user`, data);
  }
}
