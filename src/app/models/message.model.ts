export interface Message {
  _id?: string;
  sender: any;
  receiver?: any;
  content: string;
  type: 'text' | 'image' | 'video' | 'document' | 'file' | 'voice';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number | string;
  status: 'sent' | 'delivered' | 'read';
  readAt?: Date;
  reactions?: Reaction[];
  
  // Phase 2 features
  conversationType?: 'direct' | 'group';
  groupId?: string;
  
  // Reply feature
  replyTo?: {
    messageId: string;
    content: string;
    sender: any;
  };
  
  // Edit feature
  isEdited?: boolean;
  editedAt?: Date;
  editHistory?: Array<{
    content: string;
    editedAt: Date;
  }>;
  
  // Delete feature
  isDeleted?: boolean;
  deletedBy?: string[];
  deletedForEveryone?: boolean;
  deletedAt?: Date;
  
  // Image feature
  thumbnail?: string;
  mimeType?: string;
  
  // Group read receipts
  readBy?: Array<{
    user: string;
    readAt: Date;
  }>;
  
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

export interface EditMessageData {
  messageId: string;
  content: string;
}

export interface DeleteMessageData {
  messageId: string;
  deleteType: 'me' | 'everyone';
}

export interface UploadedImage {
  url: string;
  publicId: string;
  thumbnail: string;
  thumbnailPublicId: string;
  width: number;
  height: number;
  size: number;
  format: string;
}
