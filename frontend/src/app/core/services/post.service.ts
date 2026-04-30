import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Post, Comment, Reaction } from '../models/content.model';
import { PaginatedResponse } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class PostService {
  private api = inject(ApiService);

  list(simulationId: string, params?: { limit?: number; offset?: number; platform?: string; ingame_day?: number }): Observable<PaginatedResponse<Post>> {
    return this.api.get('/posts/', { simulation_id: simulationId, ...params } as Record<string, string | number>);
  }

  getComments(postId: string): Observable<Comment[]> {
    return this.api.get(`/posts/${postId}/comments`);
  }

  getReactions(postId: string): Observable<Reaction[]> {
    return this.api.get(`/posts/${postId}/reactions`);
  }
}
