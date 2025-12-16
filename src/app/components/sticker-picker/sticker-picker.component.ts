import { Component, EventEmitter, Output, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StickerService, Sticker } from '../../services/sticker.service';

@Component({
  selector: 'app-sticker-picker',
  imports: [CommonModule],
  template: `
    <div class="sticker-picker" [class.show]="isOpen">
      <!-- Pack Tabs -->
      <div class="pack-tabs">
        @if (stickerService.recentStickers().length > 0) {
          <button 
            class="pack-tab"
            [class.active]="selectedTab === 'recent'"
            (click)="selectTab('recent')"
            title="Recent"
          >
            🕐
          </button>
        }
        @for (pack of stickerService.packs(); track pack.id) {
          <button 
            class="pack-tab"
            [class.active]="selectedTab === pack.id"
            (click)="selectTab(pack.id)"
            [title]="pack.name"
          >
            {{ pack.icon }}
          </button>
        }
      </div>

      <!-- Sticker Grid -->
      <div class="sticker-grid">
        @if (selectedTab === 'recent') {
          @for (sticker of stickerService.recentStickers(); track sticker.id) {
            <button 
              class="sticker-button"
              (click)="selectSticker(sticker)"
              [title]="sticker.alt"
            >
              <img [src]="sticker.url" [alt]="sticker.alt" />
            </button>
          }
        } @else {
          @for (sticker of getCurrentPackStickers(); track sticker.id) {
            <button 
              class="sticker-button"
              (click)="selectSticker(sticker)"
              [title]="sticker.alt"
            >
              <img [src]="sticker.url" [alt]="sticker.alt" />
            </button>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .sticker-picker {
      position: absolute;
      bottom: 100%;
      left: 0;
      width: 320px;
      max-height: 350px;
      background: #202c33;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      opacity: 0;
      visibility: hidden;
      transform: translateY(8px);
      transition: all 0.2s ease;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .sticker-picker.show {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .pack-tabs {
      display: flex;
      gap: 2px;
      padding: 8px;
      border-bottom: 1px solid #374248;
      overflow-x: auto;
      flex-shrink: 0;
    }

    .pack-tabs::-webkit-scrollbar {
      height: 4px;
    }

    .pack-tabs::-webkit-scrollbar-thumb {
      background: #374248;
      border-radius: 2px;
    }

    .pack-tab {
      background: none;
      border: none;
      font-size: 20px;
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .pack-tab:hover {
      background: rgba(134, 150, 160, 0.2);
    }

    .pack-tab.active {
      background: rgba(0, 168, 132, 0.2);
    }

    .sticker-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      padding: 12px;
      overflow-y: auto;
      flex: 1;
    }

    .sticker-grid::-webkit-scrollbar {
      width: 6px;
    }

    .sticker-grid::-webkit-scrollbar-thumb {
      background: #374248;
      border-radius: 3px;
    }

    .sticker-button {
      background: none;
      border: none;
      padding: 4px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      aspect-ratio: 1;
    }

    .sticker-button:hover {
      background: rgba(134, 150, 160, 0.2);
      transform: scale(1.1);
    }

    .sticker-button:active {
      transform: scale(0.95);
    }

    .sticker-button img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    @media (max-width: 768px) {
      .sticker-picker {
        width: 280px;
        max-height: 300px;
      }

      .sticker-grid {
        grid-template-columns: repeat(3, 1fr);
      }

      .pack-tab {
        font-size: 18px;
        padding: 4px 8px;
      }
    }
  `]
})
export class StickerPickerComponent {
  @Input() isOpen = false;
  @Output() stickerSelected = new EventEmitter<Sticker>();

  stickerService = inject(StickerService);
  selectedTab = 'emotions';

  selectTab(tabId: string): void {
    this.selectedTab = tabId;
    if (tabId !== 'recent') {
      this.stickerService.selectPack(tabId);
    }
  }

  getCurrentPackStickers(): Sticker[] {
    const pack = this.stickerService.packs().find(p => p.id === this.selectedTab);
    return pack?.stickers || [];
  }

  selectSticker(sticker: Sticker): void {
    this.stickerService.addToRecent(sticker);
    this.stickerSelected.emit(sticker);
  }
}
