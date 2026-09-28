import {
  AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, Input, NgZone, OnDestroy, OnInit, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { IonIcon, IonSpinner, ModalController, ToastController } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  addOutline, alertCircleOutline, chevronBackOutline, chevronForwardOutline, closeOutline, cloudOfflineOutline,
  documentTextOutline, expandOutline, lockClosedOutline, printOutline, refreshOutline, removeOutline, timeOutline,
} from 'ionicons/icons';
import { Subscription, TimeoutError, timeout } from 'rxjs';

import type { DocumentViewerRequest } from 'src/app/core/services/document-viewer.service';
import { SigaPrint, isNativePrintAvailable } from 'src/app/core/services/native-print';
import {
  DOC_PRINT_MESSAGE, DOC_SIZE_MESSAGE, MM_TO_PX, PageSetup, buildViewerDocument, countPages, pageContentHeightPx,
  parsePageSetup, sheetWidthPx,
} from './document-page.util';

type ViewerStatus = 'loading' | 'ready' | 'error';
type ViewerError = 'offline' | 'timeout' | 'unauthorized' | 'forbidden' | 'notFound' | 'server' | 'empty';

/** Tempo máximo de espera pela geração no servidor (a ficha completa pode levar alguns segundos). */
const LOAD_TIMEOUT_MS = 90_000;
/** A partir deste tempo avisamos que o servidor está lento, sem cancelar a requisição. */
const SLOW_HINT_MS = 10_000;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.25;
/** Respiro (px) em volta da folha, igual ao padding do `.dv__canvas`. */
const CANVAS_PADDING = 16;

/**
 * Visualizador interno dos documentos de impressão do SIGA.
 *
 * O HTML gerado pelo backend é exibido num iframe `sandbox` (sem allow-same-origin: o documento
 * não enxerga token, storage nem DOM do app). O iframe tem `pointer-events: none` e é escalado
 * por fora, então rolagem, pinça e zoom são tratados pelo próprio SIGA — funciona igual no
 * WebView do Capacitor (onde o zoom nativo está desligado) e na PWA.
 */
@Component({
  selector: 'app-document-viewer-modal',
  standalone: true,
  imports: [CommonModule, IonIcon, IonSpinner, TranslatePipe],
  templateUrl: './document-viewer-modal.component.html',
  styleUrls: ['./document-viewer-modal.component.scss'],
})
export class DocumentViewerModalComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input({ required: true }) request!: DocumentViewerRequest;

  @ViewChild('canvas') canvasRef?: ElementRef<HTMLDivElement>;
  @ViewChild('frame') frameRef?: ElementRef<HTMLIFrameElement>;

  status: ViewerStatus = 'loading';
  error: ViewerError | null = null;
  errorDetail: string | null = null;
  slow = false;
  printing = false;

  zoom = 1;
  fitMode = true;
  docWidth = 0;
  docHeight = 0;
  currentPage = 1;
  totalPages = 1;

  private html = '';
  private setup: PageSetup | null = null;
  private loadSub?: Subscription;
  private slowTimer?: ReturnType<typeof setTimeout>;
  private pinch: { distance: number; zoom: number } | null = null;
  private pendingFrame: (() => void) | null = null;
  private gestureTarget: HTMLElement | null = null;
  private readonly detachers: Array<() => void> = [];
  private readonly gestureDetachers: Array<() => void> = [];

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private translate: TranslateService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({
      addOutline, alertCircleOutline, chevronBackOutline, chevronForwardOutline, closeOutline, cloudOfflineOutline,
      documentTextOutline, expandOutline, lockClosedOutline, printOutline, refreshOutline, removeOutline, timeOutline,
    });
  }

  get zoomPercent(): number {
    return Math.round(this.zoom * 100);
  }

  get errorIcon(): string {
    switch (this.error) {
      case 'offline': return 'cloud-offline-outline';
      case 'timeout': return 'time-outline';
      case 'unauthorized':
      case 'forbidden': return 'lock-closed-outline';
      default: return 'alert-circle-outline';
    }
  }

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    this.listen(window, 'message', (e: Event) => this.onFrameMessage(e as MessageEvent));
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
    clearTimeout(this.slowTimer);
    this.detachers.forEach(detach => detach());
    this.gestureDetachers.forEach(detach => detach());
  }

  close(): void {
    void this.modalController.dismiss(null, 'cancel');
  }

  load(): void {
    this.loadSub?.unsubscribe();
    clearTimeout(this.slowTimer);
    this.status = 'loading';
    this.error = null;
    this.errorDetail = null;
    this.slow = false;
    this.slowTimer = setTimeout(() => (this.slow = true), SLOW_HINT_MS);

    this.loadSub = this.request.load().pipe(timeout(LOAD_TIMEOUT_MS)).subscribe({
      next: html => this.show(html),
      error: err => this.fail(err),
    });
  }

  // ---------------------------------------------------------------------------
  // Carregamento
  // ---------------------------------------------------------------------------

  private show(html: string): void {
    clearTimeout(this.slowTimer);
    if (!html?.trim()) {
      this.setError('empty');
      return;
    }

    this.html = html;
    this.setup = parsePageSetup(html, this.request.orientation);
    this.docWidth = sheetWidthPx(this.setup);
    this.docHeight = this.setup.heightMm * MM_TO_PX;
    this.fitMode = true;
    this.status = 'ready';
    this.cdr.detectChanges();

    const canvas = this.canvasRef?.nativeElement;
    const frame = this.frameRef?.nativeElement;
    if (!canvas || !frame) return;

    this.attachGestures(canvas);
    this.applyFitZoom();
    canvas.scrollTop = 0;
    canvas.scrollLeft = 0;
    // Atribuído direto no elemento (e não via binding) para não passar pelo sanitizador do Angular,
    // que removeria os scripts dos gráficos; o isolamento fica a cargo do sandbox do iframe.
    frame.srcdoc = buildViewerDocument(html, this.setup);
  }

  private fail(err: unknown): void {
    clearTimeout(this.slowTimer);
    console.error('[DocumentViewer] Falha ao carregar documento', err);

    if (err instanceof TimeoutError) {
      this.setError('timeout');
      return;
    }

    const status = err instanceof HttpErrorResponse ? err.status : -1;
    this.errorDetail = err instanceof HttpErrorResponse ? this.extractServerMessage(err) : null;

    if (status === 0) this.setError('offline');
    else if (status === 401) this.setError('unauthorized');
    else if (status === 403) this.setError('forbidden');
    else if (status === 404) this.setError('notFound');
    else this.setError('server');
  }

  private setError(error: ViewerError): void {
    this.status = 'error';
    this.error = error;
    this.slow = false;
    this.cdr.detectChanges();
  }

  /** Mensagens de validação do backend (CommandResult.Fail) chegam como JSON dentro do corpo texto. */
  private extractServerMessage(err: HttpErrorResponse): string | null {
    if (err.status !== 400 || typeof err.error !== 'string') return null;
    try {
      const body = JSON.parse(err.error);
      return typeof body?.message === 'string' && body.message.trim() ? body.message : null;
    } catch {
      return null;
    }
  }

  private onFrameMessage(event: MessageEvent): void {
    const frame = this.frameRef?.nativeElement;
    if (!frame || event.source !== frame.contentWindow) return;
    if (event.data?.type !== DOC_SIZE_MESSAGE || !this.setup) return;

    const width = Number(event.data.width);
    const height = Number(event.data.height);
    if (!(width > 0 && height > 0)) return;

    this.zone.run(() => {
      this.docWidth = Math.max(width, sheetWidthPx(this.setup!));
      this.docHeight = height;
      this.totalPages = countPages(height, this.setup!);
      if (this.fitMode) this.applyFitZoom();
      this.updateCurrentPage();
    });
  }

  // ---------------------------------------------------------------------------
  // Zoom
  // ---------------------------------------------------------------------------

  zoomIn(): void {
    this.setZoom(this.zoom * ZOOM_STEP);
  }

  zoomOut(): void {
    this.setZoom(this.zoom / ZOOM_STEP);
  }

  fitWidth(): void {
    this.fitMode = true;
    this.applyFitZoom();
  }

  @HostListener('window:resize')
  onResize(): void {
    // Rotação do tablet: no modo "ajustar à largura" a folha acompanha a nova largura.
    if (this.status === 'ready' && this.fitMode) this.applyFitZoom();
  }

  /** Reajuste automático (medição do documento, rotação): mantém fixo o topo visível, não o centro. */
  private applyFitZoom(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.docWidth) return;
    const available = canvas.clientWidth - 2 * CANVAS_PADDING;
    this.applyZoom(this.clampZoom(available / this.docWidth), { x: 0, y: 0 });
  }

  /** Zoom pelos botões/pinça, mantendo fixo o ponto do documento sob `focus` (ou o centro da tela). */
  private setZoom(next: number, focus?: { x: number; y: number }): void {
    this.fitMode = false;
    this.applyZoom(this.clampZoom(next), focus);
  }

  private applyZoom(next: number, focus?: { x: number; y: number }): void {
    const canvas = this.canvasRef?.nativeElement;
    const previous = this.zoom;
    this.zoom = next;
    if (!canvas || next === previous) return;

    const fx = focus?.x ?? canvas.clientWidth / 2;
    const fy = focus?.y ?? canvas.clientHeight / 2;
    const docX = (canvas.scrollLeft + fx - CANVAS_PADDING) / previous;
    const docY = (canvas.scrollTop + fy - CANVAS_PADDING) / previous;

    this.cdr.detectChanges();
    canvas.scrollLeft = docX * next + CANVAS_PADDING - fx;
    canvas.scrollTop = docY * next + CANVAS_PADDING - fy;
    this.updateCurrentPage();
  }

  private clampZoom(value: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  }

  private attachGestures(canvas: HTMLElement): void {
    // Após "tentar novamente" o canvas é recriado; os ouvintes do anterior são descartados.
    if (this.gestureTarget === canvas) return;
    this.gestureDetachers.splice(0).forEach(detach => detach());
    this.gestureTarget = canvas;
    const listen = (type: string, handler: EventListener, options?: AddEventListenerOptions) =>
      this.listen(canvas, type, handler, options, this.gestureDetachers);

    this.zone.runOutsideAngular(() => {
      listen('touchstart', (e: Event) => {
        const t = (e as TouchEvent).touches;
        if (t.length === 2) this.pinch = { distance: this.touchDistance(t), zoom: this.zoom };
      });

      listen('touchmove', (e: Event) => {
        const t = (e as TouchEvent).touches;
        if (!this.pinch || t.length !== 2) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const focus = {
          x: (t[0].clientX + t[1].clientX) / 2 - rect.left,
          y: (t[0].clientY + t[1].clientY) / 2 - rect.top,
        };
        const target = this.pinch.zoom * (this.touchDistance(t) / this.pinch.distance);
        this.onNextFrame(() => this.setZoom(target, focus));
      }, { passive: false });

      const endPinch = (e: Event) => {
        if ((e as TouchEvent).touches.length < 2) this.pinch = null;
      };
      listen('touchend', endPinch);
      listen('touchcancel', endPinch);

      // PWA no computador: Ctrl + roda do mouse (ou pinça no touchpad) amplia o documento.
      listen('wheel', (e: Event) => {
        const wheel = e as WheelEvent;
        if (!wheel.ctrlKey) return;
        wheel.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const focus = { x: wheel.clientX - rect.left, y: wheel.clientY - rect.top };
        this.onNextFrame(() => this.setZoom(this.zoom * Math.exp(-wheel.deltaY / 300), focus));
      }, { passive: false });

      listen('scroll', () => this.onNextFrame(() => this.updateCurrentPage()), { passive: true });
    });
  }

  private touchDistance(t: TouchList): number {
    return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1;
  }

  // ---------------------------------------------------------------------------
  // Páginas
  // ---------------------------------------------------------------------------

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  private goToPage(page: number): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.setup) return;
    const target = Math.min(this.totalPages, Math.max(1, page));
    const top = this.setup.marginVerticalMm * MM_TO_PX + (target - 1) * pageContentHeightPx(this.setup);
    canvas.scrollTo({ top: CANVAS_PADDING + top * this.zoom - 8, behavior: 'smooth' });
    this.currentPage = target;
  }

  private updateCurrentPage(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.setup) return;
    // A página "atual" é a que ocupa o terço superior da área visível.
    const y = (canvas.scrollTop + canvas.clientHeight / 3 - CANVAS_PADDING) / this.zoom
      - this.setup.marginVerticalMm * MM_TO_PX;
    const page = Math.floor(y / pageContentHeightPx(this.setup)) + 1;
    const clamped = Math.min(this.totalPages, Math.max(1, page));
    if (clamped !== this.currentPage) {
      this.currentPage = clamped;
      this.cdr.detectChanges();
    }
  }

  // ---------------------------------------------------------------------------
  // Impressão
  // ---------------------------------------------------------------------------

  async print(): Promise<void> {
    if (this.printing || this.status !== 'ready' || !this.setup) return;
    this.printing = true;
    try {
      if (isNativePrintAvailable()) {
        // APK: o WebView não implementa window.print(); usamos o PrintManager do Android com o
        // mesmo HTML já baixado (sem nova requisição ao servidor).
        await SigaPrint.printHtml({ html: this.html, jobName: this.request.title, orientation: this.setup.orientation });
      } else {
        this.frameRef?.nativeElement.contentWindow?.postMessage({ type: DOC_PRINT_MESSAGE }, '*');
      }
    } catch (err) {
      console.error('[DocumentViewer] Falha ao imprimir', err);
      const toast = await this.toastController.create({
        message: this.translate.instant('sharedComponents.documentViewer.printError'),
        duration: 3200,
        color: 'danger',
        position: 'top',
      });
      await toast.present();
    } finally {
      this.printing = false;
    }
  }

  // ---------------------------------------------------------------------------

  /** Agrupa atualizações por quadro de animação; vale sempre a última pedida no quadro. */
  private onNextFrame(fn: () => void): void {
    const scheduled = this.pendingFrame !== null;
    this.pendingFrame = fn;
    if (scheduled) return;
    requestAnimationFrame(() => {
      const run = this.pendingFrame;
      this.pendingFrame = null;
      run?.();
    });
  }

  private listen(
    target: EventTarget, type: string, handler: EventListener, options?: AddEventListenerOptions,
    detachers: Array<() => void> = this.detachers,
  ): void {
    target.addEventListener(type, handler, options);
    detachers.push(() => target.removeEventListener(type, handler, options));
  }
}
