export interface Group {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  createdBy: any;
  members: GroupMember[];
  settings: GroupSettings;
  lastMessage?: any;
  isActive: boolean;
  memberCount?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface GroupMember {
  userId: any;
  role: 'admin' | 'member';
  joinedAt: Date;
  addedBy: any;
}

export interface GroupSettings {
  onlyAdminsCanPost: boolean;
  onlyAdminsCanAddMembers: boolean;
  onlyAdminsCanEditGroupInfo: boolean;
  maxMembers: number;
}

export interface GroupConversation {
  _id: string;
  group: Group;
  unreadCount: number;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  avatar?: string;
  memberIds: string[];
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  avatar?: string;
  settings?: Partial<GroupSettings>;
}
