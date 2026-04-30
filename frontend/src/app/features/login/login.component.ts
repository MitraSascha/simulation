import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(30px, -20px) scale(1.05); }
      66% { transform: translate(-20px, 15px) scale(0.95); }
    }
    @keyframes logoGlow {
      0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3), 0 0 40px rgba(99, 102, 241, 0.1); }
      50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.5), 0 0 60px rgba(168, 85, 247, 0.2); }
    }
    .login-bg {
      background: linear-gradient(135deg, #0a0a1a 0%, #0d0d2b 25%, #0a0a1a 50%, #110d24 75%, #0a0a1a 100%);
      background-size: 400% 400%;
      animation: gradientShift 15s ease infinite;
    }
    .login-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.15;
      animation: float 20s ease-in-out infinite;
    }
  `],
  template: `
    <div class="login-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <!-- Animated background orbs -->
      <div class="login-orb w-[400px] h-[400px] bg-indigo-600 top-[-100px] left-[-100px]" style="animation-delay: 0s;"></div>
      <div class="login-orb w-[300px] h-[300px] bg-purple-600 bottom-[-50px] right-[-50px]" style="animation-delay: -7s;"></div>
      <div class="login-orb w-[200px] h-[200px] bg-indigo-400 top-[40%] right-[20%]" style="animation-delay: -13s;"></div>

      <div class="w-full max-w-md relative z-10">
        <!-- Logo -->
        <div class="text-center mb-12">
          <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg"
               style="animation: logoGlow 3s ease-in-out infinite;">
            <i class="pi pi-bolt text-white text-3xl"></i>
          </div>
          <h1 class="text-4xl font-bold text-white tracking-tight">SimEngine</h1>
          <p class="text-slate-400 text-sm mt-3 tracking-wide">Soziale Simulations-Engine</p>
        </div>

        <!-- Card -->
        <div class="glass-card p-8 animate-fade-in">
          <h2 class="text-lg font-semibold text-white mb-1">Anmelden</h2>
          <p class="text-sm text-slate-500 mb-6">Gib deinen API-Key ein, um fortzufahren</p>

          <!-- Error -->
          @if (error()) {
            <div class="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2"
                 role="alert">
              <i class="pi pi-exclamation-circle text-sm"></i>
              {{ error() }}
            </div>
          }

          <!-- Input -->
          <div class="mb-6">
            <label for="api-key-input" class="block text-xs font-medium text-slate-400 mb-2">API-Key</label>
            <input id="api-key-input"
                   [type]="showKey() ? 'text' : 'password'"
                   [ngModel]="apiKey()"
                   (ngModelChange)="apiKey.set($event)"
                   (keydown.enter)="login()"
                   placeholder="sim_..."
                   aria-label="API-Key eingeben"
                   autocomplete="off"
                   class="w-full px-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all" />
            <button (click)="showKey.update(v => !v)"
                    type="button"
                    aria-label="{{ showKey() ? 'API-Key verbergen' : 'API-Key anzeigen' }}"
                    class="text-xs text-slate-500 hover:text-indigo-400 mt-2 transition-colors flex items-center gap-1.5">
              <i class="pi text-[10px]" [class.pi-eye]="!showKey()" [class.pi-eye-slash]="showKey()"></i>
              {{ showKey() ? 'Key verbergen' : 'Key anzeigen' }}
            </button>
          </div>

          <!-- Submit -->
          <button (click)="login()" [disabled]="loading() || !apiKey().trim()"
                  type="button"
                  aria-label="Mit API-Key verbinden"
                  class="w-full py-3.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-500 hover:to-purple-500 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-lg disabled:hover:shadow-indigo-500/25 disabled:active:scale-100">
            @if (loading()) {
              <i class="pi pi-spin pi-spinner mr-2"></i> Wird geprüft...
            } @else {
              <i class="pi pi-sign-in mr-2 text-xs"></i> Verbinden
            }
          </button>

          <p class="text-[11px] text-slate-600 mt-5 text-center">
            Keinen Key? Kontaktiere den Administrator.
          </p>
        </div>

        <!-- Footer -->
        <p class="text-center mt-8 text-[11px] text-slate-600 tracking-wide">
          Powered by <span class="text-slate-500">Anthropic Claude</span>
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private router = inject(Router);
  private http = inject(HttpClient);

  apiKey = signal('');
  showKey = signal(false);
  loading = signal(false);
  error = signal('');

  login() {
    const key = this.apiKey().trim();
    if (!key) return;

    this.loading.set(true);
    this.error.set('');

    // Test the key against the API
    this.http.get(`${environment.apiUrl}/simulations/`, {
      headers: { 'X-API-Key': key },
      params: { limit: '1', offset: '0' },
    }).subscribe({
      next: () => {
        localStorage.setItem('sim_api_key', key);
        this.router.navigate(['/simulations']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 401) {
          this.error.set('Ungültiger oder deaktivierter API-Key');
        } else {
          this.error.set('Verbindung zum Server fehlgeschlagen');
        }
      },
    });
  }
}
