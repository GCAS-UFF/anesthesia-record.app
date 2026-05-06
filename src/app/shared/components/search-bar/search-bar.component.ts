import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss']
})
export class SearchBarComponent {
  @Input() placeholder: string = 'Buscar...';
  @Output() search = new EventEmitter<string>();

  onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.search.emit(target.value);
  }
}
