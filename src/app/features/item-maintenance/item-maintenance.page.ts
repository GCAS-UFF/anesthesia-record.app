import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastController } from '@ionic/angular/standalone';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { layersOutline, pricetagOutline, calendarOutline, createOutline, addOutline, closeOutline, checkmarkOutline, searchOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { DrugAdminService } from 'src/app/core/services/drug-admin.service';
import { EventTypeService } from 'src/app/core/services/event-type.service';
import { DrugAdmin } from 'src/app/core/models/drug.model';
import { EventType } from 'src/app/core/models/event-type.model';
import { DrugCategoryEnum, DRUG_CATEGORY_LABELS } from 'src/app/core/models/api-enums.model';

type Tab = 'drugs' | 'events';

@Component({
  selector: 'app-item-maintenance',
  templateUrl: './item-maintenance.page.html',
  styleUrls: ['./item-maintenance.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    StatusBarComponent,
    HeaderInstitucionalComponent,
  ],
})
export class ItemMaintenancePage implements OnInit {
  activeTab: Tab = 'drugs';

  categoryOptions = Object.entries(DRUG_CATEGORY_LABELS).map(([id, label]) => ({
    id: Number(id) as DrugCategoryEnum,
    label,
  }));

  drugs: DrugAdmin[] = [];
  drugsLoading = false;
  drugsTerm = '';
  drugsCategoryFilter: DrugCategoryEnum | null = null;
  drugsPage = 1;
  drugsPageSize = 10;
  drugsTotalItems = 0;
  drugsTotalPages = 1;
  editingDrugId: number | null = null;
  editingDrugCategory: DrugCategoryEnum | null = null;
  savingDrugId: number | null = null;

  events: EventType[] = [];
  eventsLoading = false;
  eventsTerm = '';
  eventsPage = 1;
  eventsPageSize = 10;
  eventsTotalItems = 0;
  eventsTotalPages = 1;
  eventForm: { id: number | null; name: string; description: string; active: boolean } | null = null;
  savingEvent = false;

  constructor(
    private drugAdminService: DrugAdminService,
    private eventTypeService: EventTypeService,
    private toastController: ToastController
  ) {
    addIcons({ layersOutline, pricetagOutline, calendarOutline, createOutline, addOutline, closeOutline, checkmarkOutline, searchOutline, chevronBackOutline, chevronForwardOutline });
  }

  ngOnInit(): void {
    this.loadDrugs();
  }

  selectTab(tab: Tab) {
    this.activeTab = tab;
    if (tab === 'events' && this.events.length === 0) {
      this.loadEvents();
    }
  }

  categoryLabel(id: DrugCategoryEnum): string {
    return DRUG_CATEGORY_LABELS[id] ?? 'Outros';
  }

  // ---------- Drugs ----------

  async loadDrugs() {
    this.drugsLoading = true;
    try {
      const response: any = await firstValueFrom(
        this.drugAdminService.getPaged(this.drugsPage, this.drugsPageSize, this.drugsTerm || undefined, this.drugsCategoryFilter ?? undefined)
      );
      const paged = response?.data ?? { data: [], totalItems: 0 };
      this.drugs = paged.data ?? [];
      this.drugsTotalItems = paged.totalItems ?? 0;
      this.drugsTotalPages = Math.ceil(this.drugsTotalItems / this.drugsPageSize) || 1;
    } catch (error) {
      console.error('Erro ao carregar itens', error);
      await this.showToast('Não foi possível carregar os itens.', 'danger');
    } finally {
      this.drugsLoading = false;
    }
  }

  onDrugsSearchChange(term: string) {
    this.drugsTerm = term;
    if (term.length > 2 || term.length === 0) {
      this.drugsPage = 1;
      this.loadDrugs();
    }
  }

  onDrugsCategoryFilterChange() {
    this.drugsPage = 1;
    this.loadDrugs();
  }

  drugsNextPage() {
    if (this.drugsPage < this.drugsTotalPages) {
      this.drugsPage++;
      this.loadDrugs();
    }
  }

  drugsPrevPage() {
    if (this.drugsPage > 1) {
      this.drugsPage--;
      this.loadDrugs();
    }
  }

  startEditDrug(drug: DrugAdmin) {
    this.editingDrugId = drug.id;
    this.editingDrugCategory = drug.categoryId;
  }

  cancelEditDrug() {
    this.editingDrugId = null;
    this.editingDrugCategory = null;
  }

  async saveDrugCategory(drug: DrugAdmin) {
    if (this.editingDrugCategory === null) return;

    this.savingDrugId = drug.id;
    try {
      const response: any = await firstValueFrom(
        this.drugAdminService.updateCategory(drug.id, this.editingDrugCategory)
      );

      if (response?.valid === false) {
        await this.showToast(response.message || 'Não foi possível salvar a categoria.', 'danger');
        return;
      }

      drug.categoryId = this.editingDrugCategory;
      drug.categoryLabel = this.categoryLabel(this.editingDrugCategory);
      this.editingDrugId = null;
      this.editingDrugCategory = null;
      await this.showToast('Categoria atualizada com sucesso.', 'success');
    } catch (error) {
      console.error('Erro ao salvar categoria', error);
      await this.showToast('Não foi possível salvar a categoria.', 'danger');
    } finally {
      this.savingDrugId = null;
    }
  }

  // ---------- Events ----------

  async loadEvents() {
    this.eventsLoading = true;
    try {
      const response: any = await firstValueFrom(
        this.eventTypeService.getPaged(this.eventsPage, this.eventsPageSize, this.eventsTerm || undefined)
      );
      const paged = response?.data ?? { data: [], totalItems: 0 };
      this.events = paged.data ?? [];
      this.eventsTotalItems = paged.totalItems ?? 0;
      this.eventsTotalPages = Math.ceil(this.eventsTotalItems / this.eventsPageSize) || 1;
    } catch (error) {
      console.error('Erro ao carregar eventos', error);
      await this.showToast('Não foi possível carregar os eventos.', 'danger');
    } finally {
      this.eventsLoading = false;
    }
  }

  onEventsSearchChange(term: string) {
    this.eventsTerm = term;
    if (term.length > 2 || term.length === 0) {
      this.eventsPage = 1;
      this.loadEvents();
    }
  }

  eventsNextPage() {
    if (this.eventsPage < this.eventsTotalPages) {
      this.eventsPage++;
      this.loadEvents();
    }
  }

  eventsPrevPage() {
    if (this.eventsPage > 1) {
      this.eventsPage--;
      this.loadEvents();
    }
  }

  startCreateEvent() {
    this.eventForm = { id: null, name: '', description: '', active: true };
  }

  startEditEvent(event: EventType) {
    this.eventForm = { id: event.id, name: event.name, description: event.description, active: event.active };
  }

  cancelEventForm() {
    this.eventForm = null;
  }

  async saveEvent() {
    if (!this.eventForm) return;

    const { id, name, description, active } = this.eventForm;

    if (!name?.trim() || !description?.trim()) {
      await this.showToast('Preencha nome e descrição.', 'danger');
      return;
    }

    this.savingEvent = true;
    try {
      const response: any = id
        ? await firstValueFrom(this.eventTypeService.update(id, name.trim(), description.trim(), active))
        : await firstValueFrom(this.eventTypeService.create(name.trim(), description.trim()));

      if (response?.valid === false) {
        await this.showToast(response.message || 'Não foi possível salvar o evento.', 'danger');
        return;
      }

      this.eventForm = null;
      await this.loadEvents();
      await this.showToast('Evento salvo com sucesso.', 'success');
    } catch (error) {
      console.error('Erro ao salvar evento', error);
      await this.showToast('Não foi possível salvar o evento.', 'danger');
    } finally {
      this.savingEvent = false;
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'medium' = 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 2600,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
