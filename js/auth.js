import { supabase, showToast } from './supabase-client.js';

const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const signupLink = document.getElementById('signupLink');

let isSignUpMode = false;

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    
    loginError.classList.add('hidden');
    loginError.textContent = '';
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = isSignUpMode ? 'Cadastrando...' : 'Entrando...';
    
    try {
        if (isSignUpMode) {
            // Cadastro: precisa de email também
            const email = document.getElementById('email').value.trim().toLowerCase();
            if (!email) {
                throw new Error('Email é obrigatório para cadastro');
            }
            
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;
            
            if (data.user) {
                // Criar profile com username
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({ id: data.user.id, username, email });
                if (profileError) {
                    // Se falhar, tentar deletar o usuário criado (cleanup)
                    console.warn('Profile creation failed:', profileError);
                }
            }
            
            if (data.user && !data.session) {
                showToast('Cadastro realizado! Verifique seu email para confirmar.', 'success');
                toggleAuthMode(false);
                return;
            }
        }
        
        // Login: buscar email pelo username
        const { data: emailData, error: lookupError } = await supabase
            .rpc('get_email_by_username', { uname: username });
        
        if (lookupError || !emailData) {
            throw new Error('Usuário não encontrado');
        }
        
        const email = emailData;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        window.location.href = 'dashboard.html';
    } catch (error) {
        loginError.textContent = error.message;
        loginError.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isSignUpMode ? 'Cadastrar' : 'Entrar';
    }
});

signupLink.addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthMode(!isSignUpMode);
});

function toggleAuthMode(signUp) {
    isSignUpMode = signUp;
    const title = document.querySelector('.login-header h1');
    const subtitle = document.querySelector('.login-header p');
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const usernameGroup = document.getElementById('username').parentElement;
    const emailGroup = document.getElementById('email')?.parentElement;
    
    if (signUp) {
        title.textContent = '📊 Criar Conta';
        subtitle.textContent = 'Preencha os dados para se cadastrar';
        submitBtn.textContent = 'Cadastrar';
        signupLink.textContent = 'Já tem conta? Entrar';
        signupLink.parentElement.innerHTML = 'Já tem conta? <a href="#" id="signupLink">Entrar</a>';
        
        // Mostrar campo de email no cadastro
        if (emailGroup) emailGroup.style.display = 'block';
        
        document.getElementById('signupLink').addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthMode(false);
        });
    } else {
        title.textContent = '📊 Sistema de Vendas';
        subtitle.textContent = 'Faça login para acessar';
        submitBtn.textContent = 'Entrar';
        signupLink.textContent = 'Não tem conta? Cadastrar';
        signupLink.parentElement.innerHTML = 'Não tem conta? <a href="#" id="signupLink">Cadastrar</a>';
        
        // Esconder campo de email no login
        if (emailGroup) emailGroup.style.display = 'none';
        
        document.getElementById('signupLink').addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthMode(true);
        });
    }
}

// Inicializar: esconder email no login
document.addEventListener('DOMContentLoaded', () => {
    const emailGroup = document.getElementById('email')?.parentElement;
    if (emailGroup) emailGroup.style.display = 'none';
});

// Verificar se já está logado
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        window.location.href = 'dashboard.html';
    }
});

// Escutar mudanças de auth
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        window.location.href = 'dashboard.html';
    }
});