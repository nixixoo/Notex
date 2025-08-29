import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CSPNonceService {
  private nonce: string;

  constructor() {
    this.nonce = this.generateNonce();
  }

  getNonce(): string {
    return this.nonce;
  }

  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  addNonceToScript(scriptContent: string): string {
    return `<script nonce="${this.nonce}">${scriptContent}</script>`;
  }

  addNonceToStyle(styleContent: string): string {
    return `<style nonce="${this.nonce}">${styleContent}</style>`;
  }
}