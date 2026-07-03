import { Injectable, signal } from '@angular/core';
import { supabase } from './supabase.client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  authenticated = signal(false);
  checkingSession = signal(true);
  userEmail = signal<string | null>(null);

  constructor() {
    supabase.auth.getSession().then(({ data }) => {
      this.applySession(data.session);
      this.checkingSession.set(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      this.applySession(session);
    });
  }

  private applySession(session: { user?: { email?: string | null } } | null): void {
    this.authenticated.set(!!session);
    this.userEmail.set(session?.user?.email ?? null);
  }

  async login(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? this.translateError(error.message) : null;
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  private translateError(message: string): string {
    if (message.includes('Invalid login credentials')) return 'Email ou password incorretos.';
    if (message.includes('Email not confirmed')) return 'Conta ainda não confirmada. Verifique o email.';
    return 'Não foi possível iniciar sessão. Tente novamente.';
  }
}
