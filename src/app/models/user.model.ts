export interface User {
    id: string
    username: string
  }
  
  export interface AuthResponse {
    user: User
    token: string
  }
  
  export interface LoginRequest {
    username: string
    password: string
  }
  
  export interface RegisterRequest {
    username: string
    password: string
  }
  
  