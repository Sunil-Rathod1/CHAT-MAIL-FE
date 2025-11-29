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
      position: absolute;
      bottom: 100%;
      left: 0;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 0.5rem;
      opacity: 0;
      visibility: hidden;
      transform: translateY(10px);
      transition: all 0.2s ease;
      z-index: 1000;
    }

    .emoji-picker.show {
      opacity: 1;
      visibility: visible;
      transform: translateY(-5px);
    }

    .emoji-list {
      display: flex;
      gap: 0.25rem;
      align-items: center;
    }

    .emoji-button {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 8px;
      transition: all 0.2s;
      line-height: 1;
    }

    .emoji-button:hover {
      background-color: #f0f0f0;
      transform: scale(1.2);
    }

    .emoji-button:active {
      transform: scale(1.1);
    }

    @media (max-width: 768px) {
      .emoji-picker {
        left: 50%;
        transform: translateX(-50%) translateY(10px);
      }

      .emoji-picker.show {
        transform: translateX(-50%) translateY(-5px);
      }

      .emoji-button {
        font-size: 1.75rem;
        padding: 0.5rem 0.75rem;
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
