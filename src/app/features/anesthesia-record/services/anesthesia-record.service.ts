import { Injectable } from "@angular/core";
import { ApiService } from "src/app/core/services/base/api.service";
import { BaseService } from "src/app/core/services/base/base.service";
import { AnesthesiaRecordModel } from "../models/anesthesia-record.model";

@Injectable({
  providedIn: 'root'
})
export class AnesthesiaRecordService extends BaseService<AnesthesiaRecordModel> {

  constructor(api: ApiService) {
    super(api, 'anesthesia-record');
  }
}