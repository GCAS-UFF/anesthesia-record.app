import { Injectable } from '@angular/core';
import { ApiService } from './base/api.service';
import { EventType } from '../models/event-type.model';

interface PagedResult<T> {
  data: T[];
  totalItems: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EventTypeService {

  constructor(private api: ApiService) { }

  getActive() {
    return this.api.get<{ data: EventType[] }>('event-types');
  }

  getPaged(page: number, size: number, term?: string) {
    const params: any = { page, size };
    if (term) params.term = term;

    return this.api.get<{ data: PagedResult<EventType> }>('event-types/admin', params);
  }

  create(name: string, description: string) {
    return this.api.post<{ data: EventType }>('event-types', { name, description });
  }

  update(id: number, name: string, description: string, active: boolean) {
    return this.api.put<{ data: EventType }>(`event-types/${id}`, { name, description, active });
  }
}
