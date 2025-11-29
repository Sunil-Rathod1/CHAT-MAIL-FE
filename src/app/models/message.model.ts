export interface Message {
  _id?: string;
  sender: any;
  receiver: any;
  content: string;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  status: 'sent' | 'delivered' | 'read';
  readAt?: Date;
  reactions?: Reaction[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface Reaction {
  userId: any;
  emoji: string;
  createdAt: Date;
}

export interface Conversation {
  _id: string;
  lastMessage: Message;
}

export interface ChatHistory {
  messages: Message[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}
