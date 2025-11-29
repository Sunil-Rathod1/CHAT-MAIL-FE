import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Group, CreateGroupRequest, UpdateGroupRequest } from '../models/group.model';
import { Message } from '../models/message.model';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/group`;

  createGroup(data: CreateGroupRequest): Observable<ApiResponse<Group>> {
    return this.http.post<ApiResponse<Group>>(`${this.apiUrl}/create`, data);
  }

  getUserGroups(): Observable<ApiResponse<Group[]>> {
    return this.http.get<ApiResponse<Group[]>>(`${this.apiUrl}/my-groups`);
  }

  getGroupById(groupId: string): Observable<ApiResponse<Group>> {
    return this.http.get<ApiResponse<Group>>(`${this.apiUrl}/${groupId}`);
  }

  addMembers(groupId: string, memberIds: string[]): Observable<ApiResponse<Group>> {
    return this.http.post<ApiResponse<Group>>(`${this.apiUrl}/${groupId}/members/add`, { memberIds });
  }

  removeMember(groupId: string, memberId: string): Observable<ApiResponse<Group>> {
    return this.http.delete<ApiResponse<Group>>(`${this.apiUrl}/${groupId}/members/${memberId}`);
  }

  updateGroup(groupId: string, updates: UpdateGroupRequest): Observable<ApiResponse<Group>> {
    return this.http.put<ApiResponse<Group>>(`${this.apiUrl}/${groupId}`, updates);
  }

  getGroupMessages(groupId: string, page: number = 1, limit: number = 50): Observable<ApiResponse<{
    messages: Message[];
    pagination: { total: number; page: number; pages: number };
  }>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${groupId}/messages`, {
      params: { page: page.toString(), limit: limit.toString() }
    });
  }
}
