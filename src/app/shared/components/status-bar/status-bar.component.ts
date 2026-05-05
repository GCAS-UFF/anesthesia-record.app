import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-bar.component.html',
  styleUrls: ['./status-bar.component.scss']
})
export class StatusBarComponent implements OnInit, OnDestroy {
  timeStr = '';
  dateStr = '';
  private timer: any;

  ngOnInit() {
    this.updateClock();
    this.timer = setInterval(() => this.updateClock(), 1000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private updateClock() {
    const now = new Date();
    this.timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    let dateStrRaw = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    this.dateStr = dateStrRaw.charAt(0).toUpperCase() + dateStrRaw.slice(1);
  }
}
