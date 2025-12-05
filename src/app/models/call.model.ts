export interface CallUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Call {
  _id: string;
  caller: CallUser;
  receiver: CallUser;
  type: 'audio' | 'video';
  status: 'initiated' | 'ringing' | 'ongoing' | 'ended' | 'missed' | 'rejected' | 'busy';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  endedBy?: string;
  endReason?: 'completed' | 'missed' | 'rejected' | 'busy' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface IncomingCall {
  callId: string;
  caller: CallUser;
  callType: 'audio' | 'video';
}

export interface CallState {
  isInCall: boolean;
  callId: string | null;
  callType: 'audio' | 'video' | null;
  remoteUser: CallUser | null;
  isCaller: boolean;
  callStatus: 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended';
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  remoteAudioEnabled: boolean;
  remoteVideoEnabled: boolean;
}
