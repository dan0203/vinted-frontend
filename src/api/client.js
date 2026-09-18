import axios from 'axios';

let currentToken = null;
const listeners = new Set();

export const getToken = () => currentToken;

export const setToken = token => {
    currentToken = token;
    listeners.forEach(listener => listener(token));
};

export const subscribeToken = listener => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
});

client.interceptors.request.use(config => {
    if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`;
    }
    return config;
});

client.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        if (error.response?.status !== 401 || !originalRequest || originalRequest._retried) {
            throw error;
        }
        originalRequest._retried = true;

        try {
            const refreshResponse = await axios.post(
                `${import.meta.env.VITE_API_URL}/users/refresh`,
                {},
                { withCredentials: true },
            );
            const newToken = refreshResponse.data.accessToken;
            setToken(newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return client(originalRequest);
        } catch {
            setToken(null);
            window.location.assign('/login');
            throw error;
        }
    },
);

export default client;
