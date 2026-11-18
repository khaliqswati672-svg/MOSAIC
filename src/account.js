const accountsKey = 'mosaic.accounts.v1';
const sessionKey = 'mosaic.session.v1';
const readAccounts = () => JSON.parse(localStorage.getItem(accountsKey) || '[]');

async function digest(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2', salt:new TextEncoder().encode(salt), iterations:120000, hash:'SHA-256'}, key, 256);
  return Array.from(new Uint8Array(bits)).join(',');
}

export const account = {
  current: () => readAccounts().find(user => user.id === localStorage.getItem(sessionKey)),
  async signIn(email, password, register) {
    email = email.trim().toLowerCase();
    const users = readAccounts();
    let user = users.find(item => item.email === email);
    if (register) {
      if (user) throw Error('此邮箱已有本地账号。');
      const salt = crypto.randomUUID();
      user = {id:crypto.randomUUID(), email, salt, hash:await digest(password,salt)};
      const latest = readAccounts();
      if (latest.some(item => item.email === email)) throw Error('此邮箱已有本地账号。');
      localStorage.setItem(accountsKey, JSON.stringify([...latest,user]));
    } else if (!user || user.hash !== await digest(password,user.salt)) {
      throw Error('邮箱或密码有误。');
    }
    localStorage.setItem(sessionKey,user.id);
    return user;
  },
  signOut: () => localStorage.removeItem(sessionKey)
};
