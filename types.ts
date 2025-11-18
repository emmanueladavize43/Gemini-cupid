
export interface Lifestyle {
  smoking?: string;
  drinking?: string;
  exercise?: string;
}

export type RelationshipGoal = string;

export interface User {
  id: number;
  name: string;
  age: number;
  bio: string;
  imageUrl: string;
  interests: string[];
  viewCount?: number;
  location: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  distance?: number;
  profileVisibility: 'public' | 'private';
  relationshipGoal?: RelationshipGoal;
  lifestyle?: Lifestyle;
}

export interface Match {
  id: string;
  users: [User, User];
  timestamp: Date;
  isSuperLike?: boolean;
}

export interface Message {
  id:string;
  senderId: number;
  timestamp: Date;
  type: 'text' | 'sticker' | 'voice';
  content: string; // For voice, this will be base64 audio data URL
  read?: boolean;
}
