import { DrugCategoryEnum } from './api-enums.model';

export interface DrugAdmin {
  id: number;
  description: string;
  defaultUnit: string;
  active: boolean;
  categoryId: DrugCategoryEnum;
  categoryLabel: string;
}
