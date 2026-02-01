// 消息类型
export interface Message {
  id: string;
  content: string;
  imageUrl?: string;
  referenceImages?: string[];  // 支持多张参考图片
  type: 'text' | 'image' | 'loading';
  sender: 'user' | 'ai';
  senderName: string;
  senderAvatar: string;
  timestamp: Date;
  generationTime?: number;
  isPublishedToSquare?: boolean; // 是否发布到广场
}

// 用户类型
export interface User {
  id: string;
  name: string;
  avatar: string;
}

// AI 智能体配置
export interface AIAgent {
  id: string;
  name: string;
  avatar: string;
  systemPrompt: string;
}
