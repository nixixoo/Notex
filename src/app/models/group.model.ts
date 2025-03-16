export interface Group {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  isLocal?: boolean;
}

export interface CreateGroupRequest {
  name: string;
  description: string;
  userId?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
}
