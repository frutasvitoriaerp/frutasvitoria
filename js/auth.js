import { supabase } from './supabase-client.js';

const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const signupLink = document.getElementById('signupLink');

let isSignUpMode = false;

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    loginError.classList.add('hidden');
    loginError.textContent = '';
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = isSignUpMode ? 'Cadastrando...' : 'Entrando...';
    
    try {
        if (isSignUpMode) {
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;
            
            if (data.user && !data.session) {
                showToast('Cadastro realizado! Verifique seu email para confirmar.', 'success');
                toggleAuthMode(false);
                return;
            }
        }
        
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
    
    if (signUp) {
        title.textContent = '📊 Criar Conta';
        subtitle.textContent = 'Preencha os dados para se cadastrar';
        submitBtn.textContent = 'Cadastrar';
        signupLink.textContent = 'Já tem conta? Entrar';
        signupLink.parentElement.innerHTML = 'Já tem conta? <a href="#" id="signupLink">Entrar</a>';
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
        document.getElementById('signupLink').addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthMode(true);
        });
    }
}

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