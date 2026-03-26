import { ApiService } from "./api.service";

export abstract class BaseService<T> {

  constructor(protected api: ApiService, protected endpoint: string) {}

  getAll() {
    return this.api.get<T[]>(this.endpoint);
  }

  getById(id: number) {
    return this.api.get<T>(`${this.endpoint}/${id}`);
  }

  create(data: T) {
    return this.api.post<T>(this.endpoint, data);
  }
}