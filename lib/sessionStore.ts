const sessions = new Map<string, any>();

export function getSession(user: string) {
  return sessions.get(user);
}

export function setSession(user: string, data: any) {
  sessions.set(user, data);
}

export function clearSession(user: string) {
  sessions.delete(user);
}