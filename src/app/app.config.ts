import type { ApplicationConfig } from "@angular/core"
import { provideRouter, withViewTransitions } from "@angular/router"
import { routes } from "./app.routes"
import { provideAnimations } from "@angular/platform-browser/animations"
import { provideHttpClient, withInterceptors } from "@angular/common/http"
import { authInterceptor } from "./interceptors/auth.interceptor"
import { environment } from "../environments/environment"

// Make environment available globally for services
export { environment }

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions()),
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: 'API_URL', useValue: environment.apiUrl }
  ],
}
