const SSO_TOKEN_KEY = '@dowardev/sso-client:token';

export async function saveToken(token: string): Promise<void> {
  localStorage.setItem(SSO_TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return localStorage.getItem(SSO_TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  localStorage.removeItem(SSO_TOKEN_KEY);
}

export async function hasToken(): Promise<boolean> {
  const token = await getToken();
  return token !== null && token !== '';
}
