import { Injectable, signal } from '@angular/core';

export interface Sticker {
  id: string;
  url: string;
  alt: string;
}

export interface StickerPack {
  id: string;
  name: string;
  icon: string;
  stickers: Sticker[];
}

@Injectable({
  providedIn: 'root'
})
export class StickerService {
  // Built-in sticker packs using emoji-style characters as SVG data URLs
  private stickerPacks: StickerPack[] = [
    {
      id: 'emotions',
      name: 'Emotions',
      icon: '😊',
      stickers: [
        { id: 'happy', url: this.createStickerSvg('😊', '#FFD93D'), alt: 'Happy' },
        { id: 'love', url: this.createStickerSvg('❤️', '#FF6B6B'), alt: 'Love' },
        { id: 'sad', url: this.createStickerSvg('😢', '#74B9FF'), alt: 'Sad' },
        { id: 'angry', url: this.createStickerSvg('😠', '#FF7675'), alt: 'Angry' },
        { id: 'surprised', url: this.createStickerSvg('😮', '#FDCB6E'), alt: 'Surprised' },
        { id: 'cool', url: this.createStickerSvg('😎', '#00CEC9'), alt: 'Cool' },
        { id: 'laugh', url: this.createStickerSvg('😂', '#FFD93D'), alt: 'Laughing' },
        { id: 'wink', url: this.createStickerSvg('😉', '#FDCB6E'), alt: 'Wink' },
        { id: 'think', url: this.createStickerSvg('🤔', '#FFA502'), alt: 'Thinking' },
        { id: 'party', url: this.createStickerSvg('🥳', '#A29BFE'), alt: 'Party' },
        { id: 'fire', url: this.createStickerSvg('🔥', '#FF6348'), alt: 'Fire' },
        { id: 'sparkle', url: this.createStickerSvg('✨', '#FFD700'), alt: 'Sparkle' },
      ]
    },
    {
      id: 'gestures',
      name: 'Gestures',
      icon: '👍',
      stickers: [
        { id: 'thumbsup', url: this.createStickerSvg('👍', '#FFD93D'), alt: 'Thumbs Up' },
        { id: 'thumbsdown', url: this.createStickerSvg('👎', '#FFD93D'), alt: 'Thumbs Down' },
        { id: 'clap', url: this.createStickerSvg('👏', '#FFD93D'), alt: 'Clap' },
        { id: 'wave', url: this.createStickerSvg('👋', '#FFD93D'), alt: 'Wave' },
        { id: 'peace', url: this.createStickerSvg('✌️', '#FFD93D'), alt: 'Peace' },
        { id: 'pray', url: this.createStickerSvg('🙏', '#FFD93D'), alt: 'Pray' },
        { id: 'muscle', url: this.createStickerSvg('💪', '#FFD93D'), alt: 'Muscle' },
        { id: 'fist', url: this.createStickerSvg('✊', '#FFD93D'), alt: 'Fist' },
        { id: 'ok', url: this.createStickerSvg('👌', '#FFD93D'), alt: 'OK' },
        { id: 'point', url: this.createStickerSvg('👉', '#FFD93D'), alt: 'Point' },
        { id: 'heart-hands', url: this.createStickerSvg('🫶', '#FF6B6B'), alt: 'Heart Hands' },
        { id: 'salute', url: this.createStickerSvg('🫡', '#FFD93D'), alt: 'Salute' },
      ]
    },
    {
      id: 'animals',
      name: 'Animals',
      icon: '🐱',
      stickers: [
        { id: 'cat', url: this.createStickerSvg('🐱', '#FFA502'), alt: 'Cat' },
        { id: 'dog', url: this.createStickerSvg('🐶', '#B8860B'), alt: 'Dog' },
        { id: 'bear', url: this.createStickerSvg('🐻', '#8B4513'), alt: 'Bear' },
        { id: 'panda', url: this.createStickerSvg('🐼', '#2D3436'), alt: 'Panda' },
        { id: 'lion', url: this.createStickerSvg('🦁', '#FFA502'), alt: 'Lion' },
        { id: 'fox', url: this.createStickerSvg('🦊', '#FF6348'), alt: 'Fox' },
        { id: 'rabbit', url: this.createStickerSvg('🐰', '#FFEAA7'), alt: 'Rabbit' },
        { id: 'unicorn', url: this.createStickerSvg('🦄', '#A29BFE'), alt: 'Unicorn' },
        { id: 'butterfly', url: this.createStickerSvg('🦋', '#74B9FF'), alt: 'Butterfly' },
        { id: 'penguin', url: this.createStickerSvg('🐧', '#2D3436'), alt: 'Penguin' },
        { id: 'koala', url: this.createStickerSvg('🐨', '#636E72'), alt: 'Koala' },
        { id: 'monkey', url: this.createStickerSvg('🐵', '#B8860B'), alt: 'Monkey' },
      ]
    },
    {
      id: 'objects',
      name: 'Objects',
      icon: '🎁',
      stickers: [
        { id: 'gift', url: this.createStickerSvg('🎁', '#FF6B6B'), alt: 'Gift' },
        { id: 'balloon', url: this.createStickerSvg('🎈', '#FF6B6B'), alt: 'Balloon' },
        { id: 'cake', url: this.createStickerSvg('🎂', '#FF7675'), alt: 'Cake' },
        { id: 'trophy', url: this.createStickerSvg('🏆', '#FFD700'), alt: 'Trophy' },
        { id: 'medal', url: this.createStickerSvg('🥇', '#FFD700'), alt: 'Medal' },
        { id: 'crown', url: this.createStickerSvg('👑', '#FFD700'), alt: 'Crown' },
        { id: 'rocket', url: this.createStickerSvg('🚀', '#74B9FF'), alt: 'Rocket' },
        { id: 'star', url: this.createStickerSvg('⭐', '#FFD700'), alt: 'Star' },
        { id: 'rainbow', url: this.createStickerSvg('🌈', '#A29BFE'), alt: 'Rainbow' },
        { id: 'sun', url: this.createStickerSvg('☀️', '#FFD93D'), alt: 'Sun' },
        { id: 'moon', url: this.createStickerSvg('🌙', '#FFD700'), alt: 'Moon' },
        { id: 'coffee', url: this.createStickerSvg('☕', '#B8860B'), alt: 'Coffee' },
      ]
    },
    {
      id: 'food',
      name: 'Food',
      icon: '🍕',
      stickers: [
        { id: 'pizza', url: this.createStickerSvg('🍕', '#FFA502'), alt: 'Pizza' },
        { id: 'burger', url: this.createStickerSvg('🍔', '#B8860B'), alt: 'Burger' },
        { id: 'fries', url: this.createStickerSvg('🍟', '#FFD93D'), alt: 'Fries' },
        { id: 'icecream', url: this.createStickerSvg('🍦', '#FFEAA7'), alt: 'Ice Cream' },
        { id: 'donut', url: this.createStickerSvg('🍩', '#FF7675'), alt: 'Donut' },
        { id: 'cookie', url: this.createStickerSvg('🍪', '#B8860B'), alt: 'Cookie' },
        { id: 'apple', url: this.createStickerSvg('🍎', '#FF6B6B'), alt: 'Apple' },
        { id: 'avocado', url: this.createStickerSvg('🥑', '#00B894'), alt: 'Avocado' },
        { id: 'taco', url: this.createStickerSvg('🌮', '#FFA502'), alt: 'Taco' },
        { id: 'sushi', url: this.createStickerSvg('🍣', '#FF7675'), alt: 'Sushi' },
        { id: 'ramen', url: this.createStickerSvg('🍜', '#FFEAA7'), alt: 'Ramen' },
        { id: 'popcorn', url: this.createStickerSvg('🍿', '#FFD93D'), alt: 'Popcorn' },
      ]
    },
    {
      id: 'weather',
      name: 'Weather',
      icon: '🌤️',
      stickers: [
        { id: 'sunny', url: this.createStickerSvg('☀️', '#FFD93D'), alt: 'Sunny' },
        { id: 'cloud', url: this.createStickerSvg('☁️', '#DFE6E9'), alt: 'Cloud' },
        { id: 'rain', url: this.createStickerSvg('🌧️', '#74B9FF'), alt: 'Rain' },
        { id: 'thunder', url: this.createStickerSvg('⛈️', '#636E72'), alt: 'Thunder' },
        { id: 'snow', url: this.createStickerSvg('❄️', '#74B9FF'), alt: 'Snow' },
        { id: 'rainbow2', url: this.createStickerSvg('🌈', '#A29BFE'), alt: 'Rainbow' },
        { id: 'tornado', url: this.createStickerSvg('🌪️', '#636E72'), alt: 'Tornado' },
        { id: 'hot', url: this.createStickerSvg('🥵', '#FF6348'), alt: 'Hot' },
        { id: 'cold', url: this.createStickerSvg('🥶', '#74B9FF'), alt: 'Cold' },
        { id: 'umbrella', url: this.createStickerSvg('☔', '#74B9FF'), alt: 'Umbrella' },
        { id: 'snowman', url: this.createStickerSvg('⛄', '#DFE6E9'), alt: 'Snowman' },
        { id: 'comet', url: this.createStickerSvg('☄️', '#FF6348'), alt: 'Comet' },
      ]
    }
  ];

  // Signals
  packs = signal<StickerPack[]>(this.stickerPacks);
  selectedPackId = signal<string>('emotions');
  recentStickers = signal<Sticker[]>([]);

  constructor() {
    this.loadRecentStickers();
  }

  // Create an SVG sticker with emoji
  private createStickerSvg(emoji: string, bgColor: string): string {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
        <defs>
          <linearGradient id="bg_${emoji.charCodeAt(0)}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${bgColor};stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:${bgColor};stop-opacity:0.1" />
          </linearGradient>
        </defs>
        <circle cx="48" cy="48" r="44" fill="url(#bg_${emoji.charCodeAt(0)})" stroke="${bgColor}" stroke-width="2"/>
        <text x="48" y="58" font-size="44" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
      </svg>
    `;
    return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
  }

  // Get stickers for selected pack
  getSelectedPackStickers(): Sticker[] {
    const pack = this.stickerPacks.find(p => p.id === this.selectedPackId());
    return pack?.stickers || [];
  }

  // Select a sticker pack
  selectPack(packId: string): void {
    this.selectedPackId.set(packId);
  }

  // Add sticker to recent
  addToRecent(sticker: Sticker): void {
    const recent = this.recentStickers();
    const filtered = recent.filter(s => s.id !== sticker.id);
    const updated = [sticker, ...filtered].slice(0, 12); // Keep last 12
    this.recentStickers.set(updated);
    this.saveRecentStickers();
  }

  // Load recent stickers from localStorage
  private loadRecentStickers(): void {
    const saved = localStorage.getItem('chatmail_recent_stickers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Reconstruct sticker URLs (they're data URLs that need regeneration)
        const reconstructed = parsed.map((s: any) => {
          const pack = this.stickerPacks.find(p => p.stickers.some(st => st.id === s.id));
          const sticker = pack?.stickers.find(st => st.id === s.id);
          return sticker || null;
        }).filter(Boolean);
        this.recentStickers.set(reconstructed);
      } catch (e) {
        console.error('Failed to load recent stickers:', e);
      }
    }
  }

  // Save recent stickers to localStorage
  private saveRecentStickers(): void {
    const toSave = this.recentStickers().map(s => ({ id: s.id, alt: s.alt }));
    localStorage.setItem('chatmail_recent_stickers', JSON.stringify(toSave));
  }

  // Get sticker by ID
  getStickerById(stickerId: string): Sticker | undefined {
    for (const pack of this.stickerPacks) {
      const sticker = pack.stickers.find(s => s.id === stickerId);
      if (sticker) return sticker;
    }
    return undefined;
  }
}
