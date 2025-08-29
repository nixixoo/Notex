import type { ApplicationConfig } from "@angular/core"
import { provideRouter, withViewTransitions, withHashLocation } from "@angular/router"
import { routes } from "./app.routes"
import { provideAnimations } from "@angular/platform-browser/animations"
import { provideHttpClient, withInterceptors } from "@angular/common/http"
import { authInterceptor } from "./interceptors/auth.interceptor"
import { errorInterceptor } from "./interceptors/error.interceptor"
import { environment } from "../environments/environment"
import { provideStore } from '@ngrx/store'
import { provideEffects } from '@ngrx/effects'
import { authReducer } from './store/auth/auth.reducer'
import { AuthEffects } from './store/auth/auth.effects'

// Make environment available globally for services
export { environment }

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions(), withHashLocation()),
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideStore({
      auth: authReducer
    }),
    provideEffects([AuthEffects]),
    { provide: 'API_URL', useValue: environment.apiUrl }
  ],
}
