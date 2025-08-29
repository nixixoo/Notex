export interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  language: 'en' | 'es';
  notifications: {
    enabled: boolean;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    duration: number;
  };
  layout: {
    view: 'grid' | 'list';
    showPreview: boolean;
    compactMode: boolean;
  };
  isLoading: boolean;
  error: string | null;
}

export const initialUIState: UIState = {
  sidebarOpen: true,
  theme: 'light',
  language: 'en',
  notifications: {
    enabled: true,
    position: 'top-right',
    duration: 5000,
  },
  layout: {
    view: 'grid',
    showPreview: true,
    compactMode: false,
  },
  isLoading: false,
  error: null,
};