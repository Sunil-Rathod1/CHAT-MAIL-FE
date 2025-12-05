import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-emoji-picker',
  imports: [CommonModule],
  template: `
    <div class="emoji-picker" [class.show]="isOpen">
      <div class="emoji-list">
        @for (emoji of emojis; track emoji) {
          <button 
            class="emoji-button" 
            (click)="selectEmoji(emoji)"
            [title]="getEmojiName(emoji)"
          >
            {{ emoji }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .emoji-picker {
      position: relative;
      background: white;
      border-radius: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      padding: 6px 8px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(4px);
      transition: all 0.15s ease;
      z-index: 1000;
    }

    .emoji-picker.show {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .emoji-list {
      display: flex;
      gap: 2px;
      align-items: center;
    }

    .emoji-button {
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 8px;
      transition: all 0.15s;
      line-height: 1;
    }

    .emoji-button:hover {
      background-color: #f0f2f5;
      transform: scale(1.15);
    }

    .emoji-button:active {
      transform: scale(1.05);
    }

    @media (max-width: 768px) {
      .emoji-picker {
        padding: 4px 6px;
      }

      .emoji-button {
        font-size: 1.1rem;
        padding: 3px 5px;
      }
    }
  `]
})
export class EmojiPickerComponent {
  @Input() isOpen = true;
  @Output() emojiSelected = new EventEmitter<string>();

  emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

  selectEmoji(emoji: string): void {
    this.emojiSelected.emit(emoji);
  }

  getEmojiName(emoji: string): string {
    const names: Record<string, string> = {
      '👍': 'Like',
      '❤️': 'Love',
      '😂': 'Laugh',
      '😮': 'Wow',
      '😢': 'Sad',
      '🙏': 'Pray',
      '🔥': 'Fire',
      '👏': 'Clap'
    };
    return names[emoji] || emoji;
  }
}
