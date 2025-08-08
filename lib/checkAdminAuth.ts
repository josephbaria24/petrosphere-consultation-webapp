// lib/checkAdminAuth.ts
export function checkAdminAuth() {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('admin_token')
    }
    return false
  }
  