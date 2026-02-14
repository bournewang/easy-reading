import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    username: string;
    name?: string | null;
  }

  interface Session {
    user: User & {
      id: string;
      username: string;
    };
  }
} 