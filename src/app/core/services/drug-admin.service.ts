import { Injectable } from '@angular/core';
import { ApiService } from './base/api.service';
import { DrugAdmin } from '../models/drug.model';
import { DrugCategoryEnum } from '../models/api-enums.model';

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
export class DrugAdminService {

  constructor(private api: ApiService) { }

  getPaged(page: number, size: number, term?: string, category?: DrugCategoryEnum) {
    const params: any = { page, size };
    if (term) params.term = term;
    if (category !== undefined && category !== null) params.category = category;

    return this.api.get<{ data: PagedResult<DrugAdmin> }>('drugs/admin', params);
  }

  updateCategory(id: number, category: DrugCategoryEnum) {
    return this.api.put<{ data: DrugAdmin }>(`drugs/${id}/category`, { category });
  }
}
