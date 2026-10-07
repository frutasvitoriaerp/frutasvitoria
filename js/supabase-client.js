import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const SUPABASE_URL = 'https://aztlhxbndqzmowjyvaql.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6dGxoeGJuZHF6bW93anl2YXFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMzg3MjIsImV4cCI6MjEwNjkxNDcyMn0.VxTWGwH4jVkdsLfvvUB92K5m8wpK1dj0BL2hpM-zx30';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper para formatar moeda
export function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
}

// Helper para formatar data
export function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// Helper para formatar data e hora
export function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
}

// ===== PERMISSION HELPERS =====

// Verificar se usuário tem permissão (chama função SQL)
export async function hasPermission(permissionName) {
    const { data, error } = await supabase.rpc('user_has_permission', {
        user_uuid: (await supabase.auth.getUser()).data.user?.id,
        perm_name: permissionName
    });
    if (error) {
        console.error('Permission check error:', error);
        return false;
    }
    return data === true;
}

// Verificar múltiplas permissões (precisa de todas)
export async function hasAllPermissions(...permissions) {
    const results = await Promise.all(permissions.map(p => hasPermission(p)));
    return results.every(r => r);
}

// Verificar se tem pelo menos uma das permissões
export async function hasAnyPermission(...permissions) {
    const results = await Promise.all(permissions.map(p => hasPermission(p)));
    return results.some(r => r);
}

// Obter roles do usuário
export async function getUserRoles() {
    const { data, error } = await supabase.rpc('get_user_roles', {
        user_uuid: (await supabase.auth.getUser()).data.user?.id
    });
    if (error) return [];
    return data || [];
}

// Obter permissões do usuário
export async function getUserPermissions() {
    const { data, error } = await supabase.rpc('get_user_permissions', {
        user_uuid: (await supabase.auth.getUser()).data.user?.id
    });
    if (error) return [];
    return data || [];
}

// Helper para mostrar toast/notificação
export function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#2563eb'};
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Adicionar estilos de toast se não existirem
if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
    `;
    document.head.appendChild(style);
}